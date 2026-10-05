import fs from "node:fs";

const files=[
  ["v1","wind-wave-5km/index.html"],
  ["v2","wind-wave-5km-v2/index.html"],
  ["v3","wind-wave-5km-v3/index.html"],
  ["v3.2","wind-wave-1km-v32/index.html"]
];

let failed=false;
function fail(msg){console.error("FAIL:",msg);failed=true}
function ok(msg){console.log("OK:",msg)}

for(const [name,path] of files){
  if(!fs.existsSync(path)){fail(name+" missing: "+path);continue}
  const html=fs.readFileSync(path,"utf8");
  const m=html.match(/<script>([\s\S]*?)<\/script>/);
  if(!m){fail(name+" script tag missing");continue}
  try{new Function(m[1]);ok(name+" JavaScript syntax")}
  catch(e){fail(name+" JavaScript syntax: "+e.message)}

  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  const dup=[...new Set(ids.filter((x,i)=>ids.indexOf(x)!==i))];
  if(dup.length)fail(name+" duplicate ids: "+dup.join(","));
  else ok(name+" unique ids");

  const refs=[...html.matchAll(/\$\("([^"]+)"\)/g)].map(x=>x[1]);
  const missing=[...new Set(refs.filter(x=>!ids.includes(x)))];
  if(missing.length)fail(name+" missing DOM ids: "+missing.join(","));
  else ok(name+" DOM references");
}

const v3=fs.existsSync("wind-wave-5km-v3/index.html")
  ?fs.readFileSync("wind-wave-5km-v3/index.html","utf8"):"";
const required=[
  ["v3 badge",'class="versionBadge">v3'],
  ["timeout guard","function fetchWithTimeout"],
  ["request race guard","dataRequestSeq"],
  ["location race guard","locationRequestSeq"],
  ["forecast center-only","中心1地点・軽量モード"],
  ["comparison dedupe","getThreeModelComparison(ps,windPromise)"],
  ["map GPU drag",'style.transform="translate("+dx+"px,"+dy+"px)"'],
  ["tide pointer swipe",'panel.addEventListener("pointermove"'],
  ["JMA tide priority","JMA_TIDE_MAX_KM=45"],
  ["sea temperature","sea_surface_temperature"],
  ["offline hold",'オフライン：最後の表示を保持'],
  ["map focus button",'id="mapExpand"'],
  ["map focus mode","body.mapFocus"],
  ["mobile compact layout","@media (max-width:600px)"]
];
for(const [label,needle] of required){
  if(v3.includes(needle))ok(label); else fail(label+" missing");
}

const v32=fs.existsSync("wind-wave-1km-v32/index.html")
  ?fs.readFileSync("wind-wave-1km-v32/index.html","utf8"):"";
const requiredV32=[
  ["v3.2 badge",'class="versionBadge">v3.2'],
  ["dense model key","dense_1km"],
  ["dense grid generator","function dense1kmPoints()"],
  ["dense grid 7x7","for(let iy=-3;iy<=3;iy++)"],
  ["dense grid source disclosure","LFM 1km直結ではありません"],
  ["dense comparison guard",'if(modelInfo().dense1km)return;'],
  ["dense zoom floor",'modelInfo().dense1km&&zoom<13'],
  ["dense 49-point status","1km間隔49地点"]
];
for(const [label,needle] of requiredV32){
  if(v32.includes(needle))ok(label); else fail(label+" missing");
}

async function smokeDenseApi(){
  const c={lat:35.49,lng:135.74};
  const latStep=1/111.32;
  const lngStep=1/(111.32*Math.cos(c.lat*Math.PI/180));
  const ps=[c];
  for(let iy=-3;iy<=3;iy++)for(let ix=-3;ix<=3;ix++){
    if(ix===0&&iy===0)continue;
    ps.push({lat:c.lat+iy*latStep,lng:c.lng+ix*lngStep});
  }
  if(ps.length!==49){fail("dense grid point count: "+ps.length);return}

  const u=new URL("https://api.open-meteo.com/v1/forecast");
  u.searchParams.set("latitude",ps.map(p=>p.lat.toFixed(5)).join(","));
  u.searchParams.set("longitude",ps.map(p=>p.lng.toFixed(5)).join(","));
  u.searchParams.set("hourly","wind_speed_10m,wind_direction_10m");
  u.searchParams.set("forecast_hours","1");
  u.searchParams.set("models","jma_msm");
  u.searchParams.set("wind_speed_unit","ms");
  u.searchParams.set("timezone","Asia/Tokyo");

  let lastErr=null;
  for(let attempt=1;attempt<=2;attempt++){
    try{
      const r=await fetch(u,{signal:AbortSignal.timeout(15000)});
      if(!r.ok)throw new Error("HTTP "+r.status);
      const d=await r.json();
      const rows=Array.isArray(d)?d:[d];
      if(rows.length!==49)throw new Error("rows "+rows.length+" / 49");
      const valid=rows.filter(x=>{
        const h=x&&x.hourly||{};
        return Array.isArray(h.wind_speed_10m)&&Number.isFinite(h.wind_speed_10m[0])&&
          Array.isArray(h.wind_direction_10m)&&Number.isFinite(h.wind_direction_10m[0]);
      }).length;
      if(valid<45)throw new Error("valid wind rows "+valid+" / 49");
      ok("v3.2 JMA MSM 49-point live API ("+valid+"/49 valid)");
      return;
    }catch(e){
      lastErr=e;
      if(attempt<2)await new Promise(r=>setTimeout(r,1200));
    }
  }
  fail("v3.2 JMA MSM live API: "+(lastErr&&lastErr.message||lastErr));
}

await smokeDenseApi();

if(failed)process.exit(1);
console.log("Wind & Wave smoke checks passed");
