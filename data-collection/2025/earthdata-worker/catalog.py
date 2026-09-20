"""Public metadata discovery never sends an Earthdata credential to CMR."""
import json
from pathlib import Path
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

BASE = 'https://cmr.earthdata.nasa.gov/search/'

def session():
    s = requests.Session()
    s.headers.update({'User-Agent': 'Lupus-Cortex-2025/2.0'})
    s.mount('https://', HTTPAdapter(max_retries=Retry(total=4, backoff_factor=1,
        status_forcelist=[429,500,502,503,504], allowed_methods=['GET'])))
    return s

def resolve_collection(p, client=None):
    s=client or session()
    r=s.get(BASE+'collections.json',params={'short_name':p.short_name,'version':p.version,'page_size':100},timeout=(15,90))
    r.raise_for_status()
    candidates=r.json()['feed']['entry']
    # Never silently mix versions or use near-real-time collections.
    candidates=[c for c in candidates if c['version_id']==p.version and 'OMINRT' not in c['id']]
    if len(candidates)!=1:
        raise RuntimeError(f'{p.short_name} {p.version}: expected one collection, found {len(candidates)}; inspect catalog and set a supported version')
    return candidates[0]

def search(p, config, cache_dir, limit=None):
    s=session(); col=resolve_collection(p,s)
    b=config['bbox'];params={'collection_concept_id':col['id'],'page_size':2000,
        'bounding_box':','.join(str(b[k]) for k in ['west','south','east','north']),
        'sort_key[]':['start_date','producer_granule_id']}
    if 'static' not in p.cadence:
        params['temporal']=config['temporal']['start']+','+config['temporal']['end']
    items=[]; cursor=None; seen_cursors=set()
    while True:
        headers={'CMR-Search-After':cursor} if cursor else {}
        r=s.get(BASE+'granules.umm_json',params=params,headers=headers,timeout=(15,120));r.raise_for_status()
        page=r.json().get('items',[])
        if not page:break
        for item in page:
            item['_collection_version']=col['version_id'];item['_collection_id']=col['id']
        items.extend(page)
        if limit and len(items)>=limit:items=items[:limit];break
        if len(items)>=r.json().get('hits',len(items)):break
        cursor=r.headers.get('CMR-Search-After')
        if not cursor or cursor in seen_cursors:raise RuntimeError('CMR pagination stopped before all hits were received')
        seen_cursors.add(cursor)
    Path(cache_dir).mkdir(parents=True,exist_ok=True)
    dest=Path(cache_dir)/(p.short_name+'_'+p.version+'.json')
    tmp=dest.with_suffix('.tmp');tmp.write_text(json.dumps({'collection':col,'items':items}));tmp.replace(dest)
    return items

def time_extent(g):
    t=g.get('umm',{}).get('TemporalExtent',{})
    if 'RangeDateTime' in t:
        t=t['RangeDateTime'];return t.get('BeginningDateTime',''),t.get('EndingDateTime','')
    x=t.get('SingleDateTime','');return x,x
