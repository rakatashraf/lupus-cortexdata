import json,sys
from pathlib import Path
from unittest.mock import Mock
import numpy as np
import pandas as pd
import pytest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'earthdata-worker'))
import pipeline
from store import Store,normalize,parse
from derived_safe import rainfall
from catalog import resolve_collection,search

@pytest.fixture
def config():return json.loads(json.dumps(pipeline.CONFIG))

def observation(**kw):
    r=dict(timestamp_start_utc='2025-01-01T00:30:00Z',lat=23.5,lon=90.,grid_cell_id='g0070_0076',component_id=9,component='Air Temperature',
        subvariable='T2M',value=25,unit='C',native_temporal_resolution='hourly',source_product='M2T1NXSLV',source_version='5.12.4',source_granule='sample.nc')
    r.update(kw);return r

def test_merra_center_timestamp(config):
    r=normalize(observation(),{},config)
    assert r['timestamp_start_utc']=='2025-01-01T00:00:00Z'
    assert r['timestamp_end_utc']=='2025-01-01T01:00:00Z'
    assert r['source_timestamp_utc']=='2025-01-01T00:30:00Z'
    assert r['cadence_seconds']==3600

def test_missing_timestamp_requires_source(config):
    with pytest.raises(ValueError):normalize(observation(timestamp_start_utc=''),{},config)
    g={'umm':{'TemporalExtent':{'RangeDateTime':{'BeginningDateTime':'2025-02-01T00:00:00Z','EndingDateTime':'2025-02-01T23:59:59Z'}}}}
    r=normalize(observation(timestamp_start_utc='',native_temporal_resolution='daily',source_product='OMNO2d'),g,config)
    assert r['date']=='2025-02-01'

def test_monthly_preserves_original_timestamp(config):
    r=normalize(observation(timestamp_start_utc='2025-02-16T00:00:00Z',native_temporal_resolution='monthly',source_product='GRACE'),{},config)
    assert r['source_timestamp_utc']=='2025-02-16T00:00:00Z'
    assert r['timestamp_end_utc']=='2025-03-01T00:00:00Z'
    assert r['temporal_type']=='monthly'

def test_reference_is_not_2025(config):
    r=normalize(observation(component_id=21,native_temporal_resolution='static-reference'),{},config)
    assert r['timestamp_start_utc'].startswith('2020-')
    assert r['data_kind']=='reference'

def test_nonfinite_rejected(config):
    with pytest.raises(ValueError):normalize(observation(value=np.nan),{},config)

def test_transaction_replay_no_duplicates(tmp_path,config):
    db=Store(tmp_path,config);r=normalize(observation(),{},config)
    db.save('g1',[r]);db.save('g1',[r]);assert db.done('g1')
    assert db.db.execute('SELECT COUNT(*) FROM observations').fetchone()[0]==1
    # Crash during transaction rolls back previous committed observations.
    bad=dict(r);del bad['feature_id']
    with pytest.raises(KeyError):db.save('g1',[bad])
    assert db.db.execute('SELECT COUNT(*) FROM observations').fetchone()[0]==1
    assert db.export(tmp_path/'data.csv')==1
    db.db.close()
    db=Store(tmp_path,config);assert db.done('g1');db.db.close()

def test_changed_config_rejected(tmp_path,config):
    db=Store(tmp_path,config);db.db.close();config['bbox']['west']=88
    with pytest.raises(RuntimeError):Store(tmp_path,config)

def rain_frame(n=48):
    return pd.DataFrame({'timestamp_start_utc':pd.date_range('2025-01-01',periods=n,freq='30min',tz='UTC').astype(str),'value':2.})

def test_rain_requires_48_distinct_slots():
    assert rainfall(rain_frame(47)).empty
    full=rainfall(rain_frame());assert full.iloc[0]['value']==48
    # A duplicate cannot substitute for a missing slot.
    x=rain_frame(47);x=pd.concat([x,x.iloc[[0]]]);assert rainfall(x).empty

def test_rain_percentile_uses_past_only():
    x=rain_frame(48*32);a=rainfall(x)
    x.loc[x.index>=48*31,'value']=10000
    b=rainfall(x)
    assert a.iloc[31]['q95_past']==b.iloc[31]['q95_past']

def test_exact_collection_version_no_fallback():
    p=pipeline.products()[0];client=Mock();response=client.get.return_value
    response.json.return_value={'feed':{'entry':[]}}
    with pytest.raises(RuntimeError):resolve_collection(p,client)
    assert 'Authorization' not in client.get.call_args.kwargs.get('headers',{})

def test_cmr_pagination_no_token(monkeypatch,tmp_path,config):
    import catalog
    client=Mock()
    collection=Mock();collection.json.return_value={'feed':{'entry':[{'id':'C1-TEST','version_id':'5.12.4'}]}}
    page1=Mock();page1.json.return_value={'hits':2,'items':[{'meta':{'concept-id':'G1'},'umm':{}}]};page1.headers={'CMR-Search-After':'abc'}
    page2=Mock();page2.json.return_value={'hits':2,'items':[{'meta':{'concept-id':'G2'},'umm':{}}]};page2.headers={}
    client.get.side_effect=[collection,page1,page2];monkeypatch.setattr(catalog,'session',lambda:client)
    monkeypatch.setenv('EARTHDATA_TOKEN','invalid-test-token')
    rows=search(pipeline.products()[0],config,tmp_path)
    assert len(rows)==2
    assert client.get.call_args_list[2].kwargs['headers']=={'CMR-Search-After':'abc'}
    assert all('invalid-test-token' not in str(c) for c in client.get.call_args_list)

def test_static_search_omits_2025(monkeypatch,tmp_path,config):
    import catalog
    p=next(p for p in pipeline.products() if p.component_id==29);client=Mock()
    col=Mock();col.json.return_value={'feed':{'entry':[{'id':'C1-TEST','version_id':p.version}]}}
    page=Mock();page.json.return_value={'hits':0,'items':[]};page.headers={}
    client.get.side_effect=[col,page];monkeypatch.setattr(catalog,'session',lambda:client)
    search(p,config,tmp_path)
    assert 'temporal' not in client.get.call_args.kwargs['params']

def test_imerg_cf_units(tmp_path):
    import h5py
    p=next(p for p in pipeline.products() if p.component_id==15)
    f=tmp_path/'sample.HDF5'
    with h5py.File(f,'w') as h:
        g=h.create_group('Grid');g.create_dataset('lat',data=[23.5,24]);g.create_dataset('lon',data=[90.,90.5])
        g.create_dataset('precipitation',data=np.ones((1,2,2))*2)
        t=g.create_dataset('time',data=[0.]);t.attrs['units']='seconds since 2025-01-01 00:00:00'
    rows=pipeline.process_imerg(f,p)
    assert len(rows)==4 and rows[0]['timestamp_start_utc']=='2025-01-01T00:00:00Z'

def test_workflow_terminal_routing():
    w=json.loads((Path(__file__).resolve().parents[1]/'n8n'/'workflow.json').read_text())
    names={n['name'] for n in w['nodes']}
    for src,v in w['connections'].items():
        assert src in names
        for branch in v['main']:
            for target in branch:assert target['node'] in names
    finish=next(n for n in w['nodes'] if n['name']=='Review coverage and remaining gaps')
    assert finish['type']=='n8n-nodes-base.noOp'

def test_source_qa_and_clipped_geolocation(tmp_path,monkeypatch):
    import rasterio
    from rasterio.transform import from_origin
    import adapters_extra
    science=tmp_path/'science.tif';qa=tmp_path/'qa.tif'
    profile=dict(driver='GTiff',height=2,width=2,count=1,dtype='uint16',crs='EPSG:4326',transform=from_origin(90.,24.5,.25,.25))
    with rasterio.open(science,'w',**profile) as f:f.write(np.full((2,2),15000,dtype='uint16'),1)
    with rasterio.open(qa,'w',**profile) as f:f.write(np.array([[0,1],[0,0]],dtype='uint16'),1)
    monkeypatch.setattr(adapters_extra,'_find_raster_subdataset',lambda p,k:str(qa if k=='QC_Day' else science))
    p=next(p for p in pipeline.products() if p.component_id==8)
    rows=adapters_extra.raster_subdataset_rows(science,p,keyword='LST_Day_1km',subvariable='LST',unit='C',scale=.02,offset=-273.15,
        qa_keyword='QC_Day',qa_kind='lst',time_value='2025-01-01T00:00:00Z')
    assert len(rows)==3
    assert rows[0]['lat']==24.375 and rows[0]['lon']==90.125
    assert rows[0]['value']==pytest.approx(26.85)

def test_collector_resume_and_partial_status(tmp_path,monkeypatch):
    import collector,derived_safe
    p=next(p for p in pipeline.products() if p.component_id==9)
    g={'meta':{'concept-id':'G1-TEST','revision-id':1},'umm':{}}
    monkeypatch.setattr(pipeline,'products',lambda:[p])
    monkeypatch.setattr(collector,'search',lambda *a,**k:[g])
    monkeypatch.setattr(collector,'authenticate',lambda:None)
    calls=[]
    def download(*args):calls.append(1);return [tmp_path/'fixture.nc']
    monkeypatch.setattr(collector,'download',download)
    monkeypatch.setitem(pipeline.PROCESSORS,'merra2_surface',lambda *a:[observation()])
    monkeypatch.setattr(derived_safe,'derive_all',lambda db:None)
    monkeypatch.setenv('OUTPUT_FILE',str(tmp_path/'actual.csv'))
    collector.collect(tmp_path/'work',limit=1)
    collector.collect(tmp_path/'work',limit=1)
    assert len(calls)==1
    assert len(pd.read_csv(tmp_path/'actual.csv'))==1
    report=json.loads((tmp_path/'work'/'progress.json').read_text())
    assert report['status']=='partial' and report['training_ready'] is False
    assert 2 in report['missing_components']

def test_worker_credentials_gate(tmp_path,monkeypatch):
    import api
    from fastapi.testclient import TestClient
    monkeypatch.setattr(api,'WORK',tmp_path/'work');monkeypatch.setattr(api,'FINAL',tmp_path/'actual.csv')
    for k in ['EARTHDATA_TOKEN','EARTHDATA_USERNAME','EARTHDATA_PASSWORD']:monkeypatch.delenv(k,raising=False)
    with TestClient(api.app) as client:
        assert client.get('/health').status_code==200
        assert not client.get('/health').json()['credentials_configured']
        assert client.post('/run').status_code==400
        assert client.get('/result').status_code==409

def test_api_restart_marks_interrupted(tmp_path,monkeypatch):
    import api
    from fastapi.testclient import TestClient
    monkeypatch.setattr(api,'WORK',tmp_path);(tmp_path/'progress.json').write_text('{"status":"running"}')
    with TestClient(api.app) as client:
        assert client.get('/status').json()['status']=='interrupted'

def test_dem_aggregates_native_pixels(tmp_path):
    import rasterio
    from rasterio.transform import from_origin
    import adapters_extra
    path=tmp_path/'dem.tif'
    with rasterio.open(path,'w',driver='GTiff',height=40,width=40,count=1,dtype='float32',crs='EPSG:4326',transform=from_origin(90.,24.,.0005,.0005)) as f:
        f.write(np.full((40,40),20.,dtype='float32'),1)
    p=next(p for p in pipeline.products() if p.component_id==29)
    rows=adapters_extra.process_nasadem(path,p)
    assert len(rows)<100 # not 3,200 native elevation+slope records
    assert all(r['value']==pytest.approx(20 if r['subvariable']=='ELEVATION' else 0) for r in rows)

def test_granule_revision_removes_withdrawn_pixels(tmp_path,config):
    db=Store(tmp_path,config)
    a=normalize(observation(),{},config);b=normalize(observation(lat=23.6),{},config)
    db.save('M2T1NXSLV/5.12.4/G1-TEST@1/9',[a,b])
    db.save('M2T1NXSLV/5.12.4/G1-TEST@2/9',[a])
    assert db.db.execute('SELECT COUNT(*) FROM observations').fetchone()[0]==1
    assert not db.done('M2T1NXSLV/5.12.4/G1-TEST@1/9')
    db.db.close()
