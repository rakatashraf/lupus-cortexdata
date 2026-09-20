"""Derived outputs have explicit methods, complete accumulation windows and past-only baselines."""
import json
import numpy as np
import pandas as pd
from store import normalize

def rainfall(frame):
    x=frame.copy();x['time']=pd.to_datetime(x.timestamp_start_utc,utc=True)
    x=x.sort_values('time').drop_duplicates('time')
    x['date']=x.time.dt.floor('D')
    out=x.groupby('date').agg(slots=('value','count'),value=('value',lambda s:s.sum()*.5))
    # Duplicate observations, irregular times, and missing slots cannot make a full day.
    good=x.groupby('date')['time'].apply(lambda s: len(s)==48 and (s.dt.minute.isin([0,30])).all() and (s.dt.second==0).all())
    out=out[(out.slots==48)&good]
    out['q95_past']=out.value.shift(1).rolling(90,min_periods=30).quantile(.95)
    return out

def derive_all(store):
    conn=store.db
    # Clear only replaceable derived records, then rebuild deterministically from committed source rows.
    with conn:
        conn.execute("DELETE FROM observations WHERE job_key LIKE 'DERIVED/%'")
        conn.execute("DELETE FROM jobs WHERE job_key LIKE 'DERIVED/%'")
    for cid in [15,18]:
        cells=[r[0] for r in conn.execute('SELECT DISTINCT grid_cell_id FROM observations WHERE component_id=?',(cid,))]
        for gid in cells:
            frame=pd.read_sql_query('SELECT * FROM observations WHERE component_id=? AND grid_cell_id=? ORDER BY timestamp_start_utc',conn,params=(cid,gid))
            if frame.empty:continue
            template=frame.iloc[0].to_dict();rows=[]
            if cid==15:
                out=rainfall(frame)
                for t,r in out.iterrows():
                    specs=[('DAILY_RAIN_MM',float(r.value),'mm/day','48 distinct half-hour rates integrated over a complete UTC day')]
                    if np.isfinite(r.q95_past):specs.append(('EXTREME95_PAST90D_FLAG',float(r.value>r.q95_past),'0/1','Above 95th percentile of up to 90 earlier complete days; minimum 30 earlier days; not a climate normal'))
                    for sv,val,unit,note in specs:
                        row=dict(template,component_id=16,component='Extreme rainfall',subvariable=sv,value=val,unit=unit,
                            timestamp_start_utc=t.isoformat(),native_temporal_resolution='daily-derived',source_granule='derived:'+t.date().isoformat(),
                            processing_level='derived',quality_flag='48/48 half-hour slots',provenance_note=note)
                        rows.append(normalize(row,{},store.config))
            else:
                # Only open-water fraction is used; changes are a proxy, not validated flood labels.
                x=frame[frame.subvariable.eq('WATER_PERCENT')].copy()
                x=x.groupby('timestamp_start_utc',as_index=False).agg(value=('value','mean'))
                x['baseline']=x.value.shift(1).rolling(30,min_periods=3).quantile(.2)
                for _,r in x.dropna(subset=['baseline']).iterrows():
                    row=dict(template,component_id=19,component='Flood extent',subvariable='EXCESS_OPEN_WATER_PERCENT_PROXY',
                        timestamp_start_utc=r.timestamp_start_utc,value=max(0,float(r.value-r.baseline)),unit='%',
                        native_temporal_resolution='scene-derived',source_granule='derived:'+r.timestamp_start_utc,
                        processing_level='derived',quality_flag='proxy',provenance_note='Open-water change above prior 30-scene 20th percentile, minimum 3 prior scenes. Seasonal water change is not necessarily flooding.')
                    rows.append(normalize(row,{},store.config))
            store.save(f'DERIVED/{cid}/{gid}',[r for r in rows if r])
    # Green proximity per observed scene date. No annual median leaks December into January.
    from scipy.spatial import cKDTree
    dates=[r[0] for r in conn.execute('SELECT DISTINCT date FROM observations WHERE component_id=12')]
    for day in dates:
        x=pd.read_sql_query('SELECT grid_cell_id,AVG(lat) lat,AVG(lon) lon,AVG(value) value FROM observations WHERE component_id=12 AND date=? GROUP BY grid_cell_id',conn,params=(day,))
        anchors=x[x.value>=30]
        if anchors.empty:continue
        scale=np.cos(np.radians(x.lat.mean()))
        tree=cKDTree(np.c_[anchors.lon*111.32*scale,anchors.lat*111.32])
        distances=tree.query(np.c_[x.lon*111.32*scale,x.lat*111.32])[0];rows=[]
        for (_,r),d in zip(x.iterrows(),distances):
            row=dict(component_id=26,component='Green-space accessibility',subvariable='GREEN_DISTANCE_KM_PROXY',
                timestamp_start_utc=day+'T00:00:00Z',lat=r.lat,lon=r.lon,grid_cell_id=r.grid_cell_id,value=float(d),unit='km',
                native_temporal_resolution='daily-derived',source_product='HLS',source_version='2.0',source_granule='derived:'+day,
                native_spatial_resolution='0.01 degree cell centers',processing_level='derived',quality_flag='proxy',
                provenance_note='Distance to same-day observed cells with >=30% green spectral proxy. No routing, population weighting or public-access guarantee.')
            rows.append(normalize(row,{},store.config))
        store.save('DERIVED/26/'+day,[r for r in rows if r])
