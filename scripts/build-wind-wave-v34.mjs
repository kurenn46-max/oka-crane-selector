import fs from "node:fs";

let s=fs.readFileSync("wind-wave-local-v33/index.html","utf8");
const surfaceCore=fs.readFileSync("scripts/v34-surface-core.txt","utf8");
const surfaceRefresh=fs.readFileSync("scripts/v34-surface-refresh.txt","utf8");
const precisionUi=fs.readFileSync("scripts/v34-precision-ui.txt","utf8");
const applyForecast=fs.readFileSync("scripts/v34-apply-forecast.txt","utf8");
const renderForecast=fs.readFileSync("scripts/v34-render-forecast.txt","utf8");

function rep(a,b,label){
  if(!s.includes(a))throw new Error("V3.4 target missing: "+label);
  s=s.replace(a,b);
}
function splice(start,end,replacement,label){
  const a=s.indexOf(start),b=s.indexOf(end,a+start.length);
  if(a<0||b<0)throw new Error("V3.4 splice missing: "+label);
  s=s.slice(0,a)+replacement+"\n"+s.slice(b);
}

rep("<title>OKA Wind & Wave Local Surface v3.3</title>","<title>OKA Wind & Wave Surface 2m v3.4</title>","title");
rep('<h1>OKA Wind & Wave Local Surface <span class="versionBadge">v3.3</span></h1>\n<div class="sub">通常表示＋局地1km・100m地形補正推定</div>',
    '<h1>OKA Wind & Wave Surface 2m <span class="versionBadge">v3.4</span></h1>\n<div class="sub">ワンボタンで釣り人高さ・約2mの精密地表風</div>',"header");

rep('.modelNote{font-size:9px;color:#9eb5c3;margin-top:4px}',
    '.modelNote{font-size:9px;color:#9eb5c3;margin-top:4px}\n.precisionRow{display:grid;margin-top:6px}\n#precisionBtn{background:#58bcff;color:#00131f;border:0;font-size:13px;padding:10px 12px;font-weight:900}\n#precisionBtn.active{outline:2px solid rgba(255,255,255,.7);outline-offset:1px}',"precision css");

rep('<button type="button" id="kyotoBtn">京都</button>\n</div>\n<div class="modelRow">',
    '<button type="button" id="kyotoBtn">京都</button>\n</div>\n<div class="precisionRow">\n<button type="button" id="precisionBtn">🎯 精密地表風</button>\n</div>\n<div class="modelRow">' ,"precision button");

rep('  <option value="local_terrain">局地1km（100m地形補正）</option>',
    '  <option value="local_terrain">精密地表風（約2m）</option>',"local option");

rep('<div class="card"><div class="label">中心の風</div><div class="value" id="wind">-- m/s</div><div class="label" id="windDir">--</div></div>\n<div class="card"><div class="label">最大瞬間</div><div class="value" id="gust">-- m/s</div><div class="label">10m高度</div></div>',
    '<div class="card"><div class="label" id="windLabel">中心の風</div><div class="value" id="wind">-- m/s</div><div class="label" id="windDir">--</div></div>\n<div class="card"><div class="label" id="gustLabel">最大瞬間</div><div class="value" id="gust">-- m/s</div><div class="label" id="gustSub">10m高度</div></div>',"cards");

rep('<div class="note">青矢印＝風の流れる方向。局地1kmはJMA MSMを基準に、国土地理院DEM5A/5B/5C/10Bの地形から風上遮蔽・尾根・谷筋を補正した推定10m風です。内部計算は100m格子（半径1km、約317点）、表示密度はズームで自動調整。100m気象モデルやLFM直結ではありません。</div>',
    '<div class="note">🎯精密地表風は、JMA MSMを基準に国土地理院DEMで風上遮蔽・尾根・谷筋を補正し、地表粗度の近似から釣り人高さ約2mへ換算した推定風です。半径1kmを100m格子317点で内部計算します。表示する風速は約2m地表風のみ。実測値や100m気象モデルではありません。</div>',"note");

rep('  local_terrain:{label:"局地1km（100m地形補正）",param:"jma_msm",maxHours:96,gust:false,localTerrain:true,note:"半径1kmを100m内部格子で推定。JMA MSM＋国土地理院DEM地形補正"},',
    '  local_terrain:{label:"精密地表風（約2m）",param:"jma_msm",maxHours:96,gust:false,localTerrain:true,note:"半径1kmを100m内部格子で解析し、地形＋地表粗度から約2m風へ換算"},',"model info");

rep('let localSurfaceMeta={centerFactor:1,centerAngle:0,centerElevation:null,computed:0,terrainSource:""};',
    'let localSurfaceMeta={centerFactor:1,centerHeightFactor:1,centerConfidence:.5,centerRoughness:"",centerAngle:0,centerElevation:null,computed:0,terrainSource:""};',"meta init");

splice("function terrainShelterFactor","function dense1kmPoints",surfaceCore,"surface core");
splice("async function refreshLocalSelected","async function refreshSelectedForecast",surfaceRefresh,"surface refresh");

const uiStart=s.indexOf("function updateModelUI(){"),uiEnd=s.indexOf("\nfunction angleDiff",uiStart);
if(uiStart<0||uiEnd<0)throw new Error("updateModelUI missing");
let ui=s.slice(uiStart,uiEnd);
ui=ui.replace('const tail=m.localTerrain\n    ?"｜時間カードはMSM基準、時刻を選ぶと100m地形補正を再計算"',
              'const tail=m.localTerrain\n    ?"｜表示風速は約2mのみ。時間を選ぶと地形＋粗度を再計算"');
ui=ui.replace("  updateCompareButton();\n}","  updateCompareButton();\n  updatePrecisionUI();\n}");
s=s.slice(0,uiStart)+precisionUi+"\n"+ui+s.slice(uiEnd);

splice("function applyForecastHour(","function renderForecastList()",applyForecast,"apply forecast");
splice("function renderForecastList(){","async function loadForecast()",renderForecast,"render forecast");

rep('$("modelSelect").addEventListener("change",()=>{',
    '$("precisionBtn").addEventListener("click",activatePrecisionSurface);\n\n$("modelSelect").addEventListener("change",()=>{',"button event");

rep('  if(modelInfo().localTerrain&&zoom<14){zoom=14;renderMap();}',
    '  if(modelInfo().localTerrain&&zoom<15){zoom=15;renderMap();}',"surface zoom");

rep('  setStatus(modelInfo().localTerrain?"局地1kmの地形を解析中…":modelInfo().label+" の風を取得中…");',
    '  setStatus(modelInfo().localTerrain?"精密地表風：約2m風を計算中…":modelInfo().label+" の風を取得中…");',"current status");

rep('  setStatus(modelInfo().localTerrain?"固定時刻の局地1km地形補正を計算中…":"固定時刻の"+(modelInfo().dense1km?"1km間隔":"5km")+"予報を取得中…");',
    '  setStatus(modelInfo().localTerrain?"固定時刻の精密地表風（約2m）を計算中…":"固定時刻の"+(modelInfo().dense1km?"1km間隔":"5km")+"予報を取得中…");',"forecast status");

for(const n of [
  'class="versionBadge">v3.4',
  'id="precisionBtn"',
  '地表風（約2m）',
  "function neutralHeightFactor",
  "speed2m",
  "計算信頼度",
  "タップで計算",
  "表示する風速は約2m地表風のみ"
]){
  if(!s.includes(n))throw new Error("V3.4 sanity missing: "+n);
}
if(s.includes('class="versionBadge">v3.3</span>'))throw new Error("old v3.3 badge remains");

fs.mkdirSync("wind-wave-surface-v34",{recursive:true});
fs.writeFileSync("wind-wave-surface-v34/index.html",s);
console.log("Built V3.4",s.length);