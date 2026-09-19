import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const maxDuration = 800;

const BBOX = "-89"; // placeholder to keep lint calm
const FIXED_BBOX = "89.24,22.80,91.31,24.80";
const FIXED_TEMPORAL = "2025-01-01T00:00:00Z,2025-12-31T23:59:59Z";
const DATA_DIR = process.env.DATA_DIR || "/tmp/lupus-earthdata";

function token() {
  const t = process.env.EARTHDATA_TOKEN;
  if (!t) throw new Error("EARTHDATA_TOKEN is not configured on the deployment.");
  return t;
}

function downloadLinks(entry:any): string[] {
  const links = Array.isArray(entry?.links) ? entry.links : [];
  return links
    .filter((l:any) => typeof l?.href === "string" && !l.inherited &&
      (l.rel?.includes("/data#") || l.rel?.includes("data#") || l.title?.toLowerCase?.().includes("download")))
    .map((l:any) => l.href);
}

async function cmrGranules(shortName:string, version?:string, pageNum=1, pageSize=2000) {
  const u = new URL("https://cmr.earthdata.nasa.gov/search/granules.json");
  u.searchParams.set("short_name", shortName);
  if (version) u.searchParams.set("version", version);
  u.searchParams.set("temporal", FIXED_TEMPORAL);
  u.searchParams.set("bounding_box", FIXED_BBOX);
  u.searchParams.set("downloadable", "true");
  u.searchParams.set("page_size", String(Math.min(pageSize, 2000)));
  u.searchParams.set("page_num", String(pageNum));
  const r = await fetch(u, {headers:{"User-Agent":"Lupus-Cortex-Earthdata-MCP/0.1"}});
  if (!r.ok) throw new Error(`CMR search failed: ${r.status} ${await r.text()}`);
  const hits = Number(r.headers.get("CMR-Hits") || "0");
  const body:any = await r.json();
  const entries = body?.feed?.entry || [];
  return {hits, entries: entries.map((e:any)=>({
    id:e.id, title:e.title, time_start:e.time_start, time_end:e.time_end,
    producer_granule_id:e.producer_granule_id,
    boxes:e.boxes || [], polygons:e.polygons || [],
    links:downloadLinks(e)
  }))};
}

async function downloadOne(url:string, subdir:string) {
  const safeDir = path.join(DATA_DIR, subdir.replace(/[^a-zA-Z0-9._-]/g,"_"));
  await fs.mkdir(safeDir, {recursive:true});
  const parsed = new URL(url);
  const name = path.basename(parsed.pathname) || "granule.bin";
  const finalPath = path.join(safeDir, name);
  try {
    const st = await fs.stat(finalPath);
    if (st.size > 0) return {url, path:finalPath, bytes:st.size, status:"exists"};
  } catch {}
  const r = await fetch(url, {
    redirect:"follow",
    headers:{Authorization:`Bearer ${token()}`,"User-Agent":"Lupus-Cortex-Earthdata-MCP/0.1"}
  });
  if (!r.ok) throw new Error(`download failed ${r.status} for ${url}`);
  const ab = await r.arrayBuffer();
  await fs.writeFile(finalPath, new Uint8Array(ab));
  return {url,path:finalPath,bytes:ab.byteLength,status:"downloaded"};
}

const handler = createMcpHandler((server) => {
  server.tool(
    "earthdata_status",
    "Check whether this connector has an Earthdata token and report the fixed Lupus Cortex collection scope.",
    {},
    async () => ({
      content:[{type:"text",text:JSON.stringify({
        authenticated:Boolean(process.env.EARTHDATA_TOKEN),
        bbox:{west:89.24,south:22.80,east:91.31,north:24.80},
        temporal:{start:"2025-01-01T00:00:00Z",end:"2025-12-31T23:59:59Z"},
        dataDir:DATA_DIR
      },null,2)}]
    })
  );

  server.tool(
    "search_2025_granules",
    "Search NASA CMR for all downloadable granules intersecting the fixed Lupus Cortex bbox during calendar year 2025.",
    {
      short_name:z.string().min(1),
      version:z.string().optional(),
      page_num:z.number().int().min(1).default(1),
      page_size:z.number().int().min(1).max(2000).default(2000)
    },
    async ({short_name,version,page_num,page_size}) => {
      const result = await cmrGranules(short_name,version,page_num,page_size);
      return {content:[{type:"text",text:JSON.stringify(result,null,2)}]};
    }
  );

  server.tool(
    "download_2025_granule_urls",
    "Authenticated resumable download of NASA Earthdata granule URLs. Use only URLs returned by CMR search. Existing non-empty files are skipped.",
    {
      product:z.string().min(1),
      urls:z.array(z.string().url()).min(1).max(25)
    },
    async ({product,urls}) => {
      token();
      const results:any[] = [];
      for (const u of urls) {
        try { results.push(await downloadOne(u,product)); }
        catch (e:any) { results.push({url:u,status:"error",error:e?.message || String(e)}); }
      }
      return {content:[{type:"text",text:JSON.stringify({product,results},null,2)}]};
    }
  );

  server.tool(
    "list_downloaded_files",
    "List files already downloaded by the Earthdata connector.",
    {product:z.string().optional()},
    async ({product}) => {
      const root = product ? path.join(DATA_DIR,product.replace(/[^a-zA-Z0-9._-]/g,"_")) : DATA_DIR;
      const out:any[]=[];
      async function walk(dir:string) {
        let items:any[]=[]; try {items=await fs.readdir(dir,{withFileTypes:true});} catch {return;}
        for (const it of items) {
          const p=path.join(dir,it.name);
          if (it.isDirectory()) await walk(p);
          else { const s=await fs.stat(p); out.push({path:p,bytes:s.size}); }
          if (out.length>=5000) return;
        }
      }
      await walk(root);
      return {content:[{type:"text",text:JSON.stringify({root,count:out.length,files:out},null,2)}]};
    }
  );
});

export { handler as GET, handler as POST, handler as DELETE };
