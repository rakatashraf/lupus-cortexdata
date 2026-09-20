import argparse,hashlib,json,os,shutil,sys,time
from pathlib import Path
from dataclasses import replace
import earthaccess
from earthaccess.results import DataGranule
import pipeline
from catalog import search,session
from store import Store,normalize

class AuthenticationError(RuntimeError):pass

def atomic_json(path,obj):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True);tmp=path.with_suffix('.tmp')
    tmp.write_text(json.dumps(obj,indent=2,default=str),encoding='utf-8');tmp.replace(path)

def redacted(e):
    msg=str(e)
    for key in ['EARTHDATA_TOKEN','EARTHDATA_PASSWORD']:
        val=os.getenv(key,'')
        if val:msg=msg.replace(val,'[REDACTED]')
    return msg[:1500]

def authenticate():
    if not (os.getenv('EARTHDATA_TOKEN','').strip() or (os.getenv('EARTHDATA_USERNAME') and os.getenv('EARTHDATA_PASSWORD'))):
        raise AuthenticationError('Configure a valid EARTHDATA_TOKEN in .env, or Earthdata username/password. Public catalog access does not authorize data downloads.')
    try:
        auth=earthaccess.login(strategy='environment')
        if not auth.authenticated:raise AuthenticationError('Earthdata login was rejected')
    except Exception as e:
        raise AuthenticationError('Earthdata authentication failed. Replace an expired/revoked token in .env, then recreate the worker. '+redacted(e)) from e


def selected_granule(g,p):
    # Download only science assets used by the adapter, keeping all required HLS bands together.
    import copy,re
    g=copy.deepcopy(g)
    urls=g['umm'].get('RelatedUrls',[])
    if p.adapter=='hls_landcover':
        bands=['B04','B05','B06','Fmask'] if p.short_name=='HLSL30' else ['B04','B8A','B11','Fmask']
        urls=[u for u in urls if any(u.get('URL','').split('?')[0].endswith('.'+b+'.tif') for b in bands)]
    elif p.adapter=='opera_dswx':
        urls=[u for u in urls if '_B01_WTR.tif' in u.get('URL','')]
    elif p.adapter=='sedac_population':
        urls=[u for u in urls if '2020' in u.get('URL','') and '30_sec' in u.get('URL','')]
    g['umm']['RelatedUrls']=urls
    return DataGranule(g)

def download(g,p,root):
    root.mkdir(parents=True,exist_ok=True)
    obj=selected_granule(g,p)
    if not obj.data_links():raise RuntimeError('No supported downloadable science assets for this granule')
    for attempt in range(3):
        try:
            files=[Path(f) for f in earthaccess.download([obj],local_path=str(root),threads=1)]
            if not files or any(not f.is_file() or f.stat().st_size==0 for f in files):raise RuntimeError('Incomplete download')
            for f in files:
                with f.open('rb') as stream:head=stream.read(100).lstrip().lower()
                if head.startswith(b'<html') or head.startswith(b'<!doctype html'):raise AuthenticationError('Earthdata returned a login page instead of science data')
            return files
        except Exception as e:
            msg=redacted(e)
            if any(t in msg.lower() for t in ['401','403','unauthor','token does not exist','login page']):
                raise AuthenticationError('Data access rejected. Check token validity and required Earthdata application authorizations. '+msg) from e
            if attempt==2:raise
            # Never treat an interrupted partial file as a valid cache hit.
            shutil.rmtree(root,ignore_errors=True);root.mkdir(parents=True)
            time.sleep(2**attempt)

def collect(outdir,limit=None,inventory_only=False):
    cfg=pipeline.CONFIG;outdir=Path(outdir);outdir.mkdir(parents=True,exist_ok=True)
    progress=outdir/'progress.json';db=Store(outdir,cfg)
    final=Path(os.getenv('OUTPUT_FILE',str(outdir.parent/cfg['outputs']['final'])))
    issues=[];count=0;groups={};catalogs={}
    for p in pipeline.products():
        if p.short_name:groups.setdefault((p.short_name,p.version),[]).append(p)
    def report(stage,status='running',**kwargs):
        atomic_json(progress,dict(status=status,stage=stage,granules_committed=count,issues=issues,
            coverage=db.coverage(),output_file=str(final),updated_at_utc=pipeline.utc_now(),**kwargs))
    try:
        report('catalog')
        for key,group in groups.items():
            p=group[0]
            if all(str(x.component_id) in cfg.get('blocked_components',{}) for x in group):continue
            try:
                gs=search(p,cfg,outdir/'catalog',limit=limit);catalogs[key]=gs
                print(f'[CMR] {p.short_name} {p.version}: {len(gs)} granules',flush=True)
                if not gs:issues.append({'product':p.short_name,'error':'No matching granules; component remains missing'})
            except Exception as e:issues.append({'product':p.short_name,'error':redacted(e)})
            report('catalog',product=p.short_name)
        if inventory_only:
            report('inventory finished','inventory_completed');return
        authenticate()
        for key,gs in catalogs.items():
            group=groups[key];p0=group[0]
            for g in gs:
                gid=g['meta']['concept-id']+'@'+str(g['meta'].get('revision-id',''))
                jobs=[(p,f'{p.short_name}/{p.version}/{gid}/{p.component_id}') for p in group
                    if str(p.component_id) not in cfg.get('blocked_components',{})]
                jobs=[(p,k) for p,k in jobs if not db.done(k)]
                if not jobs:continue
                raw=outdir/'raw'/hashlib.sha256((str(key)+gid).encode()).hexdigest()[:24]
                try:
                    report('download',product=p0.short_name,granule=gid)
                    files=download(g,p0,raw)
                    for p,k in jobs:
                        try:
                            if p.adapter=='hls_landcover':rows=pipeline.process_hls_files(files,p)
                            else:
                                fn=pipeline.PROCESSORS.get(p.adapter)
                                if fn is None:raise RuntimeError('No verified adapter for '+p.adapter)
                                rows=[]
                                for f in files:rows.extend(fn(f,p))
                            clean=[]
                            for r in rows:
                                row=normalize(r,g,cfg)
                                if row:clean.append(row)
                            db.save(k,clean)
                        except Exception as e:
                            db.failed(k,redacted(e));issues.append({'product':p.short_name,'component':p.component_id,'granule':gid,'error':redacted(e)})
                    count+=1
                    if count%int(cfg.get('checkpoint_every_granules',50))==0:
                        db.export(final);report('collecting',product=p0.short_name)
                except AuthenticationError:
                    raise
                except Exception as e:
                    for p,k in jobs:db.failed(k,redacted(e))
                    issues.append({'product':p0.short_name,'granule':gid,'error':redacted(e)})
                finally:
                    # Rows commit before raw data is removed; failed tasks download again on resume.
                    if cfg.get('delete_raw_after_processing',True):shutil.rmtree(raw,ignore_errors=True)
            db.export(final)
        if not limit:
            report('historical OSM')
            from non_nasa import collect_all_osm
            key='OSM/2025-01-01/v2'
            if not db.done(key):
                try:
                    rows=[normalize(r,{},cfg) for r in collect_all_osm()];db.save(key,[r for r in rows if r])
                except Exception as e:db.failed(key,redacted(e));issues.append({'product':'OSM','error':redacted(e)})
        report('deriving')
        from derived_safe import derive_all
        derive_all(db)
        rows=db.export(final)
        coverage=db.coverage()
        missing=[x['component_id'] for x in coverage if not x['rows']]
        # Even with all component IDs present, archive and scientific completeness need explicit review.
        report('finished','partial',rows_exported=rows,missing_components=missing,
            training_ready=False,reason='Review coverage, source gaps, QA and proxy policy before training. ID presence is not year-long completeness.',smoke_test=bool(limit))
    except Exception as e:
        try:db.export(final)
        except Exception:pass
        report('stopped','failed',error=redacted(e),training_ready=False)
        raise
    finally:db.db.close()

def main():
    p=argparse.ArgumentParser();p.add_argument('--out',default=os.getenv('WORK_DIR','/data/work'))
    p.add_argument('--max-granules',type=int);p.add_argument('--inventory-only',action='store_true')
    args=p.parse_args()
    if args.max_granules is not None and args.max_granules<1:p.error('--max-granules must be positive')
    collect(Path(args.out),args.max_granules,args.inventory_only)
if __name__=='__main__':main()
