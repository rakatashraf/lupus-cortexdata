"""Transactional checkpoints and one replace-in-place observation CSV."""
import csv,hashlib,json,math,os,sqlite3
from datetime import datetime,timedelta,timezone
from pathlib import Path
from catalog import time_extent

COLUMNS=['date','timestamp_start_utc','timestamp_end_utc','source_timestamp_utc','time_basis',
 'lat','lon','grid_cell_id','component_id','component','subvariable','value','unit',
 'native_temporal_resolution','temporal_type','cadence_seconds','source_product','source_version',
 'source_granule','native_spatial_resolution','reference_year','data_kind','quality_flag',
 'processing_level','provenance_note','retrieved_at_utc','feature_id','bbox_id']

def iso(t):return t.astimezone(timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z')
def parse(s):
    t=datetime.fromisoformat(str(s).replace('Z','+00:00'))
    if t.tzinfo is None:raise ValueError('Timestamp has no UTC offset')
    return t.astimezone(timezone.utc)

def normalize(r,granule,config):
    r=dict(r);cid=int(r['component_id']);v=float(r['value']);lat=float(r['lat']);lon=float(r['lon'])
    if not all(map(math.isfinite,[v,lat,lon])):raise ValueError('Non-finite observation')
    b=config['bbox']
    if not (b['south']<=lat<b['north'] and b['west']<=lon<b['east']):return None
    native=str(r.get('native_temporal_resolution',''))
    start,end=time_extent(granule)
    ts=r.get('timestamp_start_utc') or start
    if not ts:raise ValueError('No source timestamp; refusing invented observation date')
    source_ts=ts; basis='source_time_coordinate_or_filename'
    if not r.get('timestamp_start_utc'):basis='CMR_granule_temporal_extent'
    # Older layers retain their actual source epoch, never a 2025 acquisition label.
    if cid==21:
        ts='2020-01-01T00:00:00Z';basis='documented_2020_population_reference_epoch';native='static-reference'
    elif cid==29:
        ts=start or '2000-02-11T00:00:00Z';basis='SRTM_acquisition_epoch';native='static-reference'
    t=parse(ts);source_ts=iso(t)
    temporal_type='irregular';seconds='';tend=t
    if 'static' in native or 'reference' in native:
        temporal_type='static_reference'
    elif 'monthly' in native:
        temporal_type='monthly'
        # Retain actual source timestamp; calendar window explicitly identified.
        t=t.replace(day=1,hour=0,minute=0,second=0,microsecond=0)
        tend=(t.replace(year=t.year+1,month=1) if t.month==12 else t.replace(month=t.month+1))
        basis+=';calendar_month_window'
    elif 'annual' in native or 'yearly' in native:
        temporal_type='yearly';t=t.replace(month=1,day=1,hour=0,minute=0,second=0,microsecond=0);tend=t.replace(year=t.year+1)
        basis+=';calendar_year_window'
    elif '16-day' in native:
        temporal_type='composite';seconds=16*86400;tend=min(t+timedelta(seconds=seconds),datetime(t.year+1,1,1,tzinfo=timezone.utc))
        basis+=';nominal_composite_window'
    elif '30' in native and ('min' in native):
        temporal_type='time_cycle';seconds=1800;tend=t+timedelta(seconds=seconds)
    elif 'hour' in native:
        temporal_type='time_cycle';seconds=3600
        # MERRA-2 hourly means are centered on xx:30.
        if str(r.get('source_product','')).startswith('M2'):
            t-=timedelta(minutes=30);basis+=';hourly_mean_center_to_bounds'
        tend=t+timedelta(seconds=seconds)
    elif 'daily' in native:
        temporal_type='daily';seconds=86400;t=t.replace(hour=0,minute=0,second=0,microsecond=0);tend=t+timedelta(days=1)
        basis+=';calendar_day_window'
    elif 'scene' in native or 'event' in native:
        temporal_type='scene'
        if end:
            try:tend=max(t,parse(end))
            except ValueError:pass
    if temporal_type!='static_reference' and not (parse(config['temporal']['start'])<=t<=parse(config['temporal']['end'])):return None
    note=str(r.get('provenance_note',''));level=str(r.get('processing_level',''))
    kind='derived' if 'derived' in level.lower() else 'source_observation'
    if 'proxy' in (note+' '+str(r.get('subvariable',''))).lower() or cid in [12,13,14,26]:kind='proxy'
    if 'input' in str(r.get('subvariable','')).lower():kind='derivation_input'
    if temporal_type=='static_reference':kind='reference' if kind!='proxy' else 'reference_proxy'
    r.update(date=t.date().isoformat(),timestamp_start_utc=iso(t),timestamp_end_utc=iso(tend),
        source_timestamp_utc=source_ts,time_basis=basis,lat=lat,lon=lon,value=v,component_id=cid,
        temporal_type=temporal_type,cadence_seconds=seconds,data_kind=kind,
        native_temporal_resolution=native,retrieved_at_utc=iso(datetime.now(timezone.utc)))
    if granule.get('_collection_version'):r['source_version']=granule['_collection_version']
    r['feature_id']='|'.join(str(r.get(k,'')) for k in ['component_id','source_product','source_version','subvariable','unit'])
    r['bbox_id']=json.dumps(b,sort_keys=True,separators=(',',':'))
    return {k:r.get(k,'') for k in COLUMNS}

class Store:
    def __init__(self,root,config):
        self.root=Path(root);self.root.mkdir(parents=True,exist_ok=True);self.config=config
        self.db=sqlite3.connect(self.root/'observations.sqlite',timeout=60)
        self.db.execute('PRAGMA journal_mode=WAL')
        self.db.execute('PRAGMA temp_store=FILE')
        self.db.execute('PRAGMA cache_size=-64000')
        fields=','.join('"'+c+'" '+('REAL' if c in ['value','lat','lon'] else 'INTEGER' if c=='component_id' else 'TEXT') for c in COLUMNS)
        self.db.execute('CREATE TABLE IF NOT EXISTS observations (row_key TEXT PRIMARY KEY, job_key TEXT,'+fields+')')
        self.db.execute('CREATE TABLE IF NOT EXISTS jobs (job_key TEXT PRIMARY KEY, status TEXT, row_count INTEGER,error TEXT)')
        self.db.execute('CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY,value TEXT)')
        fingerprint=hashlib.sha256(json.dumps(config,sort_keys=True).encode()).hexdigest()
        old=self.db.execute("SELECT value FROM metadata WHERE key='config'").fetchone()
        if old and old[0]!=fingerprint:raise RuntimeError('Configuration changed. Use a new WORK_DIR to avoid mixing study areas or processing definitions.')
        self.db.execute("INSERT OR IGNORE INTO metadata VALUES ('config',?)",(fingerprint,))
        self.db.execute('CREATE INDEX IF NOT EXISTS obs_component ON observations(component_id,grid_cell_id,timestamp_start_utc)')
        self.db.commit()
    def done(self,key):
        r=self.db.execute('SELECT status FROM jobs WHERE job_key=?',(key,)).fetchone()
        return bool(r and r[0] in ['done','no_valid_pixels'])
    def save(self,key,rows):
        rows=list(rows)
        with self.db:
            parts=key.split('/')
            if len(parts)==4 and '@' in parts[2]:
                # New granule revisions replace the previous footprint atomically,
                # including pixels withdrawn in the new revision.
                pattern='/'.join([parts[0],parts[1],parts[2].split('@')[0]+'@*',parts[3]])
                self.db.execute('DELETE FROM observations WHERE job_key IN (SELECT job_key FROM jobs WHERE job_key GLOB ?)',(pattern,))
                self.db.execute('DELETE FROM jobs WHERE job_key GLOB ?',(pattern,))
            self.db.execute('DELETE FROM observations WHERE job_key=?',(key,))
            for r in rows:
                identity=[r[k] for k in ['feature_id','source_granule','timestamp_start_utc','lat','lon']]
                h=hashlib.sha256(json.dumps(identity).encode()).hexdigest()
                values=[r.get(k,'') for k in COLUMNS]
                self.db.execute('INSERT OR REPLACE INTO observations VALUES ('+','.join('?' for _ in range(2+len(COLUMNS)))+')',[h,key]+values)
            self.db.execute('INSERT OR REPLACE INTO jobs VALUES (?,?,?,?)',(key,'done' if rows else 'no_valid_pixels',len(rows),''))
    def failed(self,key,error):
        with self.db:self.db.execute('INSERT OR REPLACE INTO jobs VALUES (?,?,?,?)',(key,'failed',0,str(error)))
    def export(self,path):
        path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
        if not self.db.execute('SELECT 1 FROM observations LIMIT 1').fetchone():return 0
        tmp=path.with_suffix('.csv.partial');n=0
        try:
            with tmp.open('w',newline='',encoding='utf-8') as f:
                writer=csv.writer(f);writer.writerow(COLUMNS)
                cur=self.db.execute('SELECT '+','.join('"'+c+'"' for c in COLUMNS)+' FROM observations ORDER BY timestamp_start_utc,grid_cell_id,component_id,feature_id,lat,lon')
                while True:
                    batch=cur.fetchmany(10000)
                    if not batch:break
                    writer.writerows(batch);n+=len(batch)
                f.flush();os.fsync(f.fileno())
            tmp.replace(path)
        except PermissionError:
            raise RuntimeError('Close the output CSV in Excel so its checkpoint can be replaced; collected data remains in the database')
        return n
    def coverage(self):
        result=[]
        names={p['component_id']:p['component'] for p in self.config['products']}
        for cid,name in sorted(names.items()):
            row=self.db.execute('SELECT COUNT(*),MIN(timestamp_start_utc),MAX(timestamp_start_utc),COUNT(DISTINCT substr(timestamp_start_utc,1,10)) FROM observations WHERE component_id=?',(cid,)).fetchone()
            result.append({'component_id':cid,'component':name,'rows':row[0],'first_timestamp':row[1],'last_timestamp':row[2],'observed_dates':row[3],
                'blocker':self.config.get('blocked_components',{}).get(str(cid),'')})
        return result
