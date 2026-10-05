import fs from "node:fs";

let s=fs.readFileSync("wind-wave-surface-forecast-v35/index.html","utf8");
function rep(a,b,label){if(!s.includes(a))throw new Error("V3.6 target missing: "+label);s=s.replace(a,b);}
function splice(start,end,replacement,label){const a=s.indexOf(start),b=s.indexOf(end,a+start.length);if(a<0||b<0)throw new Error("V3.6 splice missing: "+label);s=s.slice(0,a)+replacement+"\n"+s.slice(b);}

rep("<title>OKA Surface Wind Forecast v3.5</title>","<title>OKA Wind Layer Forecast v3.6</title>","title");
rep('<h1>OKA Surface Wind Forecast <span class="versionBadge">v3.5</span></h1>\n<div class="sub">先の時間まで約2m地表風速をそのまま表示</div>',
    '<h1>OKA Wind Layer Forecast <span class="versionBadge">v3.6</span></h1>\n<div class="sub">今見ている風情報を、そのまま未来予報へ</div>',"header");
rep('<div class="forecastTitle">地表風速予報（約2m）</div>','<div class="forecastTitle" id="forecastTitle">風予報</div>',"forecast title id");

const titleFns=[
  "function forecastLayerTitle(){",
  '  if(modelInfo().localTerrain)return "精密地表風予報（約2m）";',
  '  if(modelInfo().dense1km)return "1km間隔風予報（MSM補間）";',
  '  return modelInfo().label+" 風予報";',
  "}",
  "function updateForecastTitle(){",
  '  const el=$("forecastTitle");',
  "  if(el)el.textContent=forecastLayerTitle();",
  "}"
].join("\n");
rep("function surfaceForecastAt(i){\n  return surfaceForecastValues[i]||null;\n}",
    "function surfaceForecastAt(i){\n  return surfaceForecastValues[i]||null;\n}\n"+titleFns,"title helpers");

const listStart=s.indexOf("function renderForecastList(){"),listEnd=s.indexOf("async function loadForecast()",listStart);
if(listStart<0||listEnd<0)throw new Error("renderForecastList missing");
const listFn=[
  "function renderForecastList(){",
  '  const list=$("forecastList");',
  "  list.replaceChildren();",
  "  if(!forecastRows.length)return;",
  "  const h=forecastRows[0].hourly||{};",
  "  const total=Math.min(forecastRange,(h.time&&h.time.length)||0);",
  "  const surfaceMode=!!modelInfo().localTerrain;",
  "  for(let i=0;i<total;i++){",
  "    const sf=surfaceForecastAt(i);",
  "    const sp=h.wind_speed_10m&&h.wind_speed_10m[i];",
  "    const di=h.wind_direction_10m&&h.wind_direction_10m[i];",
  "    const gu=h.wind_gusts_10m&&h.wind_gusts_10m[i];",
  "    const w=waveForecastAt(i);",
  '    const b=document.createElement("button");',
  '    b.type="button";',
  '    b.className="hourCard"+(forecastIndex===i?" active":"");',
  "    b.dataset.index=String(i);",
  "    if(surfaceMode){",
  "      b.innerHTML=",
  '        \'<div class="hourTime">\'+forecastTimeLabel(h.time&&h.time[i],i)+\'</div>\'+',
  '        \'<div class="hourWind">\'+(sf&&Number.isFinite(sf.speed)?sf.speed.toFixed(1):"--")+\' m/s</div>\'+',
  '        \'<div class="hourMeta">地表 約2m\'+(sf&&Number.isFinite(sf.confidence)?\'<br>信頼度 \'+Math.round(sf.confidence*100)+\'%\':\'\')+\'</div>\';',
  "    }else{",
  "      b.innerHTML=",
  '        \'<div class="hourTime">\'+forecastTimeLabel(h.time&&h.time[i],i)+\'</div>\'+',
  '        \'<div class="hourWind">\'+(Number.isFinite(sp)?sp.toFixed(1):"--")+\' m/s</div>\'+',
  '        \'<div class="hourMeta">\'+(Number.isFinite(di)?compass(di)+"から":"--")+\'<br>\'+modelInfo().label+',
  "        +(modelInfo().gust?(Number.isFinite(gu)?'<br>瞬 '+gu.toFixed(1)+' m/s':''):'')",
  "        +(w&&Number.isFinite(w.h)?'<br>波 '+w.h.toFixed(1)+' m':'')+'</div>';",
  "    }",
  '    b.addEventListener("click",()=>applyForecastHour(i,false));',
  "    list.appendChild(b);",
  "  }",
  "}"
].join("\n");
s=s.slice(0,listStart)+listFn+"\n"+s.slice(listEnd);

const loadStart=s.indexOf("async function loadForecast(){"),loadEnd=s.indexOf("async function refreshSelectedForecast()",loadStart);
if(loadStart<0||loadEnd<0)throw new Error("loadForecast missing");
let load=s.slice(loadStart,loadEnd);
load=load.replace('  updateModelUI();\n  clearError();','  updateModelUI();\n  updateForecastTitle();\n  clearError();');
load=load.replace('  setStatus("約2m地表風速予報を計算中…");','  setStatus(modelInfo().localTerrain?"約2m地表風速予報を計算中…":modelInfo().label+" の予報を取得中…");');
load=load.replace('  $("forecastList").innerHTML=\'<div class="label" style="padding:14px">地表風速予報を計算中…</div>\';',
                  '  $("forecastList").innerHTML=\'<div class="label" style="padding:14px">選択中の風情報で予報を準備中…</div>\';');
load=load.replace('    const hourly=forecastRows[0]&&forecastRows[0].hourly||{};\n    await buildCenterSurfaceForecast(hourly);\n    if(req!==forecastRequestSeq)return;\n    const times=',
                  '    const hourly=forecastRows[0]&&forecastRows[0].hourly||{};\n    if(modelInfo().localTerrain)await buildCenterSurfaceForecast(hourly);\n    else surfaceForecastValues=[];\n    if(req!==forecastRequestSeq)return;\n    const times=');
load=load.replace('    setStatus(forecastIndex!==null?"選択中の地表風予報時刻を固定中":"✅ 約2m地表風速予報を表示");',
                  '    setStatus(forecastIndex!==null?"選択中の予報時刻を固定中":(modelInfo().localTerrain?"✅ 約2m地表風速予報を表示":"✅ "+modelInfo().label+" の予報を表示"));');
s=s.slice(0,loadStart)+load+s.slice(loadEnd);

const fbStart=s.indexOf('$("forecastBtn").addEventListener("click",()=>{');
const fbEnd=s.indexOf('$("forecastClose").addEventListener',fbStart);
if(fbStart<0||fbEnd<0)throw new Error("forecast button handler missing");
const fb=[
  '$("forecastBtn").addEventListener("click",()=>{',
  "  closeTidePanel();",
  "  updateForecastTitle();",
  '  if(forecastRows.length){$("forecastPlace").textContent=placeName;openForecastPanel();renderForecastList();}',
  "  else loadForecast();",
  "});"
].join("\n");
s=s.slice(0,fbStart)+fb+"\n"+s.slice(fbEnd);

rep('<div class="note">予報ボタンでは先の各時刻をすべて約2m地表風速へ換算して表示します。地形は風向22.5°ごとに事前解析し、時刻をタップした時だけその時刻の半径1km・100m格子317点を再計算します。10m風速は予報画面には表示しません。</div>',
    '<div class="note">予報は現在選択中の風情報をそのまま引き継ぎます。精密地表風を見ている時は先の各時刻も約2m地表風、JMA MSM・Best Match・ECMWF・1km間隔表示ならその選択モデルの予報を表示します。予報ボタンだけで風レイヤーを勝手に切り替えません。</div>',"note");

for(const n of [
  'class="versionBadge">v3.6',
  'id="forecastTitle"',
  "function forecastLayerTitle",
  "const surfaceMode=!!modelInfo().localTerrain",
  'if(modelInfo().localTerrain)await buildCenterSurfaceForecast(hourly)',
  "予報は現在選択中の風情報をそのまま引き継ぎます",
  "予報ボタンだけで風レイヤーを勝手に切り替えません"
])if(!s.includes(n))throw new Error("V3.6 sanity missing: "+n);

const fbBlock=s.slice(s.indexOf('$("forecastBtn").addEventListener("click",()=>{'),s.indexOf('$("forecastClose").addEventListener'));
if(fbBlock.includes('activeModel="local_terrain"'))throw new Error("V3.6 forecast button still forces local terrain");

fs.mkdirSync("wind-wave-layer-forecast-v36",{recursive:true});
fs.writeFileSync("wind-wave-layer-forecast-v36/index.html",s);
console.log("Built V3.6",s.length);