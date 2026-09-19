#!/usr/bin/env python3
from __future__ import annotations
import argparse, csv, hashlib, json, os
from pathlib import Path
from urllib.parse import urlparse
import requests

BBOX=(89.24,22.80,91.31,24.80)
TEMPORAL=("2025-01-01T00:00:00Z","2025-12-31T23:59:59Z")
CMR_COLLECTIONS="https://cmr.earthdata.nasa.gov/search/collections.json"
CMR_GRANULES="https://cmr.earthdata.nasa.gov/search/granules.json"

SOURCES={
 "merra2_aerosol":(["M2T1NXAER"],None,"GES_DISC",[1,2]),
 "merra2_slv":(["M2T1NXSLV"],None,"GES_DISC",[9,10]),
 "omi_no2":(["OMNO2d"],"004","GES_DISC",[3]),
 "omi_o3":(["OMTO3d"],"004","GES_DISC",[4]),
 "omi_so2":(["OMSO2e"],"004","GES_DISC",[5]),
 "airs_co":(["AIRS3STD","AIRX3STD"],"7.0","GES_DISC",[6]),
 "modis_maiac_aod":(["MCD19A2"],"061","LPCLOUD",[7]),
 "modis_terra_lst":(["MOD11A1"],"061","LPCLOUD",[8]),
 "modis_aqua_lst":(["MYD11A1"],"061","LPCLOUD",[8]),
 "modis_terra_ndvi":(["MOD13A2"],"061","LPCLOUD",[11]),
 "modis_aqua_ndvi":(["MYD13A2"],"061","LPCLOUD",[11]),
 "hls_sentinel":(["HLSS30"],"2.0","LPCLOUD",[12,13,14,26]),
 "hls_landsat":(["HLSL30"],"2.0","LPCLOUD",[12,13,14,26]),
 "gpm_imerg":(["GPM_3IMERGHH"],"07","GES_DISC",[15,16]),
 "smap_soil_moisture":(["SPL3SMP_E"],"006","NSIDC_ECS",[17,20]),
 "opera_dswx_hls":(["OPERA_L3_DSWX-HLS_V1"],None,"POCLOUD",[18,19]),
 "opera_dswx_s1":(["OPERA_L3_DSWX-S1_V1"],None,"POCLOUD",[18,19]),
 "grace_mascon":(["TELLUS_GRAC-GRFO_MASCON_CRI_GRID_RL06.3_V4","TELLUS_GRAC-GRFO_MASCON_GRID_RL06.3_V4"],None,"POCLOUD",[20]),
 "black_marble":(["VNP46A2"],"002","LPCLOUD",[28]),
 "nasadem":(["NASADEM_HGT","NASADEM_HGT.001"],"001","LPCLOUD",[25,29]),
}
NON_NASA={21:"SEDAC GPW population reference",22:"SEDAC age demographics",23:"2025 OSM road snapshot",24:"GTFS + OSM transit network",25:"hospital facilities + network",26:"derived HLS/OSM/population accessibility",27:"OSM/HDX/official critical infrastructure",30:"derived Lupus Cortex composite"}

def session():
 s=requests.Session(); s.headers.update({"User-Agent":"LupusCortex-Earthdata/1.0","Accept":"application/json"}); return s

def resolve(source):
 names,version,provider,_=SOURCES[source]; s=session()
 for name in names:
  p={"short_name":name,"page_size":100}
  if version:p["version"]=version
  if provider:p["provider"]=provider
  r=s.get(CMR_COLLECTIONS,params=p,timeout=60); r.raise_for_status(); e=r.json().get("feed",{}).get("entry",[])
  if e:
   e.sort(key=lambda x:(x.get("revision_id",0),x.get("updated","")),reverse=True); x=e[0]
   return {"source":source,"short_name":x.get("short_name",name),"version":x.get("version_id",version),"concept_id":x["id"]}
 raise RuntimeError(f"No CMR collection resolved for {source}")

def links(entry):
 out=[]
 for x in entry.get("links",[]) or []:
  u=x.get("href",""); rel=x.get("rel","").lower(); title=x.get("title","").lower()
  if not u or x.get("inherited") or "browse" in rel or "documentation" in rel or "metadata" in rel or "opendap" in title: continue
  if "data#" in rel or "download" in title or u.startswith("https://"): out.append(u)
 return list(dict.fromkeys(out))

def granules(source):
 c=resolve(source); s=session(); page=1
 while True:
  p={"collection_concept_id":c["concept_id"],"bounding_box":",".join(map(str,BBOX)),"temporal":",".join(TEMPORAL),"page_size":2000,"page_num":page,"sort_key[]":"start_date"}
  r=s.get(CMR_GRANULES,params=p,timeout=120); r.raise_for_status(); es=r.json().get("feed",{}).get("entry",[])
  if not es:return
  for e in es:
   yield {**c,"granule_id":e.get("id"),"producer_granule_id":e.get("producer_granule_id") or e.get("title"),"time_start":e.get("time_start"),"time_end":e.get("time_end") or e.get("time_start"),"urls":links(e)}
  if len(es)<2000:return
  page+=1

def token():
 t=os.getenv("EARTHDATA_TOKEN","").strip()
 if not t: raise RuntimeError("EARTHDATA_TOKEN is missing. Authorize/create it on NASA Earthdata Login and store it as a secret, never in source control.")
 return t

def download(url,dest,gid):
 dest.mkdir(parents=True,exist_ok=True); name=Path(urlparse(url).path).name or gid; final=dest/name; part=Path(str(final)+".part")
 have=part.stat().st_size if part.exists() else 0; h={"Authorization":f"Bearer {token()}","User-Agent":"LupusCortex-Earthdata/1.0"}
 if have:h["Range"]=f"bytes={have}-"
 with requests.get(url,headers=h,stream=True,allow_redirects=True,timeout=(30,600)) as r:
  if have and r.status_code==200: part.unlink(missing_ok=True); have=0
  r.raise_for_status(); mode="ab" if have and r.status_code==206 else "wb"
  with part.open(mode) as f:
   for b in r.iter_content(1024*1024):
    if b:f.write(b)
 part.replace(final)
 sha=hashlib.sha256()
 with final.open("rb") as f:
  for block in iter(lambda:f.read(1024*1024),b""): sha.update(block)
 return {"path":str(final),"bytes":final.stat().st_size,"sha256":sha.hexdigest(),"url":url}

def inventory(source,out):
 rows=list(granules(source)); out.parent.mkdir(parents=True,exist_ok=True)
 with out.open("w",newline="",encoding="utf-8") as f:
  w=csv.DictWriter(f,fieldnames=["source","short_name","version","concept_id","granule_id","producer_granule_id","time_start","time_end","urls"]); w.writeheader()
  for r in rows:r=dict(r);r["urls"]=json.dumps(r["urls"]);w.writerow(r)
 return rows

def run(source_keys,out,inventory_only=False):
 out=Path(out); report={"bbox":{"west":BBOX[0],"south":BBOX[1],"east":BBOX[2],"north":BBOX[3]},"temporal":TEMPORAL,"sources":{},"non_nasa":NON_NASA}
 for key in source_keys:
  rows=inventory(key,out/"inventory"/f"{key}.csv"); report["sources"][key]={"granules":len(rows),"downloaded":0,"errors":[]}; print(f"{key}: {len(rows)} granules")
  if inventory_only:continue
  for g in rows:
   if not g["urls"]: report["sources"][key]["errors"].append({"granule":g["granule_id"],"error":"no data URL"}); continue
   try: download(g["urls"][0],out/"raw"/key,g["granule_id"]); report["sources"][key]["downloaded"]+=1
   except Exception as e: report["sources"][key]["errors"].append({"granule":g["granule_id"],"error":f"{type(e).__name__}: {e}"})
  out.mkdir(parents=True,exist_ok=True); (out/"job_report.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
 out.mkdir(parents=True,exist_ok=True); (out/"job_report.json").write_text(json.dumps(report,indent=2),encoding="utf-8"); return report

def main():
 p=argparse.ArgumentParser(); p.add_argument("--inventory-only",action="store_true"); p.add_argument("--source",action="append",choices=sorted(SOURCES)); p.add_argument("--out",default="earthdata_output"); a=p.parse_args(); run(a.source or list(SOURCES),a.out,a.inventory_only)
if __name__=="__main__": main()
