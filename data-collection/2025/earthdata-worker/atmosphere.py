"""Explicit OMI HDF-EOS5 grids and AIRS HDF4 fields, without fuzzy variable selection."""
import re
from pathlib import Path
import numpy as np


def _scaled(dataset):
    a=np.asarray(dataset[:],dtype=float);attrs=dataset.attrs
    for key in ['_FillValue','MissingValue','missing_value']:
        if key in attrs:
            for v in np.atleast_1d(attrs[key]):a[a==v]=np.nan
    if 'valid_range' in attrs:
        lo,hi=np.asarray(attrs['valid_range']).ravel()[:2];a[(a<lo)|(a>hi)]=np.nan
    scale=float(np.asarray(attrs.get('ScaleFactor',attrs.get('scale_factor',1))).ravel()[0])
    offset=float(np.asarray(attrs.get('Offset',attrs.get('add_offset',0))).ravel()[0])
    return a*scale+offset


def process_omi(path,p):
    import h5py
    from pipeline import WEST,SOUTH,EAST,NORTH,grid_id
    rows=[]
    with h5py.File(path,'r') as f:
        found={}
        f.visititems(lambda name,obj:found.update({name:obj}) if isinstance(obj,h5py.Dataset) else None)
        names=p.subvariables
        matches=[(name,ds) for name,ds in found.items() if name.rsplit('/',1)[-1] in names]
        if not matches:raise ValueError('No configured OMI science field. Available fields: '+','.join(n.rsplit('/',1)[-1] for n in found)[:800])
        for name,ds in matches:
            a=np.squeeze(_scaled(ds))
            if a.ndim!=2:raise ValueError('OMI science field is not a 2-D global grid')
            ny,nx=a.shape
            if (ny,nx) not in [(720,1440),(180,360)]:raise ValueError(f'Unsupported OMI grid {a.shape}; no guessed coordinates')
            # These standard OMI L3 global geographic grids use cell centers.
            lats=np.linspace(-90+90/ny,90-90/ny,ny);lons=np.linspace(-180+180/nx,180-180/nx,nx)
            unit=ds.attrs.get('Units',ds.attrs.get('units',''))
            if isinstance(unit,bytes):unit=unit.decode()
            if not str(unit):raise ValueError('OMI source units absent')
            for iy in np.where((lats>=SOUTH)&(lats<NORTH))[0]:
                for ix in np.where((lons>=WEST)&(lons<EAST))[0]:
                    value=float(a[iy,ix])
                    if not np.isfinite(value):continue
                    rows.append(dict(timestamp_start_utc='',timestamp_end_utc='',lat=float(lats[iy]),lon=float(lons[ix]),
                        grid_cell_id=grid_id(float(lats[iy]),float(lons[ix])),component_id=p.component_id,component=p.component,
                        subvariable=name.rsplit('/',1)[-1],value=value,unit=str(unit),source_product=p.short_name,source_version=p.version,
                        source_granule=Path(path).name,native_temporal_resolution='daily',native_spatial_resolution=f'{180/ny} x {360/nx} degrees',
                        processing_level='satellite-column',quality_flag='product fill/range; source L3 screening',
                        provenance_note='OMI atmospheric column, not ground-level concentration; standard global L3 cell centers.'))
    return rows


def process_airs(path,p):
    # AIRS L3 HDF4 cannot be reliably opened as root-level xarray netCDF.
    from pyhdf.SD import SD,SDC
    from pipeline import WEST,SOUTH,EAST,NORTH,grid_id
    f=SD(str(path),SDC.READ);rows=[]
    try:
        names=list(f.datasets())
        # AIRS V7 CO total column keeps ascending/descending passes separate.
        selected=[n for n in names if re.fullmatch(r'CO_total_column_[AD]',n)]
        if not selected:raise ValueError('AIRS CO total column fields missing; refusing substring-based guesses')
        for name in selected:
            d=f.select(name);attrs=d.attributes();a=np.asarray(d[:],dtype=float)
            if a.shape!=(180,360):raise ValueError('Unsupported AIRS 1-degree grid shape')
            for k in ['_FillValue','missing_value']:
                if k in attrs:a[a==attrs[k]]=np.nan
            a=a*float(attrs.get('scale_factor',1))+float(attrs.get('add_offset',0))
            unit=attrs.get('units',attrs.get('Units',''))
            if not unit:raise ValueError('AIRS CO unit metadata missing')
            # AIRS standard L3 latitude order is north to south.
            lats=89.5-np.arange(180);lons=-179.5+np.arange(360)
            for iy in np.where((lats>=SOUTH)&(lats<NORTH))[0]:
                for ix in np.where((lons>=WEST)&(lons<EAST))[0]:
                    v=float(a[iy,ix])
                    if not np.isfinite(v) or v<0:continue
                    rows.append(dict(timestamp_start_utc='',timestamp_end_utc='',lat=float(lats[iy]),lon=float(lons[ix]),
                        grid_cell_id=grid_id(float(lats[iy]),float(lons[ix])),component_id=6,component='CO',subvariable=name,
                        value=v,unit=str(unit),source_product=p.short_name,source_version=p.version,source_granule=Path(path).name,
                        native_temporal_resolution='daily',native_spatial_resolution='1 x 1 degree',processing_level='satellite-column',
                        quality_flag='L3 source screening; fill/range',provenance_note='AIRS-only CO total column; not a surface concentration. Ascending and descending separate.'))
    finally:f.end()
    return rows
