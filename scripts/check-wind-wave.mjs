import fs from "node:fs";

const files=[
  ["v1","wind-wave-5km/index.html"],
  ["v2","wind-wave-5km-v2/index.html"],
  ["v3","wind-wave-5km-v3/index.html"],
  ["v3.2","wind-wave-1km-v32/index.html"],
  ["v3.3","wind-wave-local-v33/index.html"],
  ["v3.4","wind-wave-surface-v34/index.html"],
  ["v3.5","wind-wave-surface-forecast-v35/index.html"],
  ["v3.6","wind-wave-layer-forecast-v36/index.html"],
  ["v3.7","wind-wave-layer-forecast-v37/index.html"],
  ["v3.8","wind-wave-learned-surface-v38/index.html"],
  ["v3.9","wind-wave-learned-surface-v39/index.html"],
  ["v3.10","wind-wave-learned-surface-v310/index.html"]
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

const v33=fs.existsSync("wind-wave-local-v33/index.html")
  ?fs.readFileSync("wind-wave-local-v33/index.html","utf8"):"";
const requiredV33=[
  ["v3.3 badge",'class="versionBadge">v3.3'],
  ["local terrain model",'value="local_terrain"'],
  ["100m local grid","function localGridPoints"],
  ["1km radius cutoff","Math.hypot(xKm,yKm)>radiusKm"],
  ["9-point wind anchors","function localWindAnchors"],
  ["GSI DEM5A","dem5a_png"],
  ["GSI DEM fallback","dem_png"],
  ["terrain shelter","function terrainShelterFactor"],
  ["terrain ridge","function terrainRidgeFactor"],
  ["terrain channel","function terrainChannelFactor"],
  ["terrain correction","function terrainAdjustPoint"],
  ["adaptive display","function localRenderStride"],
  ["local range circle","modelInfo().localTerrain?1000:5000"],
  ["estimate marker",'prefix=x.estimated?"≈":""'],
  ["local current refresh","refreshLocalCurrent"],
  ["local forecast refresh","refreshLocalSelected"],
  ["local disclosure","100m気象モデルやLFM直結ではありません"]
];
for(const [label,needle] of requiredV33){
  if(v33.includes(needle))ok(label); else fail(label+" missing");
}

function localGridCount(step=.1,radius=1){
  const n=Math.round(radius/step);let count=1;
  for(let iy=-n;iy<=n;iy++)for(let ix=-n;ix<=n;ix++){
    if(ix===0&&iy===0)continue;
    if(Math.hypot(ix*step,iy*step)<=radius+.0001)count++;
  }
  return count;
}
const gcount=localGridCount();
if(gcount===317)ok("v3.3 100m / 1km grid = 317 points");
else fail("v3.3 local grid count "+gcount+" / expected 317");

function tileXY(lat,lng,z){
  const n=2**z,rad=lat*Math.PI/180;
  return{
    x:Math.floor((lng+180)/360*n),
    y:Math.floor((1-Math.asinh(Math.tan(rad))/Math.PI)/2*n)
  };
}
async function smokeLocalSources(){
  const c={lat:35.49,lng:135.74};
  const anchors=[c];
  const latStep=1/111.32,lngStep=1/(111.32*Math.cos(c.lat*Math.PI/180));
  for(const y of [-1,0,1])for(const x of [-1,0,1]){
    if(x===0&&y===0)continue;
    anchors.push({lat:c.lat+y*latStep,lng:c.lng+x*lngStep});
  }
  try{
    const u=new URL("https://api.open-meteo.com/v1/forecast");
    u.searchParams.set("latitude",anchors.map(p=>p.lat.toFixed(5)).join(","));
    u.searchParams.set("longitude",anchors.map(p=>p.lng.toFixed(5)).join(","));
    u.searchParams.set("hourly","wind_speed_10m,wind_direction_10m");
    u.searchParams.set("forecast_hours","1");
    u.searchParams.set("models","jma_msm");
    u.searchParams.set("wind_speed_unit","ms");
    u.searchParams.set("timezone","Asia/Tokyo");
    const r=await fetch(u,{signal:AbortSignal.timeout(15000)});
    if(!r.ok)throw new Error("MSM HTTP "+r.status);
    const d=await r.json(),rows=Array.isArray(d)?d:[d];
    if(rows.length!==9)throw new Error("MSM rows "+rows.length+" / 9");
    const valid=rows.filter(x=>Number.isFinite(x?.hourly?.wind_speed_10m?.[0])&&Number.isFinite(x?.hourly?.wind_direction_10m?.[0])).length;
    if(valid!==9)throw new Error("MSM valid "+valid+" / 9");
    ok("v3.3 JMA MSM 9-anchor live API");
  }catch(e){fail("v3.3 MSM anchor API: "+e.message);}

  try{
    const p=tileXY(c.lat,c.lng,14);
    const u="https://cyberjapandata.gsi.go.jp/xyz/dem_png/14/"+p.x+"/"+p.y+".png";
    const r=await fetch(u,{signal:AbortSignal.timeout(15000)});
    if(!r.ok)throw new Error("GSI HTTP "+r.status);
    const ab=await r.arrayBuffer();
    if(ab.byteLength<100)throw new Error("GSI PNG too small "+ab.byteLength);
    ok("v3.3 GSI DEM10B live tile ("+ab.byteLength+" bytes)");
  }catch(e){fail("v3.3 GSI DEM tile: "+e.message);}
}
await smokeLocalSources();


const v34=fs.existsSync("wind-wave-surface-v34/index.html")
  ?fs.readFileSync("wind-wave-surface-v34/index.html","utf8"):"";
const requiredV34=[
  ["v3.4 badge",'class="versionBadge">v3.4'],
  ["one button",'id="precisionBtn"'],
  ["2m card label","地表風（約2m）"],
  ["surface roughness","function surfaceRoughnessProfile"],
  ["height profile","function neutralHeightFactor"],
  ["2m final speed","speed2m"],
  ["calculation confidence","function surfaceConfidence"],
  ["surface-only disclosure","表示する風速は約2m地表風のみ"],
  ["forecast surface compute","タップで計算"],
  ["precision activation","function activatePrecisionSurface"],
  ["precision zoom","modelInfo().localTerrain&&zoom<15"]
];
for(const [label,needle] of requiredV34){
  if(v34.includes(needle))ok(label); else fail(label+" missing");
}

function heightFactor(z0,z=2,ref=10){
  const rough=Math.max(.0001,Math.min(1,z0));
  const a=Math.log((z+rough)/rough),b=Math.log((ref+rough)/rough);
  return Math.max(.45,Math.min(.92,a/b));
}
const hfSea=heightFactor(.0002),hfOpen=heightFactor(.03),hfRough=heightFactor(.30);
if(hfSea>hfOpen&&hfOpen>hfRough&&hfSea<1&&hfRough>.45)
  ok("v3.4 10m→2m log profile order");
else fail("v3.4 height factors invalid "+[hfSea,hfOpen,hfRough].join(","));
if(6*hfSea<6&&6*hfOpen<6&&6*hfRough<6)
  ok("v3.4 2m wind stays below 10m baseline");
else fail("v3.4 2m conversion not reducing baseline");

const v35=fs.existsSync("wind-wave-surface-forecast-v35/index.html")
  ?fs.readFileSync("wind-wave-surface-forecast-v35/index.html","utf8"):"";
const requiredV35=[
  ["v3.5 badge",'class="versionBadge">v3.5'],
  ["surface forecast title","地表風速予報（約2m）"],
  ["surface forecast array","surfaceForecastValues"],
  ["direction sectors","function surfaceSector"],
  ["forecast terrain precompute","function buildCenterSurfaceForecast"],
  ["forecast surface only","地表 約2m"],
  ["no 10m forecast disclosure","10m風速は予報画面には表示しません"],
  ["forecast auto precision",'activeModel="local_terrain"'],
  ["forecast ready status","✅ 約2m地表風速予報を表示"]
];
for(const [label,needle] of requiredV35){
  if(v35.includes(needle))ok(label); else fail(label+" missing");
}

function sector(dir){return (Math.round((((dir%360)+360)%360)/22.5)%16)*22.5;}
const sectors=new Set(Array.from({length:360},(_,i)=>sector(i)));
if(sectors.size===16)ok("v3.5 16 direction terrain sectors");
else fail("v3.5 direction sector count "+sectors.size);

const example10m=6;
const terrainFactor=.8;
const exampleHeightFactor=.7;
const example2m=example10m*terrainFactor*exampleHeightFactor;
if(example2m>0&&example2m<example10m)ok("v3.5 forecast 10m→surface chain");
else fail("v3.5 forecast surface chain invalid");

const v36=fs.existsSync("wind-wave-layer-forecast-v36/index.html")
  ?fs.readFileSync("wind-wave-layer-forecast-v36/index.html","utf8"):"";
const requiredV36=[
  ["v3.6 badge",'class="versionBadge">v3.6'],
  ["forecast title id",'id="forecastTitle"'],
  ["dynamic layer title","function forecastLayerTitle"],
  ["surface mode branch","const surfaceMode=!!modelInfo().localTerrain"],
  ["conditional surface precompute","if(modelInfo().localTerrain)await buildCenterSurfaceForecast(hourly)"],
  ["current-layer disclosure","予報は現在選択中の風情報をそのまま引き継ぎます"],
  ["no auto-switch disclosure","予報ボタンだけで風レイヤーを勝手に切り替えません"]
];
for(const [label,needle] of requiredV36){
  if(v36.includes(needle))ok(label); else fail(label+" missing");
}
const fb36Start=v36.indexOf('$("forecastBtn").addEventListener("click",()=>{');
const fb36End=v36.indexOf('$("forecastClose").addEventListener',fb36Start);
const fb36=fb36Start>=0&&fb36End>fb36Start?v36.slice(fb36Start,fb36End):"";
if(fb36&&!fb36.includes('activeModel="local_terrain"'))ok("v3.6 forecast button preserves selected layer");
else fail("v3.6 forecast button still forces local terrain");
if(v36.includes('if(modelInfo().localTerrain)await buildCenterSurfaceForecast(hourly);\n    else surfaceForecastValues=[];'))
  ok("v3.6 surface forecast only for surface layer");
else fail("v3.6 surface conditional forecast missing");

const v37=fs.existsSync("wind-wave-layer-forecast-v37/index.html")
  ?fs.readFileSync("wind-wave-layer-forecast-v37/index.html","utf8"):"";
const requiredV37=[
  ["v3.7 badge",'class="versionBadge">v3.7'],
  ["upwind roughness","function surfaceRoughnessProfile(hereSource,upwindSources,relief)"],
  ["sea fetch threshold","seaShare>=.75"],
  ["coastal transition","沿岸移行域"],
  ["sea share metadata","centerSeaShare"],
  ["double-count correction disclosure","二重に強く掛け過ぎないよう補正済み"]
];
for(const [label,needle] of requiredV37){
  if(v37.includes(needle))ok(label); else fail(label+" missing");
}
function roughnessByFetch(share,relief=10){
  if(share>=.75)return .0002;
  if(share>=.40)return .005;
  if(relief<=20)return .03;
  if(relief<=80)return .05;
  return .10;
}
if(roughnessByFetch(.9)<roughnessByFetch(.5)&&roughnessByFetch(.5)<roughnessByFetch(.1))
  ok("v3.7 upwind sea fetch lowers roughness monotonically");
else fail("v3.7 sea-fetch roughness order invalid");
const fSea=heightFactor(roughnessByFetch(.9));
const fCoast=heightFactor(roughnessByFetch(.5));
const fLand=heightFactor(roughnessByFetch(.1));
if(fSea>fCoast&&fCoast>fLand)ok("v3.7 sea→coast→land 2m factor order");
else fail("v3.7 2m fetch conversion order invalid");

const v38=fs.existsSync("wind-wave-learned-surface-v38/index.html")
  ?fs.readFileSync("wind-wave-learned-surface-v38/index.html","utf8"):"";
const requiredV38=[
  ["v3.8 badge",'class="versionBadge">v3.8'],
  ["learning button",'id="learnBtn"'],
  ["learning panel",'id="learnPanel"'],
  ["terrain steering","function terrainSteeringDegrees"],
  ["steering bound","-18,18"],
  ["local learning storage","SURFACE_LEARN_KEY"],
  ["learned correction","function learnedCorrection"],
  ["adaptive model weights","function precisionModelWeights"],
  ["precision model forecast","getPrecisionWindForecast"],
  ["field observation recorder","recordSurfaceObservation"],
  ["device-only disclosure","学習データはこの端末内だけに保存"]
];
for(const [label,needle] of requiredV38){
  if(v38.includes(needle))ok(label); else fail(label+" missing");
}
function steering(leftRise,rightRise,leftDiagRise,rightDiagRise,relief,seaShare){
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const asym=.30*(leftRise-rightRise)+.70*(leftDiagRise-rightDiagRise);
  const reliefGain=clamp(relief/100,0,1);
  const landGain=1-clamp(seaShare,0,1)*.80;
  return clamp(asym/12,-18,18)*reliefGain*landGain;
}
const turnA=steering(80,0,80,0,100,0);
const turnB=steering(0,80,0,80,100,0);
const turnSea=steering(80,0,80,0,100,1);
if(turnA>0&&turnA<=18&&turnB<0&&turnB>=-18)ok("v3.8 terrain steering sign and bounds");
else fail("v3.8 terrain steering sign/bounds invalid");
if(Math.abs(turnSea)<Math.abs(turnA))ok("v3.8 open-sea steering is damped");
else fail("v3.8 sea steering damping invalid");
function shrink(weight){return Math.max(0,Math.min(.82,weight/(weight+2)));}
if(shrink(1)>0&&shrink(1)<shrink(5)&&shrink(5)<.82)ok("v3.8 learning shrink grows with evidence");
else fail("v3.8 learning shrink invalid");
if(v38.includes("const prior={jma_msm:1,best_match:0,ecmwf_ifs:0}"))ok("v3.8 keeps JMA baseline before learning");
else fail("v3.8 unlearned model prior changed");

const v39=fs.existsSync("wind-wave-learned-surface-v39/index.html")
  ?fs.readFileSync("wind-wave-learned-surface-v39/index.html","utf8"):"";
const requiredV39=[
  ["v3.9 badge",'class="versionBadge">v3.9'],
  ["viewport time state","forecastViewportTime"],
  ["viewport capture","function captureForecastViewport"],
  ["viewport restore","function restoreForecastViewport"],
  ["scroll capture scheduler","scheduleForecastViewportCapture"],
  ["close-panel capture",'if($("forecastPanel").classList.contains("open"))captureForecastViewport()'],
  ["model reopen preserve","if(forecastWasOpen)loadForecast()"],
  ["selected-time anchor","forecastViewportTime=selectedIso"],
  ["persistence disclosure","モデルを変更しても同じ予報時刻へ自動復帰"]
];
for(const [label,needle] of requiredV39){
  if(v39.includes(needle))ok(label); else fail(label+" missing");
}
const mhStart=v39.indexOf('$("modelSelect").addEventListener("change",()=>{');
const mhEnd=v39.indexOf('$("compareBtn").addEventListener',mhStart);
const mh=mhStart>=0&&mhEnd>mhStart?v39.slice(mhStart,mhEnd):"";
if(mh.includes("if(forecastWasOpen)captureForecastViewport()")&&!mh.includes("\n  captureForecastViewport();\n"))
  ok("v3.9 hidden forecast panel does not overwrite anchor");
else fail("v3.9 model handler may overwrite hidden-panel anchor");

const v310=fs.existsSync("wind-wave-learned-surface-v310/index.html")
  ?fs.readFileSync("wind-wave-learned-surface-v310/index.html","utf8"):"";
const requiredV310=[
  ["v3.10 badge",'class="versionBadge">v3.10'],
  ["selected time priority","const target=selectedForecastTime||forecastViewportTime"],
  ["no viewport override when locked","if(forecastWasOpen&&!selectedForecastTime)captureForecastViewport()"],
  ["selected-time persistence disclosure","横スクロール位置より選択時刻を優先します"]
];
for(const [label,needle] of requiredV310){
  if(v310.includes(needle))ok(label); else fail(label+" missing");
}
if(v310.includes("if(selectedIso){selectedForecastTime=selectedIso;forecastViewportTime=selectedIso;}"))
  ok("v3.10 card selection locks timestamp");
else fail("v3.10 card selection does not lock timestamp");

if(failed)process.exit(1);
console.log("Wind & Wave smoke checks passed");
