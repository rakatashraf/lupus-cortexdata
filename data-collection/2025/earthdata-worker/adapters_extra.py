from __future__ import annotations

import math
import re
import zipfile
from collections import defaultdict
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


def _parse_modis_date(name: str) -> str:
    m = re.search(r"A(20\d{2})(\d{3})", name)
    if not m:
        return ""
    try:
        ts = pd.Timestamp(f"{m.group(1)}-01-01", tz="UTC") + pd.to_timedelta(int(m.group(2))-1, unit="D")
        return ts.isoformat().replace("+00:00", "Z")
    except Exception:
        return ""


def _parse_hls_date(name: str) -> str:
    m = re.search(r"\.(20\d{2})(\d{3})T(\d{6})", name)
    if not m:
        return _parse_modis_date(name)
    try:
        ts = pd.Timestamp(f"{m.group(1)}-01-01", tz="UTC") + pd.to_timedelta(int(m.group(2))-1, unit="D")
        hhmmss = m.group(3)
        ts += pd.to_timedelta(int(hhmmss[:2]), unit="h") + pd.to_timedelta(int(hhmmss[2:4]), unit="m") + pd.to_timedelta(int(hhmmss[4:]), unit="s")
        return ts.isoformat().replace("+00:00", "Z")
    except Exception:
        return ""


def _find_raster_subdataset(path: Path, keyword: str) -> str | None:
    import rasterio
    try:
        with rasterio.open(path) as src:
            subs = src.subdatasets
    except Exception:
        return None
    low = keyword.lower()
    for s in subs:
        if low == s.rsplit(':',1)[-1].strip('"').lower():
            return s
    return None


def raster_subdataset_rows(path: Path, p, *, keyword: str, subvariable: str, unit: str,
                           scale: float | None = None, offset: float | None = None,
                           valid_min: float | None = None, valid_max: float | None = None,
                           note: str = "", time_value: str = "", qa_keyword: str = "", qa_kind: str = "", band_index: int = 1) -> list[dict[str, Any]]:
    import rasterio
    from rasterio.warp import transform_bounds, transform
    from pipeline import WEST, SOUTH, EAST, NORTH, grid_id

    ds_name = _find_raster_subdataset(path, keyword)
    if keyword and ds_name is None:
        raise ValueError(f"Missing exact science subdataset {keyword}: {path.name}")
    target = ds_name or str(path)
    rows = []
    with rasterio.open(target) as src:
        b = transform_bounds("EPSG:4326", src.crs, WEST, SOUTH, EAST, NORTH, densify_pts=21)
        win = rasterio.windows.from_bounds(*b, transform=src.transform).round_offsets().round_lengths().intersection(rasterio.windows.Window(0,0,src.width,src.height))
        arr = src.read(band_index, window=win, masked=True)
        tr = src.window_transform(win)
        mask = np.ma.getmaskarray(arr).copy()
        if qa_keyword:
            qa_name = _find_raster_subdataset(path, qa_keyword)
            if qa_name is None: raise ValueError(f"Required QA subdataset missing: {qa_keyword}")
            with rasterio.open(qa_name) as qa_src:
                qa = qa_src.read(band_index if qa_src.count > 1 else 1,window=win,masked=True)
                if qa.shape != arr.shape: raise ValueError("Science/QA shape mismatch")
                q = np.asarray(qa,dtype=np.uint32)
                if qa_kind == "lst": valid=((q & 3)==0)&(((q>>2)&3)==0)&(((q>>6)&3)==0)
                elif qa_kind == "ndvi": valid=(q==0)
                elif qa_kind == "maiac": valid=((q&7)==1)&(((q>>8)&15)==0)
                elif qa_kind == "ntl": valid=(q==0)
                else: raise ValueError("Unknown QA policy")
                mask |= np.ma.getmaskarray(qa) | ~valid
        rr, cc = np.where(~mask)
        if not len(rr):
            return []
        xs, ys = rasterio.transform.xy(tr, rr, cc, offset="center")
        lons, lats = transform(src.crs, "EPSG:4326", xs, ys)
        raw = np.asarray(arr)[rr, cc].astype(float)
        sf = scale if scale is not None else (src.scales[0] if src.scales and src.scales[0] not in (None, 1.0) else 1.0)
        off = offset if offset is not None else (src.offsets[0] if src.offsets and src.offsets[0] is not None else 0.0)
        vals = raw * sf + off
        for la, lo, v in zip(lats, lons, vals):
            if not (SOUTH <= la <= NORTH and WEST <= lo <= EAST):
                continue
            if not np.isfinite(v):
                continue
            if valid_min is not None and v < valid_min: continue
            if valid_max is not None and v > valid_max: continue
            rows.append({
                "timestamp_start_utc": time_value, "timestamp_end_utc": time_value,
                "lat": float(la), "lon": float(lo), "grid_cell_id": grid_id(float(la), float(lo)),
                "component_id": p.component_id, "component": p.component, "subvariable": subvariable,
                "value": float(v), "unit": unit, "quality_flag": "science fill/range and product QA applied" if qa_keyword else "fill/range only; QA not verified",
                "source_product": p.short_name or p.adapter, "source_version": p.version,
                "source_granule": path.name, "native_temporal_resolution": p.cadence,
                "native_spatial_resolution": f"{abs(src.res[0]):g} x {abs(src.res[1]):g} {src.crs}",
                "processing_level": "QA-screened" if qa_keyword else "source-fill-screened", "reference_year": "", "provenance_note": note,
            })
    return rows


def process_modis_lst(path: Path, p) -> list[dict[str, Any]]:
    t = _parse_modis_date(path.name)
    rows = []
    for kw, sv in [("LST_Day_1km", "LST_Day_1km"), ("LST_Night_1km", "LST_Night_1km")]:
        # MOD11/MYD11 LST scale is 0.02 K.
        r = raster_subdataset_rows(path, p, keyword=kw, subvariable=sv, unit="°C",
                                   scale=0.02, offset=-273.15, valid_min=-100, valid_max=80,
                                   note="MODIS LST source DN ×0.02 K, then K→°C; fill/masked pixels excluded",
                                   time_value=t, qa_keyword="QC_Day" if "Day" in kw else "QC_Night", qa_kind="lst")
        rows.extend(r)
    return rows


def process_modis_ndvi(path: Path, p) -> list[dict[str, Any]]:
    t = _parse_modis_date(path.name)
    return raster_subdataset_rows(path, p, keyword="1 km 16 days NDVI", subvariable="NDVI", unit="1",
                                  scale=0.0001, valid_min=-1, valid_max=1,
                                  note="MODIS NDVI, only pixel reliability 0 (good); scale 0.0001", time_value=t, qa_keyword="1 km 16 days pixel reliability", qa_kind="ndvi")


def process_maiac_aod(path: Path, p) -> list[dict[str, Any]]:
    import rasterio
    t = _parse_modis_date(path.name)
    target=_find_raster_subdataset(path,"Optical_Depth_055")
    if not target: raise ValueError("MAIAC AOD subdataset missing")
    with rasterio.open(target) as src: count=src.count
    rows=[]
    for band in range(1,count+1):
        rows.extend(raster_subdataset_rows(path,p,keyword="Optical_Depth_055",
            subvariable=f"AOD_055_band_{band:02d}",unit="1",scale=.001,valid_min=0,valid_max=5,
            note="MAIAC AOD source band retained separately; daily product window, not a claimed exact orbit timestamp; clear cloud mask and best AOD QA.",
            time_value=t,qa_keyword="AOD_QA",qa_kind="maiac",band_index=band))
    return rows


def process_black_marble(path: Path, p) -> list[dict[str, Any]]:
    t = _parse_modis_date(path.name)
    # Prefer metadata scale/offset because collection revisions may encode them in the COG/HDF metadata.
    return raster_subdataset_rows(path, p, keyword="DNB_BRDF-Corrected_NTL",
                                  subvariable="DNB_BRDF-Corrected_NTL", unit="nW/cm²/sr",
                                  scale=0.1, valid_min=0, note="VNP46A2 non-gap-filled NTL; mandatory quality flag 0; scale 0.1. Cloud-mask screening requires further product-level validation.",
                                  time_value=t, qa_keyword="Mandatory_Quality_Flag", qa_kind="ntl")


def process_smap(path: Path, p) -> list[dict[str, Any]]:
    import h5py
    from pipeline import WEST, SOUTH, EAST, NORTH, grid_id
    rows = []
    with h5py.File(path, "r") as f:
        groups = [g for g in ["Soil_Moisture_Retrieval_Data_AM", "Soil_Moisture_Retrieval_Data_PM"] if g in f]
        if not groups: raise ValueError("SMAP retrieval groups missing")
        for gname in groups:
            g = f[gname]
            if gname.endswith("PM"):
                g = {k.removesuffix("_pm"):g[k] for k in g.keys()}
            if not all(k in g for k in ["soil_moisture", "latitude", "longitude", "retrieval_qual_flag"]):
                raise ValueError("SMAP science/geolocation/QA fields missing")
            sm = np.asarray(g["soil_moisture"][:], dtype=float)
            lat = np.asarray(g["latitude"][:], dtype=float)
            lon = np.asarray(g["longitude"][:], dtype=float)
            qa = np.asarray(g["retrieval_qual_flag"][:]) if "retrieval_qual_flag" in g else None
            m = np.isfinite(sm) & np.isfinite(lat) & np.isfinite(lon) & (lat >= SOUTH) & (lat <= NORTH) & (lon >= WEST) & (lon <= EAST)
            if qa is not None:
                # SMAP recommended retrieval flags generally include 0 and 8 (recommended quality with caveat bit patterns vary by release).
                m &= np.isin(qa, [0, 8])
            rr, cc = np.where(m)
            t = _parse_modis_date(path.name)
            for i, j in zip(rr, cc):
                v = float(sm[i, j])
                if not 0 <= v <= 1: continue
                la, lo = float(lat[i,j]), float(lon[i,j])
                rows.append({
                    "timestamp_start_utc": t, "timestamp_end_utc": t, "lat": la, "lon": lo,
                    "grid_cell_id": grid_id(la, lo), "component_id": p.component_id, "component": p.component,
                    "subvariable": "soil_moisture_AM" if gname.endswith("AM") else "soil_moisture_PM",
                    "value": v, "unit": "m³/m³", "quality_flag": int(qa[i,j]) if qa is not None else "",
                    "source_product": p.short_name, "source_version": p.version, "source_granule": path.name,
                    "native_temporal_resolution": "daily", "native_spatial_resolution": "9 km EASE-Grid 2.0",
                    "processing_level": "QA-screened", "reference_year": "",
                    "provenance_note": "SMAP SPL3SMP_E recommended-quality retrieval; AM/PM kept separately"
                })
    return rows


def _recursive_h5_datasets(h5):
    import h5py
    out = []
    def visit(name, obj):
        if isinstance(obj, h5py.Dataset): out.append((name, obj))
    h5.visititems(visit)
    return out


def process_omi_grid(path: Path, p) -> list[dict[str, Any]]:
    # First try netCDF/xarray; OMI daily gridded products vary in internal naming across versions.
    from pipeline import WEST, SOUTH, EAST, NORTH, grid_id, _open_xr, infer_time_from_xarray
    rows = []
    wanted = [s.lower() for s in p.subvariables]
    try:
        ds = _open_xr(path)
        latn = "lat" if "lat" in ds.coords else ("Latitude" if "Latitude" in ds.coords else None)
        lonn = "lon" if "lon" in ds.coords else ("Longitude" if "Longitude" in ds.coords else None)
        candidates = [v for v in ds.data_vars if any(w in v.lower() or v.lower() in w for w in wanted)]
        if latn and lonn and candidates:
            times = infer_time_from_xarray(ds, _parse_modis_date(path.name))
            for vname in candidates[:3]:
                da = ds[vname]
                if "time" in da.dims:
                    for ti, t in enumerate(times):
                        x = da.isel(time=ti)
                        if x.ndim != 2: continue
                        arr=np.asarray(x.values); lats=np.asarray(ds[latn].values); lons=np.asarray(ds[lonn].values)
                        for iy,la in enumerate(lats):
                            if not SOUTH<=la<=NORTH: continue
                            for ix,lo in enumerate(lons):
                                if not WEST<=lo<=EAST: continue
                                val=float(arr[iy,ix])
                                if not np.isfinite(val): continue
                                rows.append({"timestamp_start_utc":t,"timestamp_end_utc":t,"lat":float(la),"lon":float(lo),"grid_cell_id":grid_id(float(la),float(lo)),
                                  "component_id":p.component_id,"component":p.component,"subvariable":vname,"value":val,"unit":str(da.attrs.get("units","product-native")),
                                  "quality_flag":"","source_product":p.short_name,"source_version":p.version,"source_granule":path.name,"native_temporal_resolution":"daily",
                                  "native_spatial_resolution":"product-native gridded OMI","processing_level":"satellite-column","reference_year":"",
                                  "provenance_note":"OMI atmospheric column product; not relabeled as ground-level concentration"})
                elif da.ndim==2:
                    t=times[0] if times else _parse_modis_date(path.name)
                    arr=np.asarray(da.values); lats=np.asarray(ds[latn].values); lons=np.asarray(ds[lonn].values)
                    for iy,la in enumerate(lats):
                        if not SOUTH<=la<=NORTH: continue
                        for ix,lo in enumerate(lons):
                            if not WEST<=lo<=EAST: continue
                            val=float(arr[iy,ix])
                            if not np.isfinite(val): continue
                            rows.append({"timestamp_start_utc":t,"timestamp_end_utc":t,"lat":float(la),"lon":float(lo),"grid_cell_id":grid_id(float(la),float(lo)),
                              "component_id":p.component_id,"component":p.component,"subvariable":vname,"value":val,"unit":str(da.attrs.get("units","product-native")),
                              "quality_flag":"","source_product":p.short_name,"source_version":p.version,"source_granule":path.name,"native_temporal_resolution":"daily",
                              "native_spatial_resolution":"product-native gridded OMI","processing_level":"satellite-column","reference_year":"",
                              "provenance_note":"OMI atmospheric column product; not relabeled as ground-level concentration"})
            ds.close()
            if rows: return rows
    except Exception:
        pass
    return rows


def process_airs_l3(path: Path, p) -> list[dict[str, Any]]:
    from pipeline import WEST, SOUTH, EAST, NORTH, grid_id, _open_xr, infer_time_from_xarray
    rows = []
    try:
        ds = _open_xr(path)
    except Exception:
        raise
    latn = next((x for x in ["lat","Latitude","latitude"] if x in ds.coords), None)
    lonn = next((x for x in ["lon","Longitude","longitude"] if x in ds.coords), None)
    if not latn or not lonn:
        ds.close(); return []
    candidates = [v for v in ds.data_vars if re.match(r"^CO(?:_|$)",v,re.I) and not any(k in v.lower() for k in ["count","error","std","quality"])]
    times = infer_time_from_xarray(ds, _parse_modis_date(path.name))
    for vname in candidates:
        da=ds[vname]
        # Identify a pressure/level dimension if present and keep it explicit.
        level_dim=next((d for d in da.dims if d.lower() in ["lev","level","pressure","pres"]),None)
        tdim="time" if "time" in da.dims else None
        level_indices=range(da.sizes[level_dim]) if level_dim else [None]
        for li in level_indices:
            sub=da.isel({level_dim:li}) if level_dim else da
            level_label=""
            if level_dim:
                try: level_label=f"_{float(da[level_dim].values[li]):g}hPa"
                except Exception: level_label=f"_{li}"
            time_indices=range(sub.sizes[tdim]) if tdim else [None]
            for ti in time_indices:
                x=sub.isel({tdim:ti}) if tdim else sub
                if x.ndim!=2: continue
                t=times[ti] if tdim and ti < len(times) else (times[0] if times else "")
                arr=np.asarray(x.values); lats=np.asarray(ds[latn].values); lons=np.asarray(ds[lonn].values)
                for iy,la in enumerate(lats):
                    if not SOUTH<=la<=NORTH: continue
                    for ix,lo in enumerate(lons):
                        if not WEST<=lo<=EAST: continue
                        val=float(arr[iy,ix])
                        if not np.isfinite(val): continue
                        rows.append({"timestamp_start_utc":t,"timestamp_end_utc":t,"lat":float(la),"lon":float(lo),"grid_cell_id":grid_id(float(la),float(lo)),
                          "component_id":p.component_id,"component":p.component,"subvariable":vname+level_label,"value":val,"unit":str(da.attrs.get("units","product-native")),
                          "quality_flag":"","source_product":p.short_name,"source_version":p.version,"source_granule":path.name,"native_temporal_resolution":"daily",
                          "native_spatial_resolution":"1° x 1° nominal AIRS L3","processing_level":"satellite-profile","reference_year":"",
                          "provenance_note":"AIRS CO retained at native pressure level where available; not mislabeled as surface CO"})
    ds.close()
    return rows


def process_opera_dswx(path: Path, p) -> list[dict[str, Any]]:
    import rasterio
    from rasterio.warp import transform_bounds, transform
    from pipeline import WEST,SOUTH,EAST,NORTH,grid_id
    if "_B01_WTR" not in path.name.upper():
        # Try only a water-class asset; avoid processing confidence/cloud assets as water.
        return []
    t = _parse_hls_date(path.name)
    counts = defaultdict(lambda:[0.0,0])
    with rasterio.open(path) as src:
        b=transform_bounds("EPSG:4326",src.crs,WEST,SOUTH,EAST,NORTH,densify_pts=21)
        win=rasterio.windows.from_bounds(*b,transform=src.transform).round_offsets().round_lengths().intersection(rasterio.windows.Window(0,0,src.width,src.height))
        arr=src.read(1,window=win,masked=True)
        tr=src.window_transform(win)
        for row0 in range(0,arr.shape[0],512):
            sl=arr[row0:row0+512]
            mask=np.ma.getmaskarray(sl)
            rr,cc=np.where(~mask)
            if not len(rr): continue
            rr_full=rr+row0
            xs,ys=rasterio.transform.xy(tr,rr_full,cc,offset="center")
            lons,lats=transform(src.crs,"EPSG:4326",xs,ys)
            vals=np.asarray(sl)[rr,cc]
            for la,lo,v in zip(lats,lons,vals):
                if not(SOUTH<=la<=NORTH and WEST<=lo<=EAST): continue
                if "BWTR" in path.name.upper(): wf=1.0 if int(v)==1 else 0.0
                else:
                    if int(v)==1: wf=1.0
                    elif int(v)==2: continue
                    elif int(v) in [252,253,254,255]: continue
                    else: wf=0.0
                gid=grid_id(float(la),float(lo)); counts[gid][0]+=wf; counts[gid][1]+=1
    rows=[]
    step=__import__("pipeline").CONFIG["model_grid_deg"]
    for gid,(s,n) in counts.items():
        m=re.match(r"g(\d+)_(\d+)",gid); iy,ix=int(m.group(1)),int(m.group(2))
        la=SOUTH+(iy+0.5)*step; lo=WEST+(ix+0.5)*step
        rows.append({"timestamp_start_utc":t,"timestamp_end_utc":t,"lat":la,"lon":lo,"grid_cell_id":gid,"component_id":p.component_id,"component":p.component,
          "subvariable":"WATER_PERCENT" if p.component_id==18 else "FLOOD_INPUT_WATER_PERCENT","value":100*s/n,"unit":"%","quality_flag":"cloud/snow/ocean classes excluded",
          "source_product":p.short_name,"source_version":p.version,"source_granule":path.name,"native_temporal_resolution":"scene","native_spatial_resolution":"30 m aggregated to 0.01°",
          "processing_level":"derived","reference_year":"","provenance_note":"OPERA DSWx open-water percentage among classified non-partial pixels; partial-water pixels excluded, no invented fractional weight"})
    return rows


def process_nasadem(path: Path, p) -> list[dict[str, Any]]:
    import rasterio,tempfile
    from rasterio.warp import transform_bounds,transform
    from pipeline import WEST,SOUTH,EAST,NORTH,CONFIG,grid_id
    td=None
    if path.suffix.lower()==".zip":
        td=tempfile.TemporaryDirectory()
        with zipfile.ZipFile(path) as z:
            for info in z.infolist():
                target=(Path(td.name)/info.filename).resolve()
                if not target.is_relative_to(Path(td.name).resolve()):raise ValueError("Unsafe archive path")
            z.extractall(td.name)
        targets=[x for x in Path(td.name).rglob("*") if x.suffix.lower() in [".hgt",".tif"]]
    else:targets=[path]
    step=float(CONFIG["model_grid_deg"]);nx=math.ceil((EAST-WEST)/step);ny=math.ceil((NORTH-SOUTH)/step)
    sums=np.zeros((2,nx*ny));counts=np.zeros(nx*ny);rows=[]
    try:
        for target in targets:
            with rasterio.open(target) as src:
                bounds=transform_bounds("EPSG:4326",src.crs,WEST,SOUTH,EAST,NORTH,densify_pts=21)
                win=rasterio.windows.from_bounds(*bounds,transform=src.transform).round_offsets().round_lengths().intersection(rasterio.windows.Window(0,0,src.width,src.height))
                if src.crs.is_geographic:
                    dy=abs(src.res[1])*111320;dx=abs(src.res[0])*111320*math.cos(math.radians((SOUTH+NORTH)/2))
                else:dx,dy=map(abs,src.res)
                for offset in range(0,int(win.height),256):
                    height=min(256,int(win.height)-offset)
                    core=rasterio.windows.Window(win.col_off,win.row_off+offset,win.width,height)
                    # One-row halo for slope; discard it after differentiation.
                    top=max(0,core.row_off-1);bottom=min(src.height,core.row_off+height+1)
                    readwin=rasterio.windows.Window(core.col_off,top,core.width,bottom-top)
                    dem=src.read(1,window=readwin,masked=True).astype(float).filled(np.nan)
                    if min(dem.shape)<2:continue
                    gy,gx=np.gradient(dem,dy,dx);sl=np.degrees(np.arctan(np.hypot(gx,gy)))
                    start=int(core.row_off-top);dem=dem[start:start+height];sl=sl[start:start+height]
                    rr,cc=np.where(np.isfinite(dem)&np.isfinite(sl))
                    tr=src.window_transform(core)
                    xs=tr.c+(cc+.5)*tr.a+(rr+.5)*tr.b;ys=tr.f+(cc+.5)*tr.d+(rr+.5)*tr.e
                    if src.crs.to_epsg()==4326:lo,la=xs,ys
                    else:lo,la=map(np.asarray,transform(src.crs,"EPSG:4326",xs,ys))
                    ok=(la>=SOUTH)&(la<NORTH)&(lo>=WEST)&(lo<EAST)
                    idx=np.floor((la[ok]-SOUTH)/step).astype(int)*nx+np.floor((lo[ok]-WEST)/step).astype(int)
                    counts+=np.bincount(idx,minlength=nx*ny)
                    for i,values in enumerate([dem[rr,cc][ok],sl[rr,cc][ok]]):sums[i]+=np.bincount(idx,weights=values,minlength=nx*ny)
        for idx in np.where(counts>0)[0]:
            iy,ix=divmod(int(idx),nx);lat=SOUTH+(iy+.5)*step;lon=WEST+(ix+.5)*step
            for i,(sv,unit) in enumerate([("ELEVATION","m"),("SLOPE","degrees")]):
                rows.append(dict(timestamp_start_utc="2000-02-11T00:00:00Z",lat=lat,lon=lon,grid_cell_id=grid_id(lat,lon),
                    component_id=29,component=p.component,subvariable=sv,value=float(sums[i,idx]/counts[idx]),unit=unit,
                    source_product=p.short_name,source_version=p.version,source_granule=path.name,native_temporal_resolution="static-reference",
                    native_spatial_resolution="30 m aggregated to model cells",reference_year="2000",processing_level="derived",
                    quality_flag="valid elevation and slope pixels",provenance_note="Mean elevation/slope of source pixels per model cell. SRTM acquisition epoch, not 2025 terrain observations. Geographic spacing converted to local meters."))
    finally:
        if td:td.cleanup()
    return rows


def process_sedac_raster(path: Path, p) -> list[dict[str, Any]]:
    # Prefer 2020 30-arcsec GPWv4 raster granules; skip documentation and non-raster files.
    name=path.name.lower()
    if not any(ext in name for ext in [".tif",".tiff",".asc",".zip"]): return []
    if p.component_id==21 and ("2020" not in name or "30_sec" not in name): return []
    # Extraction is handled generically if zipped.
    import tempfile
    files=[path]; td=None
    if path.suffix.lower()==".zip":
        td=tempfile.TemporaryDirectory()
        with zipfile.ZipFile(path) as z: z.extractall(td.name)
        files=[x for x in Path(td.name).rglob("*") if x.suffix.lower() in [".tif",".tiff",".asc"]]
    rows=[]
    for fp in files:
        try:
            sv="POP_DENSITY" if p.component_id==21 else "VULNERABLE_AGE_INPUT"
            unit="persons/km²" if p.component_id==21 else "persons/pixel"
            rows.extend(raster_subdataset_rows(fp,p,keyword="",subvariable=sv,unit=unit,valid_min=0,
              note="GPWv4 reference grid. Population density uses 2020 reference epoch; age grids are reference data, not 2025 observations.",time_value="2025-01-01T00:00:00Z"))
        except Exception: raise
    if td: td.cleanup()
    for r in rows: r["reference_year"]="2020" if p.component_id==21 else "2010/available GPWv4 age epoch"
    return rows


def group_hls_files(files: list[Path]) -> dict[str, list[Path]]:
    groups=defaultdict(list)
    for fp in files:
        # Remove terminal band/Fmask token from HLS COG name.
        key=re.sub(r"\.(B\d{2}|B8A|Fmask|SZA|SAA|VZA|VAA)\.tif$","",fp.name,flags=re.I)
        groups[key].append(fp)
    return groups


def process_hls_files(files: list[Path], p) -> list[dict[str, Any]]:
    import rasterio
    from rasterio.warp import transform_bounds, transform
    from pipeline import WEST,SOUTH,EAST,NORTH,grid_id
    out=[]
    for key,group in group_hls_files(files).items():
        lookup={}
        for fp in group:
            m=re.search(r"\.(B\d{2}|B8A|Fmask)\.tif$",fp.name,re.I)
            if m: lookup[m.group(1).upper()]=fp
        is_s30=key.startswith("HLS.S30") or ".S30." in key
        red=lookup.get("B04")
        nir=lookup.get("B8A") or lookup.get("B08") if is_s30 else lookup.get("B05")
        swir=lookup.get("B11") if is_s30 else lookup.get("B06")
        if not(red and nir and swir): raise ValueError("Missing required HLS spectral bands")
        fmask=lookup.get("FMASK")
        if not fmask: raise ValueError("HLS Fmask is required")
        with rasterio.open(red) as rsrc, rasterio.open(nir) as nsrc, rasterio.open(swir) as ssrc:
            b=transform_bounds("EPSG:4326",rsrc.crs,WEST,SOUTH,EAST,NORTH,densify_pts=21)
            win=rasterio.windows.from_bounds(*b,transform=rsrc.transform).round_offsets().round_lengths().intersection(rasterio.windows.Window(0,0,rsrc.width,rsrc.height))
            R=rsrc.read(1,window=win,masked=True).astype(float)*0.0001
            N=nsrc.read(1,window=win,masked=True).astype(float)*0.0001
            S=ssrc.read(1,window=win,masked=True).astype(float)*0.0001
            valid=(~np.ma.getmaskarray(R))&(~np.ma.getmaskarray(N))&(~np.ma.getmaskarray(S))
            if fmask:
                with rasterio.open(fmask) as fsrc:
                    F=fsrc.read(1,window=win)
                    # HLS Fmask bits include cloud, adjacent cloud, shadow and snow/ice. Exclude any nonzero quality obstruction bits conservatively.
                    valid &= ((F & 0b00111111)==0)
            ndvi=(N-R)/(N+R+1e-9); ndbi=(S-N)/(S+N+1e-9)
            if p.component_id==12: metric=(ndvi>=0.30)
            elif p.component_id==13: metric=(ndbi>0.0)&(ndvi<0.30)
            else: metric=(ndbi>0.10)&(ndvi<0.20)
            tr=rsrc.window_transform(win)
            rr,cc=np.where(valid)
            # Aggregate binary 30m pixels into model grid without emitting tens of millions of rows.
            counts=defaultdict(lambda:[0,0])
            for start in range(0,len(rr),200000):
                rchunk=rr[start:start+200000]; cchunk=cc[start:start+200000]
                xs,ys=rasterio.transform.xy(tr,rchunk,cchunk,offset="center")
                lons,lats=transform(rsrc.crs,"EPSG:4326",xs,ys)
                vals=metric[rchunk,cchunk]
                for la,lo,v in zip(lats,lons,vals):
                    if not(SOUTH<=la<=NORTH and WEST<=lo<=EAST): continue
                    gid=grid_id(float(la),float(lo)); counts[gid][0]+=int(bool(v)); counts[gid][1]+=1
            t=_parse_hls_date(key)
            step=__import__("pipeline").CONFIG["model_grid_deg"]
            for gid,(yes,n) in counts.items():
                m=re.match(r"g(\d+)_(\d+)",gid); iy,ix=int(m.group(1)),int(m.group(2)); la=SOUTH+(iy+0.5)*step; lo=WEST+(ix+0.5)*step
                sv={12:"GREEN_PERCENT",13:"BUILT_PERCENT",14:"IMPERVIOUS_PERCENT"}[p.component_id]
                out.append({"timestamp_start_utc":t,"timestamp_end_utc":t,"lat":la,"lon":lo,"grid_cell_id":gid,"component_id":p.component_id,"component":p.component,
                  "subvariable":sv,"value":100*yes/n,"unit":"%","quality_flag":"HLS Fmask cloud/shadow/snow excluded","source_product":p.short_name,"source_version":p.version,
                  "source_granule":key,"native_temporal_resolution":"scene","native_spatial_resolution":"30 m aggregated to 0.01°","processing_level":"derived","reference_year":"",
                  "provenance_note":"HLS spectral threshold derivation: green NDVI≥0.30; built NDBI>0 & NDVI<0.30; impervious proxy NDBI>0.10 & NDVI<0.20. Thresholds are explicit heuristics and should be calibrated locally."})
    return out


def process_grace_mascon(path: Path, p) -> list[dict[str, Any]]:
    from pipeline import WEST,SOUTH,EAST,NORTH,grid_id,_open_xr
    rows=[]
    try: ds=_open_xr(path)
    except Exception: raise
    latn=next((x for x in ["lat","latitude","Latitude"] if x in ds.coords),None)
    lonn=next((x for x in ["lon","longitude","Longitude"] if x in ds.coords),None)
    timen=next((x for x in ["time","Time"] if x in ds.coords),None)
    candidates=[v for v in ["lwe_thickness"] if v in ds.data_vars]
    if not latn or not lonn or not timen or not candidates:
        ds.close(); return []
    vname=candidates[0]; da=ds[vname]
    times=pd.to_datetime(ds[timen].values,errors="coerce",utc=True)
    lats=np.asarray(ds[latn].values); lons=np.asarray(ds[lonn].values)
    for ti,t in enumerate(times):
        if pd.isna(t) or t.year!=2025: continue
        try: x=da.isel({timen:ti})
        except Exception: continue
        x=np.squeeze(np.asarray(x.values))
        if x.ndim!=2: continue
        # normalize orientation if lon x lat
        if x.shape==(len(lons),len(lats)): x=x.T
        for iy,la in enumerate(lats):
            if not SOUTH<=la<=NORTH: continue
            for ix,lo in enumerate(lons):
                # normalize 0..360 longitude
                lon=float(lo); lon=lon-360 if lon>180 else lon
                if not WEST<=lon<=EAST: continue
                val=float(x[iy,ix])
                if not np.isfinite(val): continue
                rows.append({"timestamp_start_utc":t.isoformat().replace("+00:00","Z"),"timestamp_end_utc":t.isoformat().replace("+00:00","Z"),
                  "lat":float(la),"lon":lon,"grid_cell_id":grid_id(float(la),lon),"component_id":p.component_id,"component":p.component,
                  "subvariable":"TWS_ANOMALY","value":val,"unit":str(da.attrs.get("units","cm water equivalent")),"quality_flag":"",
                  "source_product":p.short_name,"source_version":p.version,"source_granule":path.name,"native_temporal_resolution":"monthly",
                  "native_spatial_resolution":"0.5° mascon sampling / product-native","processing_level":"geophysical anomaly","reference_year":"",
                  "provenance_note":"JPL GRACE/GRACE-FO RL06.3 mascon terrestrial-water-equivalent anomaly; monthly geophysical product"})
    ds.close(); return rows
