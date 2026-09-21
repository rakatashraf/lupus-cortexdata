const $ = id => document.getElementById(id);
let selectedCollections = new Map();
let currentGranules = [];
let currentGranuleCycle = null;
let allCollections = [];
let visibleCollections = [];

function toast(message, kind){
  const el=$("toast");
  el.textContent=message;
  el.className="toast show"+(kind?" "+kind:"");
  clearTimeout(window.__toastTimer);
  window.__toastTimer=setTimeout(function(){el.className="toast";},3200);
}
function csvList(value){return (value||"").split(",").map(function(x){return x.trim();}).filter(Boolean);}
function multiList(value){
  const out=[],seen=new Set();
  String(value||"").split(/[;,\n\r]+/).forEach(function(raw){
    const item=raw.trim();
    const key=item.toLowerCase();
    if(item&&!seen.has(key)){seen.add(key);out.push(item);}
  });
  return out;
}
function componentValues(){return multiList($("component").value);}
function bbox(){return {south:Number($("south").value),west:Number($("west").value),north:Number($("north").value),east:Number($("east").value)};}
function dates(){return {start:$("startDate").value,end:$("endDate").value};}
function searchLabel(){
  const values=componentValues();
  if(!values.length) return "earthdata";
  if(values.length<=3) return values.join("_");
  return values.slice(0,3).join("_")+"_plus_"+(values.length-3);
}
function validateInputs(requireToken){
  if(requireToken && !$("token").value.trim()) throw new Error("Paste your Earthdata token first.");
  if(!componentValues().length) throw new Error("Enter at least one component or variable.");
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

const FIXED_EXPORT_COLUMNS=[
  "component_segment","component_primary","component_names","component_count",
  "collection_segment_key","collection_id","collection_short_name","collection_title",
  "collection_version","collection_provider","collection_processing_level",
  "granule_id","granule_ur","granule_production_date_utc","granule_size_mb",
  "conversion_status","conversion_error","raw_download_url",
  "source","source_agency","source_provider","source_satellite","source_instrument",
  "satellite_platform","instrument","data_timestamp_utc","data_date_utc","data_time_utc",
  "timestamp_status","timestamp_source","timestamp_timezone","granule_start_utc",
  "granule_end_utc","retrieved_at_utc","data_cycle","data_cycle_interval_seconds",
  "data_cycle_detail","data_cycle_basis","timestamp_epoch_seconds","year","month","day",
  "day_of_year","hour","minute","weekday","hour_sin","hour_cos","day_of_year_sin",
  "day_of_year_cos","month_sin","month_cos","latitude","longitude","spatial_cell_id",
  "coordinate_status","coordinate_crs","variable","value","value_numeric","unit",
  "weight","weight_numeric","sample_weight","sample_weight_source","weight_unit",
  "weight_variable","series_id","sequence_id","sequence_order","training_row_usable",
  "training_exclude_reason","model_feature_schema_version","hdf_grid",
  "spatial_resolution_degrees","observation_time","granule_begin","granule_end",
  "component_query","collection_search_name","original_file","download_url",
  "extra_attributes_json"
]

function csvEscape(value){
  const text=String(value==null?"":value);
  return /[",\n\r]/.test(text)?'"'+text.replace(/"/g,'""')+'"':text;
}

function localFailureCsv(granule,errorText){
  const components=(granule._matched_components&&granule._matched_components.length)
    ?granule._matched_components:componentValues();
  const begin=granule.begin||"";
  const date=begin?String(begin).slice(0,10):"";
  const time=begin&&String(begin).length>=19?String(begin).slice(11,19):"";
  const firstUrl=(granule.download_urls&&granule.download_urls.length)
    ?granule.download_urls[0]:(granule.primary_url||"");

  const row={
    component_segment:components[0]||"",
    component_primary:components[0]||"",
    component_names:components.join(";"),
    component_count:components.length,
    collection_segment_key:[
      granule._collection_short_name||"",
      granule._collection_version||"",
      granule._collection_id||""
    ].filter(Boolean).join("|"),
    collection_id:granule._collection_id||"",
    collection_short_name:granule._collection_short_name||"",
    collection_title:granule._collection_title||"",
    collection_version:granule._collection_version||"",
    collection_provider:granule._collection_provider||"",
    collection_processing_level:granule._collection_processing_level||"",
    granule_id:granule.concept_id||"",
    granule_ur:granule.granule_ur||"",
    granule_production_date_utc:granule.production_date||"",
    granule_size_mb:granule.size_mb==null?"":granule.size_mb,
    conversion_status:"request_failed",
    conversion_error:errorText,
    raw_download_url:firstUrl,
    timestamp_epoch_seconds:begin?Math.floor(Date.parse(begin)/1000):"",
    year:begin?new Date(begin).getUTCFullYear():"",
    month:begin?new Date(begin).getUTCMonth()+1:"",
    day:begin?new Date(begin).getUTCDate():"",
    day_of_year:"",
    hour:begin?new Date(begin).getUTCHours():"",
    minute:begin?new Date(begin).getUTCMinutes():"",
    weekday:begin?new Date(begin).getUTCDay():"",
    spatial_cell_id:"nonspatial",
    value_numeric:"",
    weight_numeric:"",
    sample_weight:0,
    sample_weight_source:"not_applicable",
    series_id:(components[0]||"")+"|"+(granule._collection_id||"")+"|__conversion_status__|nonspatial",
    sequence_id:(components[0]||"")+"|"+(granule._collection_id||"")+"|__conversion_status__|nonspatial",
    sequence_order:begin?Math.floor(Date.parse(begin)/1000):"",
    training_row_usable:false,
    training_exclude_reason:"request_failed",
    model_feature_schema_version:"lupus-cortex-training-v1",
    source:"NASA Earthdata",
    source_agency:"NASA",
    source_provider:granule._collection_provider||"",
    source_satellite:(granule.platforms||[]).join(";"),
    source_instrument:(granule.instruments||[]).join(";"),
    satellite_platform:(granule.platforms||[]).join(";"),
    instrument:(granule.instruments||[]).join(";"),
    data_timestamp_utc:begin,
    data_date_utc:date,
    data_time_utc:time,
    timestamp_status:begin?"available":"not_available_in_source_row",
    timestamp_source:begin?"granule_begin":"unavailable",
    timestamp_timezone:"UTC",
    granule_start_utc:begin,
    granule_end_utc:granule.end||"",
    data_cycle:granule._granule_cycle&&granule._granule_cycle.label?granule._granule_cycle.label:"",
    data_cycle_interval_seconds:granule._granule_cycle&&granule._granule_cycle.interval_seconds!=null?granule._granule_cycle.interval_seconds:"",
    data_cycle_detail:granule._granule_cycle&&granule._granule_cycle.detail?granule._granule_cycle.detail:"",
    data_cycle_basis:granule._granule_cycle&&granule._granule_cycle.basis?granule._granule_cycle.basis:"",
    coordinate_status:"not_available_due_to_request_failure",
    variable:"__conversion_status__",
    value:"",
    unit:"",
    granule_begin:begin,
    granule_end:granule.end||"",
    component_query:components.join("; "),
    download_url:firstUrl,
    extra_attributes_json:""
  };
  const header=FIXED_EXPORT_COLUMNS.join(",");
  const body=FIXED_EXPORT_COLUMNS.map(function(column){return csvEscape(row[column]||"");}).join(",");
  return header+"\n"+body+"\n";
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
  msg.className="message";msg.textContent="";selectedCollections.clear();currentGranules=[];currentGranuleCycle=null;allCollections=[];visibleCollections=[];
  $("collectionPanel").classList.add("hidden");$("granulePanel").classList.add("hidden");$("externalArea").classList.add("hidden");
  try{
    validateInputs(true);button.disabled=true;button.textContent="Searching NASA…";
    const body={
      token:$("token").value.trim(),
      component:componentValues().join(", "),
      components:componentValues(),
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
      msg.textContent="NASA collections found for "+componentValues().length+" component(s). Select as many collections as you need.";
    }
    else{
      msg.className="message warn";
      msg.textContent="No NASA collection matched these filters. Public fallback sources are shown when a mapping exists.";
    }
    renderExternal(data.external_candidates||[]);
  }catch(e){msg.className="message error";msg.textContent=e.message;}
  finally{button.disabled=false;button.textContent="Search Earthdata";}
};

function syncCollectionSelectionUI(){
  const root=$("collections");
  root.querySelectorAll(".collection-card").forEach(function(card){
    const id=card.dataset.collectionId||"";
    const selected=selectedCollections.has(id);
    card.classList.toggle("selected",selected);
    const button=card.querySelector(".collection-toggle");
    if(button){
      button.textContent=selected?"Selected ✓":"Select collection";
      button.classList.toggle("primary",selected);
      button.classList.toggle("secondary",!selected);
    }
  });
  updateSelectedCollectionSummary();
}

function updateSelectedCollectionSummary(){
  const items=Array.from(selectedCollections.values());
  $("selectedCollectionCount").textContent=items.length+" selected";
  if(!items.length){
    $("selectedCollection").innerHTML="No collections selected yet.";
    $("granulePanel").classList.add("hidden");
    return;
  }

  const pills=items.slice(0,20).map(function(item){
    return '<span class="selected-collection-pill">'+escapeHtml(item.short_name||item.title||item.concept_id)+'</span>';
  }).join("");
  const more=items.length>20?'<span class="selected-collection-pill">+'+(items.length-20)+' more</span>':"";
  $("selectedCollection").innerHTML="<strong>"+items.length+" collection"+(items.length===1?"":"s")+" selected</strong>"+
    '<div class="selected-collection-list">'+pills+more+"</div>";
  $("granulePanel").classList.remove("hidden");
  $("downloadCsv").disabled=true;
  currentGranules=[];
  $("granules").innerHTML="";
  $("granuleMessage").textContent="Selection updated. Click Find all granules.";
  $("granuleMessage").className="message success";
}

function renderCollections(items){
  visibleCollections=items.slice();
  const root=$("collections");root.innerHTML="";
  if(!items.length){
    root.innerHTML='<div class="card"><h3>No NASA collection matched</h3><p>Try a broader component term, remove the platform/instrument filter, or use a public fallback below.</p></div>';
    updateSelectedCollectionSummary();
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
      el.dataset.collectionId=item.concept_id||"";
      const chips=(item.instruments||[]).map(function(x){return '<span class="chip">'+escapeHtml(x)+'</span>';}).join("");
      const otherPlatforms=(item.platforms||[]).filter(function(x){return x!==platform;}).map(function(x){return '<span class="chip">'+escapeHtml(x)+'</span>';}).join("");
      const level=item.processing_level?'<span class="chip">Level '+escapeHtml(item.processing_level)+'</span>':"";
      const matches=(item.matched_components||[]).map(function(x){return '<span class="chip">'+escapeHtml(x)+'</span>';}).join("");

      el.innerHTML='<h3>'+escapeHtml(item.title||item.short_name||item.concept_id)+'</h3>'+
        '<div class="meta"><span class="chip satellite-chip">'+escapeHtml(platform)+'</span>'+otherPlatforms+chips+level+'</div>'+
        (matches?'<div class="component-matches"><span class="satellite-label">MATCHED COMPONENTS</span><div class="meta">'+matches+'</div></div>':"")+
        '<p>'+escapeHtml(item.abstract||"No abstract supplied by CMR.")+'</p>'+
        '<p><strong>'+escapeHtml(item.short_name||"")+'</strong> '+(item.version?"· v"+escapeHtml(item.version):"")+'<br>'+
        escapeHtml(item.temporal_start||"")+(item.temporal_end?" → "+escapeHtml(item.temporal_end):"")+'</p>'+
        '<button class="secondary collection-toggle">Select collection</button>';

      el.querySelector(".collection-toggle").onclick=function(){
        const id=item.concept_id||"";
        if(selectedCollections.has(id)) selectedCollections.delete(id);
        else selectedCollections.set(id,item);
        syncCollectionSelectionUI();
      };

      cards.appendChild(el);
    });

    section.appendChild(cards);
    root.appendChild(section);
  });

  syncCollectionSelectionUI();
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
      (item.instruments||[]).join(" "),
      (item.matched_components||[]).join(" ")
    ].join(" ").toLowerCase();
    return terms.every(function(term){return haystack.indexOf(term)!==-1;});
  });

  renderCollections(filtered);
  updateCollectionCount(filtered.length);
}

$("collectionResultSearch").addEventListener("input",filterFetchedCollections);
$("selectAllShown").onclick=function(){
  visibleCollections.forEach(function(item){
    if(item.concept_id) selectedCollections.set(item.concept_id,item);
  });
  syncCollectionSelectionUI();
};
$("clearSelectedCollections").onclick=function(){
  selectedCollections.clear();
  syncCollectionSelectionUI();
};


$("findGranules").onclick=async function(){
  const button=$("findGranules"),msg=$("granuleMessage");
  const collections=Array.from(selectedCollections.values());
  if(!collections.length){toast("Select at least one NASA collection first.","error");return;}

  try{
    validateInputs(true);
    button.disabled=true;
    button.textContent="Searching "+collections.length+" collection(s)…";
    currentGranules=[];
    currentGranuleCycle=null;

    const jobs=collections.map(async function(collection){
      const body={
        token:$("token").value.trim(),
        collection_id:collection.concept_id,
        bbox:bbox(),
        date_range:dates(),
        platform:csvList($("platformFilter").value)[0]||null,
        instrument:csvList($("instrumentFilter").value)[0]||null,
        fallback_latest:$("fallbackLatest").checked
      };
      const response=await apiResponseWithRetry("/api/granules/search",body,3);
      return {collection:collection,data:await response.json()};
    });

    const settled=await Promise.allSettled(jobs);
    const failures=[];
    let fallbackCollections=0;
    const seen=new Set();

    settled.forEach(function(result){
      if(result.status!=="fulfilled"){
        failures.push(result.reason&&result.reason.message?result.reason.message:String(result.reason));
        return;
      }

      const collection=result.value.collection;
      const data=result.value.data||{};
      if(data.fallback_used) fallbackCollections++;
      const cycle=data.granule_cycle||null;

      (data.items||[]).forEach(function(raw){
        const item={...raw};
        const key=collection.concept_id+"::"+(item.concept_id||item.granule_ur||Math.random());
        if(seen.has(key)) return;
        seen.add(key);
        item._collection_id=collection.concept_id;
        item._collection_title=collection.title||collection.short_name||collection.concept_id;
        item._collection_short_name=collection.short_name||"";
        item._collection_version=collection.version||"";
        item._collection_provider=collection.provider||"";
        item._collection_processing_level=collection.processing_level||"";
        item._matched_components=(collection.matched_components&&collection.matched_components.length)
          ?collection.matched_components.slice():componentValues().slice();
        item._granule_cycle=cycle;
        currentGranules.push(item);
      });
    });

    renderGranules(currentGranules);
    if(currentGranules.length){
      msg.className=failures.length||fallbackCollections?"message warn":"message success";
      msg.textContent="Loaded "+currentGranules.length+" granule(s) across "+collections.length+" selected collection(s)."+
        (fallbackCollections?" "+fallbackCollections+" collection(s) used most-recent fallback dates.":"")+
        (failures.length?" "+failures.length+" collection search(es) failed after retries.":"");
    }else{
      msg.className="message error";
      msg.textContent="No downloadable granules were found across the selected collections."+
        (failures.length?" "+failures.slice(0,2).join(" | "):"");
    }
    $("downloadCsv").disabled=!currentGranules.length;
  }catch(e){
    msg.className="message error";msg.textContent=e.message;
  }finally{
    button.disabled=false;button.textContent="Find all granules";
  }
};


function renderGranules(items){
  const root=$("granules");root.innerHTML="";
  items.forEach(function(item){
    const el=document.createElement("div");el.className="granule";
    const start=item.begin||"time unknown";
    const end=item.end||"time unknown";
    const origin=item._collection_short_name||item._collection_title||item._collection_id||"collection unknown";
    const components=(item._matched_components||[]).join(", ");
    el.innerHTML="<strong>"+escapeHtml(item.granule_ur||item.concept_id||"Granule")+"</strong>"+
      "<span><b>Start UTC:</b> "+escapeHtml(start)+"<br><b>End UTC:</b> "+escapeHtml(end)+"</span>"+
      "<span class='collection-origin'><b>"+escapeHtml(origin)+"</b>"+(components?"<br>"+escapeHtml(components):"")+"</span>"+
      "<span>"+(item.size_mb?escapeHtml(String(item.size_mb))+" MB":"")+"</span>";
    root.appendChild(el);
  });
}


function formatEta(seconds){
  if(!Number.isFinite(seconds)||seconds<0) return "calculating…";
  if(seconds<60) return Math.max(1,Math.round(seconds))+"s";
  const m=Math.floor(seconds/60);
  const s=Math.round(seconds%60);
  return m+"m "+s+"s";
}

$("downloadCsv").onclick=async function(){
  if(!selectedCollections.size||!currentGranules.length){toast("Find all granules first.","error");return;}
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
      component:componentValues().join("; "),
      collection_search_name:null,
      collection_id:"",
      collection_title:"",
      bbox:bbox(),
      date_range:dates(),
      platform:csvList($("platformFilter").value)[0]||null,
      instrument:csvList($("instrumentFilter").value)[0]||null,
      fallback_latest:$("fallbackLatest").checked,
      variable_filters:csvList($("variableFilters").value),
      output_name:null,
      max_rows_per_variable:Number($("maxRows").value)||0
    };

    const total=currentGranules.length;
    const started=performance.now();
    let completed=0;
    let convertedGranules=0;
    let representedGranules=0;
    let totalRows=0;
    let totalBackendMs=0;
    let backendSamples=0;
    let header=null;
    let writeQueue=Promise.resolve();
    const failures=[];
    const parts=[];

    function queueCsv(text){
      const chunk=splitCsvHeader(text);
      if(!chunk.header) throw new Error("Converted granule returned an empty CSV.");

      if(header===null){
        header=chunk.header;
        if(usingFileWriter){
          writeQueue=writeQueue.then(function(){return writer.write(header+"\n");});
        }else{
          parts.push(header+"\n");
        }
      }else if(chunk.header!==header){
        throw new Error("CSV schema differs from earlier granules in this collection.");
      }

      if(chunk.body){
        const bodyText=chunk.body+(chunk.body.endsWith("\n")?"":"\n");
        if(usingFileWriter){
          writeQueue=writeQueue.then(function(){return writer.write(bodyText);});
        }else{
          parts.push(bodyText);
        }
      }
    }

    function updateProgress(){
      const elapsed=Math.max(0.001,(performance.now()-started)/1000);
      const rate=completed/elapsed;
      const remaining=total-completed;
      const eta=rate>0?remaining/rate:Infinity;
      const avgBackend=backendSamples?Math.round(totalBackendMs/backendSamples):null;
      button.textContent="Converting "+completed+"/"+total+"…";
      msg.className="message";
      msg.textContent="Full parallel mode: "+completed+"/"+total+
        " processed · "+total+" requests launched together · "+
        rate.toFixed(rate>=10?1:2)+" granules/s · ETA "+formatEta(eta)+
        (avgBackend!==null?" · avg backend "+avgBackend+"ms":"");
    }

    updateProgress();

    const tasks=currentGranules.map(async function(granule,i){
      const label=granule.granule_ur||granule.concept_id||("granule "+(i+1));

      if(!granule.concept_id){
        failures.push(label+": missing CMR granule ID");
        completed++;
        updateProgress();
        return;
      }

      try{
        const response=await apiResponseWithRetry("/api/download/nasa/granule",{
          ...baseBody,
          component:(granule._matched_components&&granule._matched_components.length)
            ?granule._matched_components.join("; "):componentValues().join("; "),
          collection_id:granule._collection_id||"",
          collection_short_name:granule._collection_short_name||"",
          collection_title:granule._collection_title||granule._collection_short_name||"",
          collection_version:granule._collection_version||"",
          collection_provider:granule._collection_provider||"",
          collection_processing_level:granule._collection_processing_level||"",
          granule_id:granule.concept_id,
          granule_ur:granule.granule_ur||null,
          begin:granule.begin||null,
          end:granule.end||null,
          production_date:granule.production_date||null,
          size_mb:granule.size_mb!=null?Number(granule.size_mb):null,
          platforms:Array.isArray(granule.platforms)?granule.platforms:[],
          instruments:Array.isArray(granule.instruments)?granule.instruments:[],
          download_urls:Array.isArray(granule.download_urls)?granule.download_urls:[],
          primary_url:granule.primary_url||null,
          cycle_label:granule._granule_cycle&&granule._granule_cycle.label?granule._granule_cycle.label:null,
          cycle_interval_seconds:granule._granule_cycle&&granule._granule_cycle.interval_seconds!=null?granule._granule_cycle.interval_seconds:null,
          cycle_detail:granule._granule_cycle&&granule._granule_cycle.detail?granule._granule_cycle.detail:null,
          cycle_basis:granule._granule_cycle&&granule._granule_cycle.basis?granule._granule_cycle.basis:null
        },2);

        const text=await response.text();
        queueCsv(text);
        representedGranules++;

        const rows=Number(response.headers.get("X-Earthdata-Rows")||0);
        if(Number.isFinite(rows)) totalRows+=rows;

        const conversionErrors=Number(response.headers.get("X-Earthdata-Conversion-Errors")||0);
        const backendMs=Number(response.headers.get("X-Earthdata-Processing-Ms")||0);
        if(Number.isFinite(backendMs)&&backendMs>0){
          totalBackendMs+=backendMs;
          backendSamples++;
        }

        if(conversionErrors>0){
          failures.push(label+": conversion failed; manifest row included in CSV");
        }else{
          convertedGranules++;
        }
      }catch(e){
        const errorText=e&&e.message?e.message:String(e);
        failures.push(label+": "+errorText);
        try{
          queueCsv(localFailureCsv(granule,errorText));
          representedGranules++;
        }catch(_){}
      }finally{
        completed++;
        updateProgress();
      }
    });

    await Promise.all(tasks);
    await writeQueue;

    if(!header || representedGranules===0){
      if(writer&&typeof writer.abort==="function") await writer.abort();
      writer=null;
      const details=failures.slice(0,3).join(" | ");
      throw new Error("No selected granules could be represented in the CSV."+ (details?" "+details:""));
    }

    if(usingFileWriter){
      await writer.close();
      writer=null;
    }else{
      const blob=new Blob(parts,{type:"text/csv;charset=utf-8"});
      downloadBlob(blob,name);
    }

    const elapsed=Math.max(0.001,(performance.now()-started)/1000);
    const rate=convertedGranules/elapsed;
    const avgBackend=backendSamples?Math.round(totalBackendMs/backendSamples):null;
    const skipped=failures.length;
    msg.className=skipped?"message warn":"message success";
    msg.textContent="Converted "+convertedGranules+" of "+total+
      " granule(s); represented "+representedGranules+" in the CSV in "+elapsed.toFixed(1)+"s"+
      " ("+rate.toFixed(rate>=10?1:2)+" granules/s)"+
      (avgBackend!==null?" · avg backend "+avgBackend+"ms":"")+
      (totalRows?" · "+totalRows+" CSV rows":"")+
      (skipped?" · "+skipped+" skipped after retries. "+failures.slice(0,2).join(" | "):"");
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
