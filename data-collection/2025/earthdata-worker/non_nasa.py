from __future__ import annotations

import math
from collections import defaultdict
from typing import Any

import numpy as np
import requests

from pipeline import WEST, SOUTH, EAST, NORTH, BBOX_ID, grid_id

# Use the historical OSM snapshot at the end of 2025 rather than current OSM.
# ohsome v1 supports timestamped OSM history extraction without fabricating a 2025 snapshot.
OHSOME_URL = "https://api.ohsome.org/v1/elements/geometry"
OSM_SNAPSHOT = "2025-01-01T00:00:00Z"


def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2-lat1); dl = math.radians(lon2-lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*r*math.asin(math.sqrt(a))


def cell_area_km2(lat: float, step: float=0.01) -> float:
    ns = 111.32*step
    ew = 111.32*math.cos(math.radians(lat))*step
    return ns*ew


def _ohsome(filter_expr: str, timeout=600) -> dict[str, Any]:
    data = {
        "bboxes": f"{WEST},{SOUTH},{EAST},{NORTH}",
        "time": OSM_SNAPSHOT,
        "filter": filter_expr,
        "properties": "tags,metadata",
        "clipGeometry": "true",
        "format": "geojson",
    }
    r = requests.post(OHSOME_URL, data=data, timeout=(15,timeout),
                      headers={"User-Agent":"Lupus-Cortex/2025-data-builder"})
    r.raise_for_status()
    js = r.json()
    # v1 geometry extraction commonly returns a FeatureCollection directly.
    if js.get("type") == "FeatureCollection":
        return js
    # Some deployments wrap GeoJSON in result.
    if isinstance(js.get("result"), dict) and js["result"].get("type") == "FeatureCollection":
        return js["result"]
    raise RuntimeError(f"Unexpected ohsome response keys: {list(js)[:10]}")


def _feature_centroid(feature):
    geom = feature.get("geometry") or {}
    typ = geom.get("type")
    coords = geom.get("coordinates")
    if not coords: return None
    pts=[]
    def collect(x):
        if isinstance(x,(list,tuple)) and len(x)>=2 and all(isinstance(v,(int,float)) for v in x[:2]):
            pts.append((float(x[1]),float(x[0])))
        elif isinstance(x,(list,tuple)):
            for y in x: collect(y)
    collect(coords)
    if not pts:return None
    return sum(a for a,b in pts)/len(pts), sum(b for a,b in pts)/len(pts)


def _iter_lines(feature):
    geom=feature.get("geometry") or {}; typ=geom.get("type"); c=geom.get("coordinates") or []
    if typ=="LineString": seqs=[c]
    elif typ=="MultiLineString": seqs=c
    elif typ=="Polygon": seqs=c
    elif typ=="MultiPolygon": seqs=[ring for poly in c for ring in poly]
    else: seqs=[]
    for seq in seqs:
        for a,b in zip(seq,seq[1:]):
            yield float(a[1]),float(a[0]),float(b[1]),float(b[0])


def static_row(cid, component, sv, value, unit, lat, lon, note, source="OpenStreetMap via ohsome", q=""):
    return {
        "timestamp_start_utc": OSM_SNAPSHOT, "timestamp_end_utc": OSM_SNAPSHOT,
        "lat":lat,"lon":lon,"grid_cell_id":grid_id(lat,lon),"component_id":cid,"component":component,
        "subvariable":sv,"value":value,"unit":unit,"quality_flag":q,"source_product":source,
        "source_version":"OSM snapshot 2025-01-01","source_granule":"ohsome API historical snapshot",
        "native_temporal_resolution":"static-reference","native_spatial_resolution":"vector",
        "processing_level":"derived GIS","reference_year":"2025","bbox_id":BBOX_ID,"provenance_note":note,
    }


def collect_roads():
    js=_ohsome("type:way and highway=*")
    lengths=defaultdict(float)
    for f in js.get("features",[]):
        for la1,lo1,la2,lo2 in _iter_lines(f):
            mla,mlo=(la1+la2)/2,(lo1+lo2)/2
            if SOUTH<=mla<=NORTH and WEST<=mlo<=EAST:
                lengths[grid_id(mla,mlo)] += haversine_km(la1,lo1,la2,lo2)
    rows=[]; step=__import__("pipeline").CONFIG["model_grid_deg"]
    for gid,km in lengths.items():
        iy,ix=map(int,gid[1:].split("_")); la=SOUTH+(iy+.5)*step; lo=WEST+(ix+.5)*step
        rows.append(static_row(23,"Road density","ROAD_DENSITY_MIDPOINT_PROXY",km/cell_area_km2(la,step),"km/km²",la,lo,
            "Beginning-of-year historical OpenStreetMap highway geometry at 2025-01-01; segment lengths assigned by midpoint to 0.01° cells."))
    return rows


def _extract_points(filter_expr: str):
    js=_ohsome(filter_expr)
    pts=[]
    for f in js.get("features",[]):
        c=_feature_centroid(f)
        if c and SOUTH<=c[0]<=NORTH and WEST<=c[1]<=EAST: pts.append(c)
    return pts


def model_cells():
    step=__import__("pipeline").CONFIG["model_grid_deg"]
    nlat=math.ceil((NORTH-SOUTH)/step); nlon=math.ceil((EAST-WEST)/step)
    for iy in range(nlat):
        la=SOUTH+(iy+.5)*step
        if la>NORTH: continue
        for ix in range(nlon):
            lo=WEST+(ix+.5)*step
            if lo>EAST: continue
            yield la,lo,grid_id(la,lo)


def nearest_distance(lat,lon,points):
    if points is None:return float("nan")
    # cKDTree on unit sphere: nearest chord and great-circle distance have the same ordering.
    la,lo=math.radians(lat),math.radians(lon)
    chord,_=points.query([math.cos(la)*math.cos(lo),math.cos(la)*math.sin(lo),math.sin(la)])
    return 2*6371.0088*math.asin(min(1.,float(chord)/2))

def point_tree(points):
    if not points:return None
    from scipy.spatial import cKDTree
    a=np.radians(np.asarray(points));la,lo=a[:,0],a[:,1]
    return cKDTree(np.c_[np.cos(la)*np.cos(lo),np.cos(la)*np.sin(lo),np.sin(la)])


def collect_accessibility():
    hospitals=_extract_points("(amenity=hospital or amenity=clinic or healthcare=hospital)")
    transit=_extract_points("(public_transport=* or highway=bus_stop or railway=station)")
    infra=_extract_points("(amenity=fire_station or amenity=police or amenity=shelter or power=substation or power=plant or man_made=water_works or man_made=wastewater_plant)")
    tcount=defaultdict(int); icount=defaultdict(int)
    for la,lo in transit:tcount[grid_id(la,lo)]+=1
    for la,lo in infra:icount[grid_id(la,lo)]+=1
    hospital_tree=point_tree(hospitals);transit_tree=point_tree(transit)
    rows=[]
    for la,lo,gid in model_cells():
        area=cell_area_km2(la)
        hd=nearest_distance(la,lo,hospital_tree)
        if np.isfinite(hd):
            rows.append(static_row(25,"Hospital accessibility","HOSPITAL_DISTANCE_KM",hd,"km",la,lo,
                "Nearest hospital/clinic distance from historical OSM snapshot 2025-01-01."))
            rows.append(static_row(25,"Hospital accessibility","HOSPITAL_ACCESS_MIN_PROXY",hd/25*60,"minutes",la,lo,
                "Proxy travel time at 25 km/h from historical OSM facility distance; not a routed traffic estimate.",q="proxy"))
        td=nearest_distance(la,lo,transit_tree); local=tcount.get(gid,0)
        if np.isfinite(td):
            score=100*(0.65*math.exp(-td/1.0)+0.35*(1-math.exp(-local/3)))
            rows.append(static_row(24,"Public-transport accessibility","TRANSIT_ACCESS_SCORE",score,"0-100",la,lo,
                "Historical OSM 2025-01-01 access proxy using nearest stop/station distance and local stop density.",q="proxy"))
            rows.append(static_row(24,"Public-transport accessibility","TRANSIT_NEAREST_KM",td,"km",la,lo,
                "Nearest mapped public-transport stop/station in historical OSM snapshot 2025-01-01."))
        rows.append(static_row(27,"Critical-infrastructure density","CRITICAL_INFRA_DENSITY",icount.get(gid,0)/area,"facilities/km²",la,lo,
            "Historical OSM 2025-01-01 density of fire/police/shelter/power/water/wastewater facilities."))
    return rows


def collect_all_osm():
    return collect_roads()+collect_accessibility()
