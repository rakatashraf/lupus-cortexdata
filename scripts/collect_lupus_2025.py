#!/usr/bin/env python3
import os, json, math, time, warnings, calendar
from pathlib import Path
from datetime import datetime, timezone
import numpy as np
import pandas as pd
import requests

OUT = Path("data_2025_output")
OUT.mkdir(exist_ok=True)
BBOX = (89.24, 22.80, 91.31, 24.80)  # west,south,east,north
YEAR = 2025
GRID = 0.25
LAT = np.arange(math.ceil(BBOX[1]/GRID)*GRID, math.floor(BBOX[3]/GRID)*GRID + 1e-9, GRID)
LON = np.arange(math.ceil(BBOX[0]/GRID)*GRID, math.floor(BBOX[2]/GRID)*GRID + 1e-9, GRID)
CELLS = pd.DataFrame([(round(float(a),5), round(float(o),5)) for a in LAT for o in LON], columns=["lat","lon"])
TIMES = pd.date_range("2025-01-01T00:00:00Z","2025-12-31T23:45:00Z",freq="15min")
STATUS = {}
PROV = []

COMPONENTS = [
("pm25_ug_m3","PM2.5"),("pm10_ug_m3","PM10"),("no2_ppb","NO2"),("o3_ppb","O3"),
("so2_ppb","SO2"),("co_ppm","CO"),("aod550","Aerosol optical depth / aerosol index"),
("lst_c","Land surface temperature"),("air_temp_c","Air temperature"),("rh_pct","Relative humidity"),
("ndvi","NDVI"),("green_space_pct","Green-space percentage"),("built_up_pct","Built-up percentage"),
("impervious_pct","Impervious surface"),("precip_mm","Precipitation"),("extreme_rainfall_flag","Extreme rainfall"),
("soil_moisture_m3_m3","Soil moisture"),("surface_water_extent_pct","Surface-water extent"),
("flood_extent_pct","Flood extent"),("drought_anomaly","Drought anomaly"),("population_density_km2","Population density"),
("vulnerable_age_pct","Vulnerable-age population"),("road_density_km_km2","Road density"),
("public_transport_accessibility","Public-transport accessibility"),("hospital_accessibility","Hospital accessibility"),
("green_space_accessibility","Green-space accessibility"),("critical_infrastructure_density_km2","Critical-infrastructure density"),
("nighttime_lights","Night-time lights"),("elevation_m","Elevation"),("slope_deg","Slope"),
("disaster_exposure_readiness","Disaster exposure/readiness")
]

def prov(col, component, source, native_temporal, native_spatial, category, unit, notes=""):
    PROV.append(dict(column=col,component=component,source=source,native_temporal=native_temporal,
                     native_spatial=native_spatial,category=category,unit=unit,notes=notes))

def note(name, ok, detail):
    STATUS[name] = {"ok": bool(ok), "detail": str(detail)}
    print(f"[{name}] {'OK' if ok else 'FAIL'}: {detail}", flush=True)

def cell_area_km2(lat):
    # spherical rectangle 0.25° x 0.25°
    R=6371.0088
    dlon=math.radians(GRID)
    y1=math.radians(lat-GRID/2); y2=math.radians(lat+GRID/2)
    return R*R*dlon*(math.sin(y2)-math.sin(y1))

def base_month(month):
    start=pd.Timestamp(YEAR,month,1,tz="UTC")
    end=(start + pd.offsets.MonthEnd(0)).replace(hour=23,minute=45)
    ts=pd.date_range(start,end,freq="15min")
    n=len(ts); c=len(CELLS)
    return pd.DataFrame({
        "timestamp_utc": np.repeat(ts.values, c),
        "lat": np.tile(CELLS.lat.values, n),
        "lon": np.tile(CELLS.lon.values, n),
    })

def geos_cf_month(month):
    from netCDF4 import Dataset, date2num, num2date
    url="https://opendap.nccs.nasa.gov/dods/gmao/geos-cf/assim/htf_inst_15mn_g1440x721_x1"
    ds=Dataset(url)
    tvar=ds.variables["time"]; units=tvar.units
    cal=getattr(tvar,"calendar","standard")
    s=datetime(YEAR,month,1)
    e=datetime(YEAR + (1 if month==12 else 0), 1 if month==12 else month+1, 1)
    tn=np.asarray(tvar[:])
    i0=int(np.searchsorted(tn,date2num(s,units,calendar=cal),side="left"))
    i1=int(np.searchsorted(tn,date2num(e,units,calendar=cal),side="left"))
    lats=np.asarray(ds.variables["lat"][:]); lons=np.asarray(ds.variables["lon"][:])
    yi=np.where((lats>=BBOX[1])&(lats<=BBOX[3]))[0]
    xi=np.where((lons>=BBOX[0])&(lons<=BBOX[2]))[0]
    # Enforce target grid centers exactly.
    yi=np.array([int(np.argmin(abs(lats-v))) for v in LAT])
    xi=np.array([int(np.argmin(abs(lons-v))) for v in LON])
    dt=pd.to_datetime([str(x) for x in num2date(tn[i0:i1],units,calendar=cal,
                        only_use_cftime_datetimes=False,only_use_python_datetimes=True)], utc=True)
    # Some netCDF4 versions stringify oddly; deterministic 15-min timeline is safer after count check.
    expected=pd.date_range(pd.Timestamp(s,tz="UTC"),pd.Timestamp(e,tz="UTC")-pd.Timedelta(minutes=15),freq="15min")
    if len(dt)!=len(expected): raise RuntimeError(f"GEOS time count {len(dt)} != {len(expected)}")
    dt=expected
    shape=(len(dt),len(yi),len(xi))
    out={"timestamp_utc":np.repeat(dt.values,len(yi)*len(xi)),
         "lat":np.tile(np.repeat(lats[yi],len(xi)),len(dt)),
         "lon":np.tile(np.tile(lons[xi],len(yi)),len(dt))}
    mapping={"pm25_rh35_gcc":"pm25_ug_m3","no2":"no2_ppb","o3":"o3_ppb","so2":"so2_ppb",
             "co":"co_ppm","t":"air_temp_c","rh":"rh_pct"}
    for src,col in mapping.items():
        a=np.ma.filled(ds.variables[src][i0:i1,0,yi[0]:yi[-1]+1,xi[0]:xi[-1]+1],np.nan).astype("float32")
        # yi/xi are consecutive for this bbox.
        if src in ("no2","o3","so2"): a*=1e9
        elif src=="co": a*=1e6
        elif src=="t": a-=273.15
        elif src=="rh" and np.nanpercentile(a,99)<2: a*=100
        out[col]=a.reshape(-1)
    ds.close()
    return pd.DataFrame(out)

def geos_aod_month(month):
    from netCDF4 import Dataset, date2num
    url="https://opendap.nccs.nasa.gov/dods/gmao/geos-cf/assim/xgc_tavg_1hr_g1440x721_x1"
    ds=Dataset(url); tvar=ds.variables["time"]; units=tvar.units; cal=getattr(tvar,"calendar","standard")
    s=datetime(YEAR,month,1); e=datetime(YEAR+(month==12),1 if month==12 else month+1,1)
    tn=np.asarray(tvar[:]); i0=int(np.searchsorted(tn,date2num(s,units,calendar=cal))); i1=int(np.searchsorted(tn,date2num(e,units,calendar=cal)))
    lats=np.asarray(ds.variables["lat"][:]); lons=np.asarray(ds.variables["lon"][:])
    yi=np.array([int(np.argmin(abs(lats-v))) for v in LAT]); xi=np.array([int(np.argmin(abs(lons-v))) for v in LON])
    # Hourly time-averaged product is centered on :30.
    dt=pd.date_range(pd.Timestamp(s,tz="UTC")+pd.Timedelta(minutes=30),pd.Timestamp(e,tz="UTC")-pd.Timedelta(minutes=30),freq="1h")
    comps=["aod550_bc","aod550_dust","aod550_oc","aod550_sala","aod550_salc","aod550_sulfate"]
    vals=None
    for v in comps:
        a=np.ma.filled(ds.variables[v][i0:i1,yi[0]:yi[-1]+1,xi[0]:xi[-1]+1],np.nan).astype("float32")
        vals=a if vals is None else vals+a
    ds.close()
    n=min(len(dt),vals.shape[0]); vals=vals[:n]; dt=dt[:n]
    return pd.DataFrame({"timestamp_utc":np.repeat(dt.values,len(LAT)*len(LON)),
                         "lat":np.tile(np.repeat(LAT,len(LON)),n),
                         "lon":np.tile(np.tile(LON,len(LAT)),n),
                         "aod550":vals.reshape(-1)})

def openmeteo_year():
    # Public fallback only for workbook variables whose primary NASA product needs EDL or is unavailable in GEOS-CF v1.
    api="https://archive-api.open-meteo.com/v1/archive"
    rows=[]
    pts=CELLS.to_dict("records")
    for k in range(0,len(pts),8):
        batch=pts[k:k+8]
        p={"latitude":",".join(str(x["lat"]) for x in batch),"longitude":",".join(str(x["lon"]) for x in batch),
           "start_date":"2025-01-01","end_date":"2025-12-31","timezone":"UTC",
           "hourly":"precipitation,soil_moisture_0_to_7cm"}
        r=requests.get(api,params=p,timeout=120); r.raise_for_status(); data=r.json()
        if isinstance(data,dict): data=[data]
        for req,obj in zip(batch,data):
            t=pd.to_datetime(obj["hourly"]["time"],utc=True)
            rows.append(pd.DataFrame({"timestamp_utc":t,"lat":req["lat"],"lon":req["lon"],
                                      "precip_mm":obj["hourly"]["precipitation"],
                                      "soil_moisture_m3_m3":obj["hourly"]["soil_moisture_0_to_7cm"]}))
        time.sleep(.2)
    weather=pd.concat(rows,ignore_index=True)
    # 95th percentile of wet-hour precipitation by grid cell.
    def q95(s):
        z=s[s>0]
        return float(z.quantile(.95)) if len(z) else np.nan
    th=weather.groupby(["lat","lon"]).precip_mm.apply(q95).rename("p95").reset_index()
    weather=weather.merge(th,on=["lat","lon"],how="left")
    weather["extreme_rainfall_flag"]=((weather.precip_mm>=weather.p95)&(weather.precip_mm>0)).astype("float32")
    # Soil-moisture standardized anomaly within 2025 as a transparent fallback proxy for drought anomaly.
    g=weather.groupby(["lat","lon"]).soil_moisture_m3_m3
    mu=g.transform("mean"); sd=g.transform("std").replace(0,np.nan)
    weather["drought_anomaly"]=(weather.soil_moisture_m3_m3-mu)/sd
    return weather.drop(columns="p95")

def openmeteo_pm10_year():
    api="https://air-quality-api.open-meteo.com/v1/air-quality"; rows=[]
    pts=CELLS.to_dict("records")
    for k in range(0,len(pts),8):
        batch=pts[k:k+8]
        p={"latitude":",".join(str(x["lat"]) for x in batch),"longitude":",".join(str(x["lon"]) for x in batch),
           "start_date":"2025-01-01","end_date":"2025-12-31","timezone":"UTC","domains":"cams_global","hourly":"pm10"}
        r=requests.get(api,params=p,timeout=120); r.raise_for_status(); data=r.json()
        if isinstance(data,dict): data=[data]
        for req,obj in zip(batch,data):
            rows.append(pd.DataFrame({"timestamp_utc":pd.to_datetime(obj["hourly"]["time"],utc=True),
                                      "lat":req["lat"],"lon":req["lon"],"pm10_ug_m3":obj["hourly"]["pm10"]}))
        time.sleep(.2)
    return pd.concat(rows,ignore_index=True)

def pc_landsat_monthly():
    import pystac_client, planetary_computer, rasterio
    from rasterio.windows import from_bounds
    from rasterio.warp import transform_bounds, transform
    from rasterio.enums import Resampling
    cat=pystac_client.Client.open("https://planetarycomputer.microsoft.com/api/stac/v1/",modifier=planetary_computer.sign_inplace)
    out=[]
    for month in range(1,13):
        s=f"2025-{month:02d}-01"; e=f"2025-{month:02d}-{calendar.monthrange(2025,month)[1]:02d}T23:59:59Z"
        items=list(cat.search(collections=["landsat-c2-l2"],bbox=BBOX,datetime=f"{s}/{e}",query={"eo:cloud_cover":{"lt":70}}).items())
        # Favor low cloud and limit redundant path/row scenes.
        items=sorted(items,key=lambda i:i.properties.get("eo:cloud_cover",100))[:10]
        acc={tuple(x):[] for x in CELLS[["lat","lon"]].itertuples(index=False,name=None)}
        for item in items:
            try:
                assets=item.assets
                bands={}
                for key in ["red","green","nir08","swir16","lwir11","qa_pixel"]:
                    if key not in assets: raise KeyError(key)
                    href=assets[key].href
                    with rasterio.open(href) as src:
                        b=transform_bounds("EPSG:4326",src.crs,*BBOX,densify_pts=21)
                        win=from_bounds(*b,src.transform).round_offsets().round_lengths()
                        h,w=512,512
                        arr=src.read(1,window=win,out_shape=(h,w),resampling=Resampling.nearest if key=="qa_pixel" else Resampling.bilinear,masked=True)
                        tr=src.window_transform(win)*src.transform.scale(win.height/h,win.width/w)
                        bands[key]=(arr,tr,src.crs)
                red=bands["red"][0].astype("float32")*0.0000275-0.2
                green=bands["green"][0].astype("float32")*0.0000275-0.2
                nir=bands["nir08"][0].astype("float32")*0.0000275-0.2
                swir=bands["swir16"][0].astype("float32")*0.0000275-0.2
                # Landsat C2 L2 ST_B10 scale/offset.
                lst=bands["lwir11"][0].astype("float32")*0.00341802+149.0-273.15
                qa=np.asarray(bands["qa_pixel"][0].filled(0),dtype=np.uint16)
                clear=((qa & (1<<1))==0)&((qa & (1<<2))==0)&((qa & (1<<3))==0)&((qa & (1<<4))==0)
                with np.errstate(divide="ignore",invalid="ignore"):
                    ndvi=(nir-red)/(nir+red); ndbi=(swir-nir)/(swir+nir); mndwi=(green-swir)/(green+swir)
                h,w=ndvi.shape; tr=bands["red"][1]; crs=bands["red"][2]
                rr,cc=np.indices((h,w)); xs,ys=rasterio.transform.xy(tr,rr,cc,offset="center")
                xs=np.asarray(xs); ys=np.asarray(ys)
                lons,lats=transform(crs,"EPSG:4326",xs.ravel(),ys.ravel()); lats=np.asarray(lats); lons=np.asarray(lons)
                vals={"ndvi":ndvi.filled(np.nan).ravel(),"lst_c":lst.filled(np.nan).ravel(),
                      "green":((ndvi>0.30)&clear).astype(float).ravel(),
                      "built":((ndbi>0.0)&(ndvi<0.30)&clear).astype(float).ravel(),
                      "imperv":((ndbi>0.10)&(ndvi<0.25)&clear).astype(float).ravel(),
                      "water":((mndwi>0.20)&(ndvi<0.20)&clear).astype(float).ravel()}
                clear1=clear.ravel()
                for la,lo in CELLS[["lat","lon"]].itertuples(index=False,name=None):
                    m=(lats>=la-GRID/2)&(lats<la+GRID/2)&(lons>=lo-GRID/2)&(lons<lo+GRID/2)&clear1
                    if m.sum()<5: continue
                    acc[(la,lo)].append({k:float(np.nanmean(v[m])) for k,v in vals.items()})
            except Exception as ex:
                print("landsat scene skip",item.id,ex,flush=True)
        stamp=pd.Timestamp(2025,month,15,12,tz="UTC")
        for (la,lo),z in acc.items():
            if not z: continue
            d=pd.DataFrame(z).median(numeric_only=True)
            out.append({"timestamp_utc":stamp,"lat":la,"lon":lo,"ndvi":d.get("ndvi",np.nan),"lst_c":d.get("lst_c",np.nan),
                        "green_space_pct":100*d.get("green",np.nan),"built_up_pct":100*d.get("built",np.nan),
                        "impervious_pct":100*d.get("imperv",np.nan),"surface_water_extent_pct":100*d.get("water",np.nan)})
    df=pd.DataFrame(out)
    if len(df):
        base=df.groupby(["lat","lon"]).surface_water_extent_pct.transform(lambda s:s.quantile(.25))
        df["flood_extent_pct"]=(df.surface_water_extent_pct-base).clip(lower=0)
    return df

def pc_nasadem():
    import pystac_client, planetary_computer, rasterio
    from rasterio.warp import transform_bounds
    from rasterio.windows import from_bounds
    from rasterio.enums import Resampling
    cat=pystac_client.Client.open("https://planetarycomputer.microsoft.com/api/stac/v1/",modifier=planetary_computer.sign_inplace)
    items=list(cat.search(collections=["nasadem"],bbox=BBOX).items())
    # If collection id differs, discover by title.
    if not items: raise RuntimeError("No NASADEM STAC items")
    rows=[]
    for la,lo in CELLS[["lat","lon"]].itertuples(index=False,name=None):
        zs=[]
        for it in items:
            for a in it.assets.values():
                if "tif" not in (a.media_type or "").lower() and not a.href.lower().endswith((".tif",".tiff")): continue
                try:
                    with rasterio.open(a.href) as src:
                        bb=transform_bounds("EPSG:4326",src.crs,lo-GRID/2,la-GRID/2,lo+GRID/2,la+GRID/2,densify_pts=9)
                        win=from_bounds(*bb,src.transform)
                        arr=src.read(1,window=win,out_shape=(64,64),resampling=Resampling.bilinear,masked=True).astype("float32")
                        z=np.asarray(arr.filled(np.nan)); z=z[(z>-500)&(z<9000)]
                        if z.size: zs.append(z)
                except Exception: pass
        if zs:
            z=np.concatenate(zs); elev=float(np.nanmean(z))
            # approximate slope from elevation variability over 0.25° cell; flagged as derived approximation
            slope=float(np.degrees(np.arctan(np.nanstd(z)/max(1,GRID*111000/64))))
            rows.append({"lat":la,"lon":lo,"elevation_m":elev,"slope_deg":slope})
    return pd.DataFrame(rows)

def overpass_static():
    q='''[out:json][timeout:180][date:"2025-12-31T23:59:00Z"];(
way["highway"](%s,%s,%s,%s);
node["public_transport"](%s,%s,%s,%s);
node["amenity"~"hospital|clinic"](%s,%s,%s,%s);
node["amenity"~"fire_station|police"](%s,%s,%s,%s);
node["power"~"plant|substation"](%s,%s,%s,%s);
node["man_made"~"water_works|wastewater_plant"](%s,%s,%s,%s);
);out geom;''' % ((BBOX[1],BBOX[0],BBOX[3],BBOX[2])*6)
    endpoints=["https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter"]
    data=None
    for ep in endpoints:
        try:
            r=requests.post(ep,data={"data":q},timeout=240); r.raise_for_status(); data=r.json(); break
        except Exception as ex: print("overpass",ep,ex,flush=True)
    if data is None: raise RuntimeError("Overpass unavailable")
    # Haversine length and nearest counts by target cell; a deliberately simple, reproducible infrastructure feature engineering step.
    cells={tuple(x):{"road_km":0.0,"pt":0,"hosp":0,"crit":0} for x in CELLS[["lat","lon"]].itertuples(index=False,name=None)}
    def key_for(la,lo):
        la0=float(LAT[np.argmin(abs(LAT-la))]); lo0=float(LON[np.argmin(abs(LON-lo))])
        return (la0,lo0) if abs(la-la0)<=GRID/2 and abs(lo-lo0)<=GRID/2 else None
    def hav(a,b,c,d):
        R=6371.0088; p1,p2=math.radians(a),math.radians(c); dp=math.radians(c-a); dl=math.radians(d-b)
        h=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
        return 2*R*math.asin(min(1,math.sqrt(h)))
    for el in data.get("elements",[]):
        tags=el.get("tags",{})
        if el["type"]=="way" and "highway" in tags:
            g=el.get("geometry",[])
            for a,b in zip(g,g[1:]):
                ml=(a["lat"]+b["lat"])/2; mo=(a["lon"]+b["lon"])/2; k=key_for(ml,mo)
                if k: cells[k]["road_km"]+=hav(a["lat"],a["lon"],b["lat"],b["lon"])
        elif el["type"]=="node":
            k=key_for(el.get("lat",999),el.get("lon",999))
            if not k: continue
            if "public_transport" in tags: cells[k]["pt"]+=1
            if tags.get("amenity") in ("hospital","clinic"): cells[k]["hosp"]+=1
            if tags.get("amenity") in ("fire_station","police") or tags.get("power") in ("plant","substation") or tags.get("man_made") in ("water_works","wastewater_plant"): cells[k]["crit"]+=1
    rows=[]
    for (la,lo),v in cells.items():
        area=cell_area_km2(la)
        rows.append({"lat":la,"lon":lo,"road_density_km_km2":v["road_km"]/area,
                     "public_transport_accessibility":v["pt"]/area,
                     "hospital_accessibility":v["hosp"]/area,
                     "critical_infrastructure_density_km2":v["crit"]/area})
    return pd.DataFrame(rows)

def worldpop_static():
    # Global2 API. If unavailable, return empty rather than inventing demographic data.
    url="https://api.worldpop.org/v2/population"; rows=[]
    for la,lo in CELLS[["lat","lon"]].itertuples(index=False,name=None):
        poly={"type":"Polygon","coordinates":[[[lo-GRID/2,la-GRID/2],[lo+GRID/2,la-GRID/2],[lo+GRID/2,la+GRID/2],[lo-GRID/2,la+GRID/2],[lo-GRID/2,la-GRID/2]]]}
        try:
            r=requests.post(url,json={"geojson":poly,"year":2025,"resolution":"1km"},timeout=60); r.raise_for_status(); j=r.json()
            val=j.get("population",j.get("total_population",j.get("pop",j.get("result",np.nan))))
            if isinstance(val,dict):
                val=val.get("population",val.get("pop",val.get("total",np.nan)))
            rows.append({"lat":la,"lon":lo,"population_density_km2":float(val)/cell_area_km2(la)})
        except Exception:
            rows.append({"lat":la,"lon":lo,"population_density_km2":np.nan})
    # Age-sex API response formats may vary; calculate vulnerable share (<15 or >=65) when the service exposes categories.
    aurl="https://api.worldpop.org/v2/agesex"
    for row in rows:
        la,lo=row["lat"],row["lon"]
        poly={"type":"Polygon","coordinates":[[[lo-GRID/2,la-GRID/2],[lo+GRID/2,la-GRID/2],[lo+GRID/2,la+GRID/2],[lo-GRID/2,la+GRID/2],[lo-GRID/2,la-GRID/2]]]}
        try:
            r=requests.post(aurl,json={"geojson":poly,"year":2025,"resolution":"1km"},timeout=60); r.raise_for_status(); j=r.json()
            flat=j.get("agesex",j.get("result",j))
            d=flat if isinstance(flat,dict) else {}
            nums={str(k):float(v) for k,v in d.items() if isinstance(v,(int,float))}
            total=sum(v for k,v in nums.items() if ("total" not in k.lower()))
            vulnerable=sum(v for k,v in nums.items() if any(x in k.lower() for x in ["00","01","05","10","65","70","75","80","85","90"]))
            row["vulnerable_age_pct"]=100*vulnerable/total if total>0 else np.nan
        except Exception: row["vulnerable_age_pct"]=np.nan
    return pd.DataFrame(rows)

def merge_asof_grid(base, src, cols, tolerance=None):
    if src is None or src.empty: return base
    base=base.sort_values(["lat","lon","timestamp_utc"])
    src=src.copy(); src["timestamp_utc"]=pd.to_datetime(src["timestamp_utc"],utc=True).dt.tz_localize(None)
    base["timestamp_utc"]=pd.to_datetime(base["timestamp_utc"]).dt.tz_localize(None)
    # exact common float keys
    src["lat"]=src.lat.round(5); src["lon"]=src.lon.round(5)
    pieces=[]
    for (la,lo),b in base.groupby(["lat","lon"],sort=False):
        s=src[(src.lat==la)&(src.lon==lo)].sort_values("timestamp_utc")
        if s.empty: pieces.append(b); continue
        z=pd.merge_asof(b.sort_values("timestamp_utc"),s[["timestamp_utc"]+cols].sort_values("timestamp_utc"),
                        on="timestamp_utc",direction="backward",tolerance=tolerance)
        pieces.append(z)
    return pd.concat(pieces,ignore_index=True)

def build():
    # Static/support datasets first.
    try: weather=openmeteo_year(); note("weather_fallback",True,f"{len(weather):,} hourly rows")
    except Exception as e: weather=pd.DataFrame(); note("weather_fallback",False,e)
    try: pm10=openmeteo_pm10_year(); note("pm10_fallback",True,f"{len(pm10):,} hourly rows")
    except Exception as e: pm10=pd.DataFrame(); note("pm10_fallback",False,e)
    try: land=pc_landsat_monthly(); note("landsat",True,f"{len(land):,} monthly cell rows")
    except Exception as e: land=pd.DataFrame(); note("landsat",False,e)
    try: dem=pc_nasadem(); note("nasadem",True,f"{len(dem):,} cells")
    except Exception as e: dem=pd.DataFrame(); note("nasadem",False,e)
    try: osm=overpass_static(); note("osm",True,f"{len(osm):,} cells")
    except Exception as e: osm=pd.DataFrame(); note("osm",False,e)
    try: pop=worldpop_static(); note("worldpop",True,f"{len(pop):,} cells")
    except Exception as e: pop=pd.DataFrame(); note("worldpop",False,e)

    # Component provenance.
    for c,n in COMPONENTS: prov(c,n,"UNRESOLVED","unknown","unknown","pending","")
    p={x["column"]:x for x in PROV}
    for c,u in [("pm25_ug_m3","ug m-3"),("no2_ppb","ppb"),("o3_ppb","ppb"),("so2_ppb","ppb"),("co_ppm","ppm"),("air_temp_c","degC"),("rh_pct","%")]:
        p[c].update(source="NASA GEOS-CF v1 htf_inst_15mn_g1440x721_x1",native_temporal="15 min instantaneous",native_spatial="0.25 degree",category="NASA model/replay",unit=u)
    p["aod550"].update(source="NASA GEOS-CF v1 xgc_tavg_1hr_g1440x721_x1; sum of BC+dust+OC+sea-salt+sulfate AOD550",native_temporal="1 hour time-averaged",native_spatial="0.25 degree",category="NASA model/derived",unit="1")
    p["pm10_ug_m3"].update(source="Open-Meteo CAMS global archive fallback; GEOS-CF v1 does not expose full-year PM10",native_temporal="1 hour",native_spatial="CAMS global grid",category="fallback non-NASA",unit="ug m-3")
    for c,u in [("precip_mm","mm"),("soil_moisture_m3_m3","m3 m-3"),("extreme_rainfall_flag","0/1"),("drought_anomaly","z-score")]:
        p[c].update(source="Open-Meteo ERA5 archive fallback; primary workbook sources are GPM/SMAP/GRACE and require EDL",native_temporal="1 hour",native_spatial="ERA5 grid",category="fallback/derived",unit=u)
    for c,u in [("lst_c","degC"),("ndvi","1"),("green_space_pct","%"),("built_up_pct","%"),("impervious_pct","%"),("surface_water_extent_pct","%"),("flood_extent_pct","%")]:
        p[c].update(source="Landsat 8/9 Collection 2 Level-2 via Microsoft Planetary Computer; spectral monthly composite",native_temporal="scene; monthly composite",native_spatial="30 m source; aggregated to 0.25 degree",category="satellite/derived",unit=u)
    p["elevation_m"].update(source="NASADEM HGT v001 via Microsoft Planetary Computer",native_temporal="static",native_spatial="~30 m source; aggregated to 0.25 degree",category="NASA static",unit="m")
    p["slope_deg"].update(source="Derived from NASADEM within-cell elevation variation (approximation)",native_temporal="static",native_spatial="0.25 degree aggregate",category="derived",unit="degree")
    for c,u in [("road_density_km_km2","km km-2"),("public_transport_accessibility","features km-2"),("hospital_accessibility","features km-2"),("critical_infrastructure_density_km2","features km-2")]:
        p[c].update(source="OpenStreetMap historical snapshot 2025-12-31 via Overpass",native_temporal="2025-12-31 snapshot",native_spatial="vector",category="non-NASA infrastructure",unit=u)
    p["population_density_km2"].update(source="WorldPop Global2 2025 fallback for SEDAC GPWv4",native_temporal="annual/static 2025",native_spatial="1 km source; zonal aggregate",category="fallback demographic",unit="people km-2")
    p["vulnerable_age_pct"].update(source="WorldPop Global2 2025 age-sex fallback for SEDAC",native_temporal="annual/static 2025",native_spatial="1 km source; zonal aggregate",category="fallback demographic",unit="%")
    p["green_space_accessibility"].update(source="Derived proxy: green_space_pct adjusted by population density",native_temporal="monthly",native_spatial="0.25 degree",category="derived proxy",unit="0-100")
    p["disaster_exposure_readiness"].update(source="Derived composite proxy from flood, drought, critical infrastructure and hospital density",native_temporal="15-min table (drivers update at native cadence)",native_spatial="0.25 degree",category="derived proxy",unit="0-100")
    p["nighttime_lights"].update(source="NASA Black Marble/VIIRS requested; no unauthenticated 2025 numeric endpoint available in this run",native_temporal="daily/monthly intended",native_spatial="500 m intended",category="EDL-required/not substituted",unit="nW cm-2 sr-1")

    files=[]
    for month in range(1,13):
        print("MONTH",month,flush=True)
        b=base_month(month)
        try:
            g=geos_cf_month(month); b=b.merge(g,on=["timestamp_utc","lat","lon"],how="left"); note(f"geos_{month:02d}",True,f"{len(g):,}")
        except Exception as e:
            note(f"geos_{month:02d}",False,e)
            for c in ["pm25_ug_m3","no2_ppb","o3_ppb","so2_ppb","co_ppm","air_temp_c","rh_pct"]: b[c]=np.nan
        try:
            a=geos_aod_month(month)
            b=merge_asof_grid(b,a,["aod550"],pd.Timedelta(hours=2))
        except Exception as e: print("aod failed",month,e,flush=True); b["aod550"]=np.nan
        if not pm10.empty:
            s=pm10[pd.to_datetime(pm10.timestamp_utc).dt.month==month]
            b=merge_asof_grid(b,s,["pm10_ug_m3"],pd.Timedelta(minutes=59))
        else: b["pm10_ug_m3"]=np.nan
        if not weather.empty:
            s=weather[pd.to_datetime(weather.timestamp_utc).dt.month==month]
            b=merge_asof_grid(b,s,["precip_mm","soil_moisture_m3_m3","extreme_rainfall_flag","drought_anomaly"],pd.Timedelta(minutes=59))
        else:
            for c in ["precip_mm","soil_moisture_m3_m3","extreme_rainfall_flag","drought_anomaly"]: b[c]=np.nan
        if not land.empty:
            b=merge_asof_grid(b,land,["lst_c","ndvi","green_space_pct","built_up_pct","impervious_pct","surface_water_extent_pct","flood_extent_pct"],pd.Timedelta(days=62))
        else:
            for c in ["lst_c","ndvi","green_space_pct","built_up_pct","impervious_pct","surface_water_extent_pct","flood_extent_pct"]: b[c]=np.nan
        for static,cols in [(dem,["elevation_m","slope_deg"]),(osm,["road_density_km_km2","public_transport_accessibility","hospital_accessibility","critical_infrastructure_density_km2"]),(pop,["population_density_km2","vulnerable_age_pct"])]:
            if static is not None and not static.empty:
                b=b.merge(static[["lat","lon"]+[c for c in cols if c in static.columns]],on=["lat","lon"],how="left")
            else:
                for c in cols:
                    if c not in b: b[c]=np.nan
        # Green accessibility: monotonic proxy, not a claim of routing-based access.
        if "green_space_pct" in b and "population_density_km2" in b:
            den=(b.population_density_km2.fillna(b.population_density_km2.median())/5000).clip(lower=0)
            b["green_space_accessibility"]=(b.green_space_pct/(1+den)).clip(0,100)
        else: b["green_space_accessibility"]=np.nan
        b["nighttime_lights"]=np.nan
        # Composite only where at least 3 drivers are available. Higher = better readiness / lower exposure.
        flood=(100-b.flood_extent_pct.clip(0,100)) if "flood_extent_pct" in b else np.nan
        drought=(100-(b.drought_anomaly.abs()*20).clip(0,100)) if "drought_anomaly" in b else np.nan
        crit=(b.critical_infrastructure_density_km2*1000).clip(0,100) if "critical_infrastructure_density_km2" in b else np.nan
        hosp=(b.hospital_accessibility*1000).clip(0,100) if "hospital_accessibility" in b else np.nan
        b["disaster_exposure_readiness"]=pd.concat([pd.Series(flood),pd.Series(drought),pd.Series(crit),pd.Series(hosp)],axis=1).mean(axis=1,skipna=True)
        # guarantee 30 features in fixed order
        for c,_ in COMPONENTS:
            if c not in b: b[c]=np.nan
        cols=["timestamp_utc","lat","lon"]+[c for c,_ in COMPONENTS]
        f=OUT/f"part_{month:02d}.csv.gz"; b[cols].to_csv(f,index=False,compression="gzip"); files.append(f)
        del b

    # concatenate gzip parts into one valid gzip multi-member stream; pandas/gzip readers handle it transparently.
    master=OUT/"lupus_cortex_2025_master.csv.gz"
    with open(master,"wb") as w:
        for i,f in enumerate(files):
            import gzip
            with gzip.open(f,"rt") as r:
                if i:
                    next(r,None)
                with gzip.GzipFile(fileobj=w,mode="wb") as gz:
                    for line in r:
                        gz.write(line.encode())
    pd.DataFrame(PROV).to_csv(OUT/"lupus_cortex_2025_provenance.csv",index=False)
    with open(OUT/"acquisition_report.json","w") as f:
        json.dump({"bbox":{"west":BBOX[0],"south":BBOX[1],"east":BBOX[2],"north":BBOX[3]},
                   "year":YEAR,"grid_degree":GRID,"grid_cells":len(CELLS),"master_timestep":"15min",
                   "rows_expected":len(TIMES)*len(CELLS),"status":STATUS},f,indent=2)
    print("DONE",master,flush=True)

if __name__=="__main__":
    warnings.filterwarnings("ignore")
    build()
