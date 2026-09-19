import http from "node:http";
import { URL } from "node:url";

const PORT = Number(process.env.PORT || 3000);
const FIXED_BBOX = "89.24,22.80,91.31,24.80";
const FIXED_TEMPORAL = "2025-01-01T00:00:00Z,2025-12-31T23:59:59Z";

function json(res,status,obj){
  const body=JSON.stringify(obj,null,2);
  res.writeHead(status,{"content-type":"application/json; charset=utf-8","content-length":Buffer.byteLength(body)});
  res.end(body);
}

async function cmr(shortName,version,page=1,pageSize=10){
  const u=new URL("https://cmr.earthdata.nasa.gov/search/granules.json");
  u.searchParams.set("short_name",shortName);
  if(version)u.searchParams.set("version",version);
  u.searchParams.set("temporal",FIXED_TEMPORAL);
  u.searchParams.set("bounding_box",FIXED_BBOX);
  u.searchParams.set("downloadable","true");
  u.searchParams.set("page_size",String(Math.min(pageSize,2000)));
  u.searchParams.set("page_num",String(page));
  const r=await fetch(u,{headers:{"User-Agent":"Lupus-Cortex-Earthdata-Worker/0.2"}});
  if(!r.ok)throw new Error(`CMR ${r.status}: ${await r.text()}`);
  const j=await r.json();
  return {hits:Number(r.headers.get("CMR-Hits")||0),entries:j?.feed?.entry||[]};
}

const server=http.createServer(async(req,res)=>{
  try{
    const u=new URL(req.url||"/",`http://${req.headers.host||"localhost"}`);
    if(u.pathname==="/health"||u.pathname==="/status"){
      return json(res,200,{
        ok:true,
        service:"lupus-cortex-earthdata-worker",
        earthdataTokenConfigured:Boolean(process.env.EARTHDATA_TOKEN),
        bbox:{west:89.24,south:22.80,east:91.31,north:24.80},
        temporal:{start:"2025-01-01T00:00:00Z",end:"2025-12-31T23:59:59Z"},
        node:process.version
      });
    }
    if(u.pathname==="/cmr"){
      const shortName=u.searchParams.get("short_name");
      if(!shortName)return json(res,400,{error:"short_name required"});
      const data=await cmr(shortName,u.searchParams.get("version")||undefined,
        Number(u.searchParams.get("page")||1),Number(u.searchParams.get("page_size")||10));
      return json(res,200,{hits:data.hits,entries:data.entries.map(e=>({
        id:e.id,title:e.title,time_start:e.time_start,time_end:e.time_end,
        producer_granule_id:e.producer_granule_id,
        links:(e.links||[]).filter(l=>l.href&&!l.inherited).map(l=>l.href).slice(0,10)
      }))});
    }
    return json(res,404,{error:"not found"});
  }catch(e){return json(res,500,{error:e?.message||String(e)});}
});
server.listen(PORT,"0.0.0.0",()=>console.log(`Earthdata worker listening on ${PORT}`));
