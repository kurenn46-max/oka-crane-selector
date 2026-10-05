import fs from "node:fs";

let s=fs.readFileSync("wind-wave-surface-v34/index.html","utf8");
const forecastCore=fs.readFileSync("scripts/v35-surface-forecast.txt","utf8");
function rep(a,b,label){if(!s.includes(a))throw new Error("V3.5 target missing: "+label);s=s.replace(a,b);}
function splice(start,end,replacement,label){const a=s.indexOf(start),b=s.indexOf(end,a+start.length);if(a<0||b<0)throw new Error("V3.5 splice missing: "+label);s=s.slice(0,a)+replacement+"\n"+s.slice(b);}

rep("<title>OKA Wind & Wave Surface 2m v3.4</title>","<title>OKA Surface Wind Forecast v3.5</title>","title");
rep('<h1>OKA Wind & Wave Surface 2m <span class="versionBadge">v3.4</span></h1>\n<div class="sub">ワンボタンで釣り人高さ・約2mの精密地表風</div>',
    '<h1>OKA Surface Wind Forecast <span class="versionBadge">v3.5</span></h1>\n<div class="sub">先の時間まで約2m地表風速をそのまま表示</div>',"header");
rep('<div class="forecastTitle">1時間ごとの予報</div>','<div class="forecastTitle">地表風速予報（約2m）</div>',"forecast title");
rep('let selectedForecastTime=null;','let selectedForecastTime=null;\n'+forecastCore,"forecast state/core");
rep('function invalidateForecast(keepSelectedTime=false){\n  forecastRows=[];forecastWave=null;forecastIndex=null;',
    'function invalidateForecast(keepSelectedTime=false){\n  forecastRows=[];forecastWave=null;forecastIndex=null;surfaceForecastValues=[];',"invalidate");

const listStart=s.indexOf("function renderForecastList(){"),listEnd=s.indexOf("async function loadForecast()",listStart);
if(listStart<0||listEnd<0)throw new Error("renderForecastList missing");
const listFn=[
  "function renderForecastList(){",
  '  const list=$("forecastList");',
  "  list.replaceChildren();",
  "  if(!forecastRows.length)return;",
  "  const h=forecastRows[0].hourly||{};",
  "  const total=Math.min(forecastRange,(h.time&&h.time.length)||0);",
  "  for(let i=0;i<total;i++){",
  "    const sf=surfaceForecastAt(i);",
  '    const b=document.createElement("button");',
  '    b.type="button";',
  '    b.className="hourCard"+(forecastIndex===i?" active":"");',
  "    b.dataset.index=String(i);",
  "    b.innerHTML=",
  '      \'<div class="hourTime">\'+forecastTimeLabel(h.time&&h.time[i],i)+\'</div>\'+',
  '      \'<div class="hourWind">\'+(sf&&Number.isFinite(sf.speed)?sf.speed.toFixed(1):"--")+\' m/s</div>\'+',
  '      \'<div class="hourMeta">地表 約2m</div>\';',
  '    b.addEventListener("click",()=>applyForecastHour(i,false));',
  "    list.appendChild(b);",
  "  }",
  "}"
].join("\n");
s=s.slice(0,listStart)+listFn+"\n"+s.slice(listEnd);

const loadStart=s.indexOf("async function loadForecast(){"),loadEnd=s.indexOf("async function refreshSelectedForecast()",loadStart);
if(loadStart<0||loadEnd<0)throw new Error("loadForecast missing");
let load=s.slice(loadStart,loadEnd);
load=load.replace('  setStatus("時間予報を取得中…（中心1地点・軽量モード）");','  setStatus("約2m地表風速予報を計算中…");');
load=load.replace('  $("forecastList").innerHTML=\'<div class="label" style="padding:14px">予報を読み込み中…</div>\';',
                  '  $("forecastList").innerHTML=\'<div class="label" style="padding:14px">地表風速予報を計算中…</div>\';');
load=load.replace('    forecastRows=rows;\n    forecastWave=wave;\n    const times=',
                  '    forecastRows=rows;\n    forecastWave=wave;\n    const hourly=forecastRows[0]&&forecastRows[0].hourly||{};\n    await buildCenterSurfaceForecast(hourly);\n    if(req!==forecastRequestSeq)return;\n    const times=');
load=load.replace('    setStatus(forecastIndex!==null?"選択中の予報時刻を固定中":"予報カードは中心1地点、選択時だけ5km分布取得");',
                  '    setStatus(forecastIndex!==null?"選択中の地表風予報時刻を固定中":"✅ 約2m地表風速予報を表示");');
s=s.slice(0,loadStart)+load+s.slice(loadEnd);

const applyStart=s.indexOf("function applyForecastHour("),applyEnd=s.indexOf("function renderForecastList()",applyStart);
if(applyStart<0||applyEnd<0)throw new Error("applyForecastHour missing");
let apply=s.slice(applyStart,applyEnd);
apply=apply.replace('  const sp=h.wind_speed_10m&&h.wind_speed_10m[i];\n  const di=h.wind_direction_10m&&h.wind_direction_10m[i];\n  const gu=h.wind_gusts_10m&&h.wind_gusts_10m[i];',
                    '  const sp=h.wind_speed_10m&&h.wind_speed_10m[i];\n  const di=h.wind_direction_10m&&h.wind_direction_10m[i];\n  const gu=h.wind_gusts_10m&&h.wind_gusts_10m[i];\n  const sf=surfaceForecastAt(i);');
apply=apply.replace('  if(modelInfo().localTerrain){\n    $("wind").textContent="計算中";\n    $("windDir").textContent=Number.isFinite(di)?compass(di)+"から":"地表風を再計算";\n    $("gust").textContent="--";',
                    '  if(modelInfo().localTerrain){\n    $("wind").textContent=sf&&Number.isFinite(sf.speed)?"≈"+sf.speed.toFixed(1)+" m/s":"計算中";\n    $("windDir").textContent=Number.isFinite(di)?compass(di)+"から":"--";\n    $("gust").textContent=sf&&Number.isFinite(sf.confidence)?Math.round(sf.confidence*100)+"%":"--";');
s=s.slice(0,applyStart)+apply+s.slice(applyEnd);

const fbStart=s.indexOf('$("forecastBtn").addEventListener("click",()=>{');
const fbEnd=s.indexOf('$("forecastClose").addEventListener',fbStart);
if(fbStart<0||fbEnd<0)throw new Error("forecast button handler missing");
const fb=[
  '$("forecastBtn").addEventListener("click",()=>{',
  '  closeTidePanel();',
  '  if(!modelInfo().localTerrain){',
  '    invalidateLiveRequests();',
  '    activeModel="local_terrain";',
  '    $("modelSelect").value=activeModel;',
  '    compareMode=false;',
  '    if(zoom<15)zoom=15;',
  '    updateModelUI();',
  '    updateCompareButton();',
  '    renderMap();',
  '    invalidateForecast();',
  '  }',
  '  if(forecastRows.length){$("forecastPlace").textContent=placeName;openForecastPanel();renderForecastList();}',
  '  else loadForecast();',
  '});'
].join("\n");
s=s.slice(0,fbStart)+fb+"\n"+s.slice(fbEnd);

rep('<div class="note">🎯精密地表風は、JMA MSMを基準に国土地理院DEMで風上遮蔽・尾根・谷筋を補正し、地表粗度の近似から釣り人高さ約2mへ換算した推定風です。半径1kmを100m格子317点で内部計算します。表示する風速は約2m地表風のみ。実測値や100m気象モデルではありません。</div>',
    '<div class="note">予報ボタンでは先の各時刻をすべて約2m地表風速へ換算して表示します。地形は風向22.5°ごとに事前解析し、時刻をタップした時だけその時刻の半径1km・100m格子317点を再計算します。10m風速は予報画面には表示しません。</div>',"note");

for(const n of [
  'class="versionBadge">v3.5',
  "function buildCenterSurfaceForecast",
  "surfaceForecastValues",
  "surfaceSector",
  "地表風速予報（約2m）",
  "地表 約2m",
  "✅ 約2m地表風速予報を表示",
  "10m風速は予報画面には表示しません"
])if(!s.includes(n))throw new Error("V3.5 sanity missing: "+n);

fs.mkdirSync("wind-wave-surface-forecast-v35",{recursive:true});
fs.writeFileSync("wind-wave-surface-forecast-v35/index.html",s);
console.log("Built V3.5",s.length);