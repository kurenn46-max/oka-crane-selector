import fs from "node:fs";

let s=fs.readFileSync("wind-wave-layer-forecast-v37/index.html","utf8");
const learningCore=fs.readFileSync("scripts/v38-learning-core.txt","utf8");
const precisionCore=fs.readFileSync("scripts/v38-precision-core.txt","utf8");
const surfaceForecast=fs.readFileSync("scripts/v38-surface-forecast.txt","utf8");
const learningUi=fs.readFileSync("scripts/v38-learning-ui.txt","utf8");

function rep(a,b,label){
  if(!s.includes(a))throw new Error("V3.8 target missing: "+label);
  s=s.replace(a,b);
}
function splice(start,end,replacement,label){
  const a=s.indexOf(start),b=s.indexOf(end,a+start.length);
  if(a<0||b<0)throw new Error("V3.8 splice missing: "+label);
  s=s.slice(0,a)+replacement+"\n"+s.slice(b);
}
function lines(a){return a.join("\n");}

rep("<title>OKA Wind Layer Forecast v3.7</title>","<title>OKA Learned Surface Wind v3.8</title>","title");
rep('<h1>OKA Wind Layer Forecast <span class="versionBadge">v3.7</span></h1>\n<div class="sub">選択レイヤー予報＋沿岸地表風の精度補正</div>',
    '<h1>OKA Learned Surface Wind <span class="versionBadge">v3.8</span></h1>\n<div class="sub">地形で風向を曲げ、現地実測から地点ごとに学習</div>',"header");

rep('.precisionRow{display:grid;margin-top:6px}',lines([
'.precisionRow{display:grid;grid-template-columns:1fr auto;gap:6px;margin-top:6px}',
'#learnBtn{font-size:11px;padding:9px 10px;white-space:nowrap}',
'#learnBackdrop{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:60}',
'#learnPanel{display:none;position:fixed;left:0;right:0;bottom:0;z-index:61;background:#0b1d2b;border-top:1px solid #436071;border-radius:18px 18px 0 0;padding:12px;box-shadow:0 -6px 20px rgba(0,0,0,.35)}',
'#learnPanel.open,#learnBackdrop.open{display:block}',
'.learnTop{display:flex;justify-content:space-between;align-items:center;gap:8px}',
'.learnTitle{font-size:15px;font-weight:900}',
'.learnGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}',
'.learnField label{display:block;font-size:10px;color:#a9bdca;margin-bottom:4px;font-weight:800}',
'.learnField input,.learnField select{width:100%;background:#102a3b;color:#fff;border:1px solid #345064;border-radius:10px;padding:10px;font-size:16px}',
'.learnActions{display:grid;grid-template-columns:1fr auto;gap:7px;margin-top:10px}',
'#learnInfo,#learnMsg{font-size:10px;color:#a9bdca;line-height:1.4;margin-top:7px}',
'#learnMsg{color:#d7e8f2}',
'@media(max-width:430px){.learnGrid{grid-template-columns:1fr}.precisionRow{grid-template-columns:1fr auto}}'
]),"learning css");

rep('<div class="precisionRow">\n<button type="button" id="precisionBtn">🎯 精密地表風</button>\n</div>',lines([
'<div class="precisionRow">',
'<button type="button" id="precisionBtn">🎯 精密地表風</button>',
'<button type="button" id="learnBtn">🧪実測学習</button>',
'</div>'
]),"learning button");

const learnPanel=lines([
'<div id="learnBackdrop"></div>',
'<section id="learnPanel" aria-label="現地実測学習">',
'  <div class="learnTop">',
'    <div>',
'      <div class="learnTitle">🧪 現地実測を学習</div>',
'      <div class="label">約2m高さの実測を登録</div>',
'    </div>',
'    <button type="button" id="learnClose">閉じる</button>',
'  </div>',
'  <form id="learnForm">',
'    <div class="learnGrid">',
'      <div class="learnField">',
'        <label for="learnSpeed">実測風速 m/s</label>',
'        <input id="learnSpeed" type="number" inputmode="decimal" min="0" max="40" step="0.1" placeholder="例 3.2" required>',
'      </div>',
'      <div class="learnField">',
'        <label for="learnDir">実測風向（吹いてくる方向・任意）</label>',
'        <select id="learnDir">',
'          <option value="">風向は省略</option>',
'          <option value="0">北 0°</option><option value="22.5">北北東 22.5°</option>',
'          <option value="45">北東 45°</option><option value="67.5">東北東 67.5°</option>',
'          <option value="90">東 90°</option><option value="112.5">東南東 112.5°</option>',
'          <option value="135">南東 135°</option><option value="157.5">南南東 157.5°</option>',
'          <option value="180">南 180°</option><option value="202.5">南南西 202.5°</option>',
'          <option value="225">南西 225°</option><option value="247.5">西南西 247.5°</option>',
'          <option value="270">西 270°</option><option value="292.5">西北西 292.5°</option>',
'          <option value="315">北西 315°</option><option value="337.5">北北西 337.5°</option>',
'        </select>',
'      </div>',
'    </div>',
'    <div id="learnInfo"></div>',
'    <div id="learnMsg" aria-live="polite"></div>',
'    <div class="learnActions">',
'      <button type="submit" class="primary" id="learnSave">この実測を学習</button>',
'      <button type="button" id="learnClear">周辺学習を消去</button>',
'    </div>',
'  </form>',
'</section>',
''
]);
rep('<div id="forecastBackdrop"></div>',learnPanel+'<div id="forecastBackdrop"></div>',"learning panel");

rep('  local_terrain:{label:"精密地表風（約2m）",param:"jma_msm",maxHours:96,gust:false,localTerrain:true,note:"半径1kmを100m内部格子で解析し、地形＋地表粗度から約2m風へ換算"},',
    '  local_terrain:{label:"精密地表風（約2m）",param:"jma_msm",maxHours:96,gust:false,localTerrain:true,note:"MSMを基準に地形風向補正。実測学習があれば3モデルの重みと地点補正を自動更新"},',"model note");

splice("function surfaceRoughnessProfile","async function buildLocalSurfaceSamples",precisionCore+"\n","precision core");

rep('    centerSeaShare:Number.isFinite(c&&c.seaShare)?c.seaShare:0,\n    centerAngle:Number.isFinite(c&&c.shelterAngle)?c.shelterAngle:0,',
    '    centerSeaShare:Number.isFinite(c&&c.seaShare)?c.seaShare:0,\n    centerTurn:Number.isFinite(c&&c.terrainTurn)?c.terrainTurn:0,\n    centerLearningN:Number.isFinite(c&&c.calibrationN)?c.calibrationN:0,\n    centerAngle:Number.isFinite(c&&c.shelterAngle)?c.shelterAngle:0,',"local meta");

const sfStart=s.indexOf("let surfaceForecastValues=[];");
const sfEnd=s.indexOf("function forecastLayerTitle",sfStart);
if(sfStart<0||sfEnd<0)throw new Error("V3.8 surface forecast block missing");
s=s.slice(0,sfStart)+surfaceForecast+"\n"+learningCore+"\n"+s.slice(sfEnd);

rep('    getWindAtTime(anchors,selectedForecastTime),',
    '    getPrecisionWindAtTime(anchors,selectedForecastTime),',"selected precision models");
rep('    getWind(anchors),',
    '    getPrecisionWind(anchors),',"current precision models");
rep('      getWindForecast(ps),',
    '      (modelInfo().localTerrain?getPrecisionWindForecast(ps):getWindForecast(ps)),',"forecast precision models");

const pui=s.indexOf("function updatePrecisionUI(){");
if(pui<0)throw new Error("updatePrecisionUI missing");
s=s.slice(0,pui)+learningUi+"\n"+s.slice(pui);

rep('  $("gustSub").textContent=on?"DEM＋地表粗度補正":"10m高度";\n}',
    '  $("gustSub").textContent=on?"地形方向＋実測学習":"10m高度";\n  updateLearningBadge();\n}',"precision badge");

rep('$("precisionBtn").addEventListener("click",activatePrecisionSurface);',lines([
'$("precisionBtn").addEventListener("click",activatePrecisionSurface);',
'$("learnBtn").addEventListener("click",openLearningPanel);',
'$("learnClose").addEventListener("click",closeLearningPanel);',
'$("learnBackdrop").addEventListener("click",closeLearningPanel);',
'$("learnForm").addEventListener("submit",submitLearning);',
'$("learnClear").addEventListener("click",clearLearningForHere);'
]),"learning events");

rep('async function refreshData(){\n  const req=++dataRequestSeq;loading=true;clearError();',
    'async function refreshData(){\n  const req=++dataRequestSeq;loading=true;clearError();updateLearningBadge();',"refresh badge");

rep('<div class="note">予報は現在選択中の風情報をそのまま引き継ぎます。精密地表風では風上0.2/0.4/0.7/1kmのDEM有無から海上フェッチを判定し、海面・沿岸移行域・陸上で約2m高度換算を変えます。DEM地形による遮蔽補正と地表粗度を二重に強く掛け過ぎないよう補正済み。実測ではありません。</div>',
    '<div class="note">精密地表風は、風上地形の左右差から風向を最大±18°だけ保守的に曲げます。現地実測を登録すると、近い地点・似た風向の誤差を学習し、MSM/Best Match/ECMWFの重みと最終の約2m風速・風向補正へ反映します。学習データはこの端末内だけに保存。</div>',"note");

for(const n of [
  'class="versionBadge">v3.8',
  'id="learnBtn"',
  'id="learnPanel"',
  "const SURFACE_LEARN_KEY",
  "function precisionModelWeights",
  "function terrainSteeringDegrees",
  "terrainTurn",
  "getPrecisionWindForecast",
  "recordSurfaceObservation",
  "学習データはこの端末内だけに保存"
]){
  if(!s.includes(n))throw new Error("V3.8 sanity missing: "+n);
}
fs.mkdirSync("wind-wave-learned-surface-v38",{recursive:true});
fs.writeFileSync("wind-wave-learned-surface-v38/index.html",s);
console.log("Built V3.8",s.length);
