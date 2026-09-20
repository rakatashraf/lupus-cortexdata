const $ = id => document.getElementById(id);
let selectedCollection = null;
let currentGranules = [];
let currentGranuleCycle = null;
let allCollections = [];

function toast(message, kind){
  const el=$("toast");
  el.textContent=message;
  el.className="toast show"+(kind?" "+kind:"");
  clearTimeout(window.__toastTimer);
  window.__toastTimer=setTimeout(function(){el.className="toast";},3200);
}
function csvList(value){return (value||"").split(",").map(function(x){return x.trim();}).filter(Boolean);}
function bbox(){return {south:Number($("south").value),west:Number($("west").value),north:Number($("north").value),east:Number($("east").value)};}
function dates(){return {start:$("startDate").value,end:$("endDate").value};}
function searchLabel(){return $("component").value.trim()||"earthdata";}
function validateInputs(requireToken){
  if(requireToken && !$("token").value.trim()) throw new Error("Paste your Earthdata token first.");
  if(!$("component").value.trim()) throw new Error("Enter a component or variable.");
  const b=bbox();
  if(Object.values(b).some(function(v){return !Number.isFinite(v);})) throw new Error("Enter a valid bounding box.");
  if(b.south>=b.north) throw new Error("South must be lower than north.");
  if(b.west>=b.east) throw new Error("West must be lower than east.");
  if(!$("startDate").value || !$("endDate").value) throw new Error("Select both dates.");
  if($("startDate").value>$("endDate").value) throw new Error("Start date must be on or before end date.");
}
async function api(path,body,asBlob){
  const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!response.ok){
    let detail="HTTP "+response.status;
    try{const data=await response.json();detail=data.detail||detail;}catch(e){try{detail=await response.text()||detail;}catch(_){}}
    throw new Error(detail);
  }
  return asBlob?response.blob():response.json();
}
function sleep(ms){return new Promise(function(resolve){setTimeout(resolve,ms);});}

async function apiResponseWithRetry(path,body,maxAttempts){
  const attempts=Math.max(1,maxAttempts||3);
  let lastError=null;
  for(let attempt=1;attempt<=attempts;attempt++){
    try{
      const response=await fetch(path,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(body)
      });
      if(response.ok) return response;

      let detail="HTTP "+response.status;
      try{const data=await response.clone().json();detail=data.detail||detail;}
      catch(e){try{detail=await response.clone().text()||detail;}catch(_){}}

      const retryable=response.status===408||response.status===409||response.status===425||
        response.status===429||response.status===500||response.status===502||
        response.status===503||response.status===504;

      if(!retryable || attempt===attempts) throw new Error(detail);
      lastError=new Error(detail);
    }catch(e){
      lastError=e;
      if(attempt===attempts) throw e;
    }
    await sleep(Math.min(5000,750*Math.pow(2,attempt-1)));
  }
  throw lastError||new Error("Request failed.");
}

async function apiResponse(path,body){
  const response=await fetch(path,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });
  if(!response.ok){
    let detail="HTTP "+response.status;
    try{const data=await response.json();detail=data.detail||detail;}
    catch(e){try{detail=await response.text()||detail;}catch(_){}}
    throw new Error(detail);
  }
  return response;
}

function splitCsvHeader(text){
  const clean=String(text||"").replace(/^\uFEFF/,"");
  const newline=clean.indexOf("\n");
  if(newline<0) return {header:clean.replace(/\r$/,""),body:""};
  return {
    header:clean.slice(0,newline).replace(/\r$/,""),
    body:clean.slice(newline+1)
  };
}

function downloadBlob(blob,name){
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(url);},1500);
}
function escapeHtml(value){
  return String(value==null?"":value).replace(/[&<>'"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c];});
}
function slug(value){return (value||"earthdata").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");}
function setDefaultDates(){
  const end=new Date();const start=new Date(end.getTime()-29*86400000);
  $("endDate").value=end.toISOString().slice(0,10);$("startDate").value=start.toISOString().slice(0,10);
}
async function health(){
  try{
    const r=await fetch("/api/health");if(!r.ok) throw new Error();
    const d=await r.json();$("health").textContent="Service online · v"+(d.version||"");$("health").className="status ok";
  }catch(e){$("health").textContent="Service unavailable";$("health").className="status bad";}
}

$("validateToken").onclick=async function(){
  const button=$("validateToken"),msg=$("tokenMessage");msg.className="message";msg.textContent="";
  try{
    const token=$("token").value.trim();if(!token) throw new Error("Paste an Earthdata token.");
    button.disabled=true;button.textContent="Validating…";
    const data=await api("/api/token/validate",{token:token},false);
    if(!data.valid) throw new Error(data.message||"NASA rejected this token.");
    msg.className="message success";msg.textContent="Token accepted by NASA CMR.";
  }catch(e){msg.className="message error";msg.textContent=e.message;}
  finally{button.disabled=false;button.textContent="Validate token";}
};

$("searchCollections").onclick=async function(){
  const button=$("searchCollections"),msg=$("searchMessage");
  msg.className="message";msg.textContent="";selectedCollection=null;currentGranules=[];currentGranuleCycle=null;allCollections=[];
  $("collectionPanel").classList.add("hidden");$("granulePanel").classList.add("hidden");$("externalArea").classList.add("hidden");
  try{
    validateInputs(true);button.disabled=true;button.textContent="Searching NASA…";
    const body={
      token:$("token").value.trim(),
      component:$("component").value.trim(),
      collection_name:"",
      bbox:bbox(),
      platforms:csvList($("platformFilter").value),
      instruments:csvList($("instrumentFilter").value)
    };
    const data=await api("/api/collections/search",body,false);
    const items=(data.nasa&&data.nasa.items)||[];
    allCollections=items.slice();
    $("collectionResultSearch").value="";
    updateCollectionCount(items.length);
    renderCollections(items);
    $("collectionPanel").classList.remove("hidden");
    $("collectionPanel").scrollIntoView({behavior:"smooth",block:"start"});
    if(items.length){
      msg.className="message success";
      msg.textContent="NASA collections found. Use the collection-name search inside the results panel to narrow the fetched list.";
    }
    else{
      msg.className="message warn";
      msg.textContent="No NASA collection matched these filters. Public fallback sources are shown when a mapping exists.";
    }
    renderExternal(data.external_candidates||[]);
  }catch(e){msg.className="message error";msg.textContent=e.message;}
  finally{button.disabled=false;button.textContent="Search Earthdata";}
};

function renderCollections(items){
  const root=$("collections");root.innerHTML="";
  if(!items.length){
    root.innerHTML='<div class="card"><h3>No NASA collection matched</h3><p>Try a broader component term, remove the platform/instrument filter, or use a public fallback below.</p></div>';
    return;
  }

  const groups={};
  items.forEach(function(item){
    const platforms=(item.platforms&&item.platforms.length)?item.platforms:["Unspecified platform"];
    platforms.forEach(function(platform){
      if(!groups[platform]) groups[platform]=[];
      if(!groups[platform].some(function(existing){return existing.concept_id===item.concept_id;})){
        groups[platform].push(item);
      }
    });
  });

  Object.keys(groups).sort(function(a,b){return a.localeCompare(b);}).forEach(function(platform){
    const section=document.createElement("section");
    section.className="satellite-group";

    const heading=document.createElement("div");
    heading.className="satellite-heading";
    heading.innerHTML="<div><span class='satellite-label'>SATELLITE / PLATFORM</span><h3>"+escapeHtml(platform)+"</h3></div><span class='badge'>"+groups[platform].length+" collection"+(groups[platform].length===1?"":"s")+"</span>";
    section.appendChild(heading);

    const cards=document.createElement("div");
    cards.className="cards";

    groups[platform].forEach(function(item){
      const el=document.createElement("article");
      el.className="card collection-card";
      const chips=(item.instruments||[]).map(function(x){return '<span class="chip">'+escapeHtml(x)+'</span>';}).join("");
      const otherPlatforms=(item.platforms||[]).filter(function(x){return x!==platform;}).map(function(x){return '<span class="chip">'+escapeHtml(x)+'</span>';}).join("");
      const level=item.processing_level?'<span class="chip">Level '+escapeHtml(item.processing_level)+'</span>':"";

      el.innerHTML='<h3>'+escapeHtml(item.title||item.short_name||item.concept_id)+'</h3><div class="meta"><span class="chip satellite-chip">'+escapeHtml(platform)+'</span>'+otherPlatforms+chips+level+'</div><p>'+escapeHtml(item.abstract||"No abstract supplied by CMR.")+'</p><p><strong>'+escapeHtml(item.short_name||"")+'</strong> '+(item.version?"· v"+escapeHtml(item.version):"")+'<br>'+escapeHtml(item.temporal_start||"")+(item.temporal_end?" → "+escapeHtml(item.temporal_end):"")+'</p><button class="secondary">Select collection</button>';

      el.querySelector("button").onclick=function(){
        selectedCollection=item;
        root.querySelectorAll(".collection-card").forEach(function(x){x.classList.remove("selected");});
        el.classList.add("selected");
        $("selectedCollection").innerHTML="<strong>"+escapeHtml(item.title||item.short_name||item.concept_id)+"</strong><br><span>"+escapeHtml(item.concept_id||"")+"</span><br><span>Satellite group: "+escapeHtml(platform)+"</span>";
        $("granulePanel").classList.remove("hidden");
        $("downloadCsv").disabled=true;
        currentGranules=[];
        $("granules").innerHTML="";
        $("granuleMessage").textContent="Collection selected. Click Find all granules.";
        $("granuleMessage").className="message success";
        $("granulePanel").scrollIntoView({behavior:"smooth",block:"start"});
      };

      cards.appendChild(el);
    });

    section.appendChild(cards);
    root.appendChild(section);
  });
}

function updateCollectionCount(filteredCount){
  const total=allCollections.length;
  const query=$("collectionResultSearch") ? $("collectionResultSearch").value.trim() : "";
  $("collectionCount").textContent=query
    ? filteredCount+" shown · "+total+" fetched"
    : total+" collections fetched";
}

function filterFetchedCollections(){
  const query=$("collectionResultSearch").value.trim().toLowerCase();
  if(!query){
    renderCollections(allCollections);
    updateCollectionCount(allCollections.length);
    return;
  }

  const terms=query.split(/\s+/).filter(Boolean);
  const filtered=allCollections.filter(function(item){
    const haystack=[
      item.title||"",
      item.short_name||"",
      item.concept_id||"",
      (item.platforms||[]).join(" "),
      (item.instruments||[]).join(" ")
    ].join(" ").toLowerCase();
    return terms.every(function(term){return haystack.indexOf(term)!==-1;});
  });

  renderCollections(filtered);
  updateCollectionCount(filtered.length);
}

$("collectionResultSearch").addEventListener("input",filterFetchedCollections);

$("findGranules").onclick=async function(){
  const button=$("findGranules"),msg=$("granuleMessage");if(!selectedCollection){toast("Select a NASA collection first.","error");return;}
  try{
    validateInputs(true);button.disabled=true;button.textContent="Searching granules…";
    const body={
      token:$("token").value.trim(),collection_id:selectedCollection.concept_id,bbox:bbox(),date_range:dates(),
      platform:csvList($("platformFilter").value)[0]||null,instrument:csvList($("instrumentFilter").value)[0]||null,
      fallback_latest:$("fallbackLatest").checked
    };
    const data=await api("/api/granules/search",body,false);
    currentGranules=data.items||[];
    currentGranuleCycle=data.granule_cycle||null;
    renderGranules(currentGranules);

    const cycleText=currentGranuleCycle&&currentGranuleCycle.label
      ?" Granule cadence estimate: "+currentGranuleCycle.label+" ("+(currentGranuleCycle.detail||currentGranuleCycle.basis||"based on granule start timestamps")+")."
      :"";

    if(data.fallback_used){msg.className="message warn";msg.textContent=(data.fallback_reason||"Requested dates were empty, so the newest available granules were used.")+cycleText;}
    else if(currentGranules.length){msg.className="message success";msg.textContent="Loaded all "+currentGranules.length+" downloadable granule(s) available in the requested date range."+cycleText;}
    else{msg.className="message error";msg.textContent="No downloadable granules were found.";}
    $("downloadCsv").disabled=!currentGranules.length;
  }catch(e){msg.className="message error";msg.textContent=e.message;}
  finally{button.disabled=false;button.textContent="Find all granules";}
};

function renderGranules(items){
  const root=$("granules");root.innerHTML="";
  items.forEach(function(item){
    const el=document.createElement("div");el.className="granule";
    const start=item.begin||"time unknown";
    const end=item.end||"time unknown";
    el.innerHTML="<strong>"+escapeHtml(item.granule_ur||item.concept_id||"Granule")+"</strong><span><b>Start UTC:</b> "+escapeHtml(start)+"<br><b>End UTC:</b> "+escapeHtml(end)+"</span><span>"+escapeHtml((item.platforms||[]).join(", ")||"platform unknown")+"</span><span>"+(item.size_mb?escapeHtml(String(item.size_mb))+" MB":"")+"</span>";
    root.appendChild(el);
  });
}

$("downloadCsv").onclick=async function(){
  if(!selectedCollection||!currentGranules.length){toast("Find all granules first.","error");return;}
  const button=$("downloadCsv");
  const msg=$("granuleMessage");

  let writer=null;
  let usingFileWriter=false;

  try{
    validateInputs(true);

    let name=$("outputName").value.trim()||slug(searchLabel())+"_earthdata.csv";
    if(!name.toLowerCase().endsWith(".csv")) name+=".csv";

    if("showSaveFilePicker" in window){
      try{
        const handle=await window.showSaveFilePicker({
          suggestedName:name,
          types:[{description:"CSV file",accept:{"text/csv":[".csv"]}}]
        });
        writer=await handle.createWritable();
        usingFileWriter=true;
      }catch(e){
        if(e&&e.name==="AbortError") return;
        writer=null;
        usingFileWriter=false;
      }
    }

    button.disabled=true;

    const baseBody={
      token:$("token").value.trim(),
      component:$("component").value.trim(),
      collection_search_name:$("collectionResultSearch").value.trim()||null,
      collection_id:selectedCollection.concept_id,
      collection_title:selectedCollection.title||selectedCollection.short_name||null,
      bbox:bbox(),
      date_range:dates(),
      platform:csvList($("platformFilter").value)[0]||null,
      instrument:csvList($("instrumentFilter").value)[0]||null,
      fallback_latest:$("fallbackLatest").checked,
      variable_filters:csvList($("variableFilters").value),
      output_name:null,
      max_rows_per_variable:Number($("maxRows").value)||0
    };

    let header=null;
    const parts=[];
    const failures=[];
    let totalRows=0;
    let convertedGranules=0;

    for(let i=0;i<currentGranules.length;i++){
      const granule=currentGranules[i];
      const label=granule.granule_ur||granule.concept_id||("granule "+(i+1));
      button.textContent="Converting "+(i+1)+"/"+currentGranules.length+"…";
      msg.className="message";
      msg.textContent="Downloading and converting "+(i+1)+" of "+currentGranules.length+": "+label;

      if(!granule.concept_id){
        failures.push(label+": missing CMR granule ID");
        continue;
      }

      try{
        const response=await apiResponseWithRetry("/api/download/nasa/granule",{
          ...baseBody,
          granule_id:granule.concept_id,
          cycle_label:currentGranuleCycle&&currentGranuleCycle.label?currentGranuleCycle.label:null,
          cycle_interval_seconds:currentGranuleCycle&&currentGranuleCycle.interval_seconds!=null?currentGranuleCycle.interval_seconds:null,
          cycle_detail:currentGranuleCycle&&currentGranuleCycle.detail?currentGranuleCycle.detail:null,
          cycle_basis:currentGranuleCycle&&currentGranuleCycle.basis?currentGranuleCycle.basis:null
        },3);

        const text=await response.text();
        const chunk=splitCsvHeader(text);
        if(!chunk.header) throw new Error("Converted granule returned an empty CSV.");

        if(header===null){
          header=chunk.header;
          if(usingFileWriter) await writer.write(header+"\n");
          else parts.push(header+"\n");
        }else if(chunk.header!==header){
          throw new Error("CSV schema differs from earlier granules in this collection.");
        }

        if(chunk.body){
          const bodyText=chunk.body+(chunk.body.endsWith("\n")?"":"\n");
          if(usingFileWriter) await writer.write(bodyText);
          else parts.push(bodyText);
        }

        const rows=Number(response.headers.get("X-Earthdata-Rows")||0);
        if(Number.isFinite(rows)) totalRows+=rows;
        convertedGranules++;
      }catch(e){
        failures.push(label+": "+(e&&e.message?e.message:String(e)));
      }
    }

    if(!header || convertedGranules===0){
      if(writer&&typeof writer.abort==="function") await writer.abort();
      writer=null;
      const details=failures.slice(0,3).join(" | ");
      throw new Error("No granules could be converted."+ (details?" "+details:""));
    }

    if(usingFileWriter){
      await writer.close();
      writer=null;
    }else{
      const blob=new Blob(parts,{type:"text/csv;charset=utf-8"});
      downloadBlob(blob,name);
    }

    const skipped=failures.length;
    msg.className=skipped?"message warn":"message success";
    msg.textContent="Converted "+convertedGranules+" of "+currentGranules.length+
      " granule(s) into one CSV"+(totalRows?" with "+totalRows+" rows.":".")+
      (skipped?" "+skipped+" granule(s) were skipped after retries. "+failures.slice(0,2).join(" | "):"");
    toast(skipped?"CSV created with some skipped granules.":"Combined CSV created successfully.",skipped?"warn":"");
  }catch(e){
    if(writer){
      try{
        if(typeof writer.abort==="function") await writer.abort();
        else await writer.close();
      }catch(_){}
      writer=null;
    }
    msg.className="message error";
    msg.textContent=e.message;
    toast(e.message,"error");
  }finally{
    button.disabled=false;
    button.textContent="Download combined CSV";
  }
};


function renderExternal(items){
  if(!items.length) return;$("externalArea").classList.remove("hidden");const root=$("externalCards");root.innerHTML="";
  items.forEach(function(item){
    const el=document.createElement("article");el.className="card";
    el.innerHTML="<h3>"+escapeHtml(item.provider)+"</h3><div class='meta'><span class='chip'>"+escapeHtml(item.variable)+"</span></div><p>"+escapeHtml(item.description)+"</p><button class='secondary'>Fetch external CSV</button>";
    el.querySelector("button").onclick=function(){downloadExternal(item,el.querySelector("button"));};root.appendChild(el);
  });
}

async function downloadExternal(item,button){
  try{
    validateInputs(false);button.disabled=true;button.textContent="Fetching…";
    const body={component:$("component").value.trim(),bbox:bbox(),date_range:dates(),grid_points_per_axis:3,output_name:$("outputName").value.trim()||null};
    const blob=await api("/api/download/external/"+item.id,body,true);
    let name=$("outputName").value.trim()||slug($("component").value)+"_"+item.id+".csv";if(!name.toLowerCase().endsWith(".csv")) name+=".csv";
    downloadBlob(blob,name);toast("CSV created from "+item.provider+" with explicit UTC timestamps and data-cycle metadata.");
  }catch(e){toast(e.message,"error");}
  finally{button.disabled=false;button.textContent="Fetch external CSV";}
}
setDefaultDates();health();
