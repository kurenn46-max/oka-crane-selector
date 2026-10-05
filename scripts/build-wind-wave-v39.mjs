import fs from "node:fs";

let s=fs.readFileSync("wind-wave-learned-surface-v38/index.html","utf8");
function rep(a,b,label){if(!s.includes(a))throw new Error("V3.9 target missing: "+label);s=s.replace(a,b);}
function splice(start,end,replacement,label){const a=s.indexOf(start),b=s.indexOf(end,a+start.length);if(a<0||b<0)throw new Error("V3.9 splice missing: "+label);s=s.slice(0,a)+replacement+"\n"+s.slice(b);}
function lines(a){return a.join("\n");}

rep("<title>OKA Learned Surface Wind v3.8</title>","<title>OKA Learned Surface Wind v3.9</title>","title");
rep('<h1>OKA Learned Surface Wind <span class="versionBadge">v3.8</span></h1>\n<div class="sub">地形で風向を曲げ、現地実測から地点ごとに学習</div>',
    '<h1>OKA Learned Surface Wind <span class="versionBadge">v3.9</span></h1>\n<div class="sub">予報を送った時間をモデル変更後もそのまま保持</div>',"header");

rep("let selectedForecastTime=null;","let selectedForecastTime=null;\nlet forecastViewportTime=null;\nlet forecastScrollRaf=null;","forecast viewport state");\n\nrep('function closeForecastPanel(){\n  $("forecastBackdrop").classList.remove("open");',\n    'function closeForecastPanel(){\n  if($("forecastPanel").classList.contains("open"))captureForecastViewport();\n  $("forecastBackdrop").classList.remove("open");',"capture on close");

const viewportFns=lines([
  "function forecastViewportIndex(){",
  "  if(!forecastRows.length)return -1;",
  "  const times=forecastRows[0]&&forecastRows[0].hourly&&forecastRows[0].hourly.time||[];",
  "  const target=forecastViewportTime||selectedForecastTime;",
  "  if(!target||!times.length)return -1;",
  "  const exact=times.indexOf(target);",
  "  if(exact>=0)return exact;",
  "  const tm=new Date(target).getTime();",
  "  if(!Number.isFinite(tm))return -1;",
  "  let best=0,diff=Infinity;",
  "  for(let i=0;i<times.length;i++){",
  "    const d=Math.abs(new Date(times[i]).getTime()-tm);",
  "    if(d<diff){best=i;diff=d;}",
  "  }",
  "  return best;",
  "}",
  "function captureForecastViewport(){",
  '  const list=$("forecastList");',
  "  if(!list||!forecastRows.length)return;",
  '  const cards=[...list.querySelectorAll(".hourCard")];',
  "  if(!cards.length)return;",
  "  const lr=list.getBoundingClientRect();",
  "  let best=null,bestDist=Infinity;",
  "  for(const card of cards){",
  "    const r=card.getBoundingClientRect();",
  "    const d=Math.abs(r.left-lr.left);",
  "    if(d<bestDist){best=card;bestDist=d;}",
  "  }",
  "  if(!best)return;",
  "  const i=Number(best.dataset.index);",
  "  const times=forecastRows[0]&&forecastRows[0].hourly&&forecastRows[0].hourly.time||[];",
  "  if(Number.isInteger(i)&&times[i])forecastViewportTime=times[i];",
  "}",
  "function restoreForecastViewport(){",
  '  const list=$("forecastList");',
  "  if(!list)return;",
  "  const i=forecastViewportIndex();",
  "  if(i<0)return;",
  "  requestAnimationFrame(()=>{",
  '    const card=list.querySelector(\'.hourCard[data-index="\'+i+\'"]\');',
  "    if(!card)return;",
  "    const lr=list.getBoundingClientRect(),cr=card.getBoundingClientRect();",
  "    list.scrollLeft=Math.max(0,list.scrollLeft+(cr.left-lr.left));",
  "  });",
  "}",
  "function scheduleForecastViewportCapture(){",
  "  if(forecastScrollRaf)return;",
  "  forecastScrollRaf=requestAnimationFrame(()=>{",
  "    forecastScrollRaf=null;",
  "    captureForecastViewport();",
  "  });",
  "}",
]);
const titleFnPos=s.indexOf("function forecastLayerTitle(){");
if(titleFnPos<0)throw new Error("forecastLayerTitle missing");
s=s.slice(0,titleFnPos)+viewportFns+"\n"+s.slice(titleFnPos);

const renderStart=s.indexOf("function renderForecastList(){");
const renderEnd=s.indexOf("async function loadForecast()",renderStart);
if(renderStart<0||renderEnd<0)throw new Error("renderForecastList missing");
let render=s.slice(renderStart,renderEnd);
const renderLast=render.lastIndexOf("\n}");
if(renderLast<0)throw new Error("renderForecastList close missing");
render=render.slice(0,renderLast)+"\n  restoreForecastViewport();"+render.slice(renderLast);
s=s.slice(0,renderStart)+render+s.slice(renderEnd);

rep("  if(selectedIso)selectedForecastTime=selectedIso;",
    "  if(selectedIso){selectedForecastTime=selectedIso;forecastViewportTime=selectedIso;}","selected time anchor");

const modelStart=s.indexOf('$("modelSelect").addEventListener("change",()=>{');
const modelEnd=s.indexOf('$("compareBtn").addEventListener',modelStart);
if(modelStart<0||modelEnd<0)throw new Error("model change handler missing");
const modelHandler=lines([
  '$("modelSelect").addEventListener("change",()=>{',
  "  const forecastWasOpen=$(\"forecastPanel\").classList.contains(\"open\");",
  "  captureForecastViewport();",
  "  invalidateLiveRequests();",
  '  activeModel=$("modelSelect").value;',
  "  if(modelInfo().dense1km&&zoom<13){zoom=13;renderMap();}",
  "  if(modelInfo().localTerrain&&zoom<15){zoom=15;renderMap();}",
  "  invalidateForecast(!!selectedForecastTime);",
  "  closeForecastPanel();",
  "  updateModelUI();",
  "  if(selectedForecastTime)refreshSelectedForecast();",
  "  else refreshData();",
  "  if(forecastWasOpen)loadForecast();",
  "});",
]);
s=s.slice(0,modelStart)+modelHandler+"\n"+s.slice(modelEnd);

rep('$("forecastBtn").addEventListener("click",()=>{',
    '$("forecastList").addEventListener("scroll",scheduleForecastViewportCapture,{passive:true});\n$("forecastBtn").addEventListener("click",()=>{',"scroll listener");

rep('<div class="note">精密地表風は、風上地形の左右差から風向を最大±18°だけ保守的に曲げます。現地実測を登録すると、近い地点・似た風向の誤差を学習し、MSM/Best Match/ECMWFの重みと最終の約2m風速・風向補正へ反映します。学習データはこの端末内だけに保存。</div>',
    '<div class="note">予報を横へ送った位置は時刻で保持します。モデルを変更しても同じ予報時刻へ自動復帰し、モデルごとの時間範囲が短い場合だけ最も近い時刻へ合わせます。精密地表風の地形・実測学習機能はV3.8から継続。</div>',"note");

for(const n of [
  'class="versionBadge">v3.9',
  "forecastViewportTime",
  "function captureForecastViewport",
  "function restoreForecastViewport",
  "scheduleForecastViewportCapture",
  "if(forecastWasOpen)loadForecast()",
  "モデルを変更しても同じ予報時刻へ自動復帰"
])if(!s.includes(n))throw new Error("V3.9 sanity missing: "+n);

fs.mkdirSync("wind-wave-learned-surface-v39",{recursive:true});
fs.writeFileSync("wind-wave-learned-surface-v39/index.html",s);
console.log("Built V3.9",s.length);