import fs from "node:fs";

let s=fs.readFileSync("wind-wave-1km-v32/index.html","utf8");
const localFns=fs.readFileSync("scripts/v33-local-functions.txt","utf8");
const localRefresh=fs.readFileSync("scripts/v33-local-refresh.txt","utf8");
function rep(a,b,label){if(!s.includes(a))throw new Error("V3.3 target missing: "+label);s=s.replace(a,b);}
function lines(a){return a.join("\n")+"\n";}

rep("<title>OKA Wind & Wave 5km + 1km v3.2</title>","<title>OKA Wind & Wave Local Surface v3.3</title>","title");
rep('<h1>OKA Wind & Wave 5km + 1km <span class="versionBadge">v3.2</span></h1>\n<div class="sub">通常5km表示＋1km高密度グリッドを切替</div>',
'<h1>OKA Wind & Wave Local Surface <span class="versionBadge">v3.3</span></h1>\n<div class="sub">通常表示＋局地1km・100m地形補正推定</div>',"header");
rep('  <option value="dense_1km">1km高密度（MSM補間）</option>\n  <option value="jma_msm">JMA MSM（約5km）</option>',
'  <option value="dense_1km">1km間隔（MSM補間）</option>\n  <option value="local_terrain">局地1km（100m地形補正）</option>\n  <option value="jma_msm">JMA MSM（約5km）</option>',"option");
rep('<div class="note">青矢印＝モデル風の流れる方向。通常は5km圏内9〜21地点。1km高密度は中心±3kmを1km間隔49地点で表示します。元データはJMA MSM約5kmを地点補間した値で、気象庁LFM 1km直結ではありません。風裏・堤防・港内は地形で差が出ます。V3.2はV3.1の通信競合・タイムアウト対策を継承。</div>',
'<div class="note">青矢印＝風の流れる方向。局地1kmはJMA MSMを基準に、国土地理院DEM5A/5B/5C/10Bの地形から風上遮蔽・尾根・谷筋を補正した推定10m風です。内部計算は100m格子（半径1km、約317点）、表示密度はズームで自動調整。100m気象モデルやLFM直結ではありません。</div>',"note");

rep("let tideChanceViewIndex=0;\nlet tideChanceViewDay=null;",
lines([
"let tideChanceViewIndex=0;",
"let tideChanceViewDay=null;",
"let terrainTileCache=new Map();",
'let localSurfaceMeta={centerFactor:1,centerAngle:0,centerElevation:null,computed:0,terrainSource:""};',
"const TERRAIN_SOURCES=[",
'  {id:"dem5a_png",z:15,label:"DEM5A"},',
'  {id:"dem5b_png",z:15,label:"DEM5B"},',
'  {id:"dem5c_png",z:15,label:"DEM5C"},',
'  {id:"dem_png",z:14,label:"DEM10B"}',
"];"
]).trimEnd(),"state");

rep('  dense_1km:{label:"1km高密度（MSM補間）",param:"jma_msm",maxHours:96,gust:false,dense1km:true,note:"1km間隔49地点表示。元データはJMA MSM約5kmの地点補間で、LFM 1km直結ではありません"},\n  jma_msm:',
'  dense_1km:{label:"1km間隔（MSM補間）",param:"jma_msm",maxHours:96,gust:false,dense1km:true,note:"1km間隔49地点表示。元データはJMA MSM約5kmの地点補間です"},\n  local_terrain:{label:"局地1km（100m地形補正）",param:"jma_msm",maxHours:96,gust:false,localTerrain:true,note:"半径1kmを100m内部格子で推定。JMA MSM＋国土地理院DEM地形補正"},\n  jma_msm:',"model");

const uiStart=s.indexOf("function updateModelUI(){"),uiEnd=s.indexOf("\nfunction angleDiff",uiStart);
if(uiStart<0||uiEnd<0)throw new Error("updateModelUI block missing");
const ui=lines([
"function updateModelUI(){",
"  const m=modelInfo();",
'  const tail=m.localTerrain?"｜時間カードはMSM基準、時刻を選ぶと100m地形補正を再計算":"｜中心現在値はCurrent優先・地図矢印は時間値";',
'  $("modelNote").textContent=m.note+tail;',
'  const limited=m.maxHours<=96,rangeBtns=document.querySelectorAll(".forecastBtns button");',
"  rangeBtns.forEach(btn=>{",
'    if(btn.dataset.range==="168"&&limited){btn.dataset.range="96";btn.textContent="4日";}',
'    else if(btn.dataset.range==="96"&&!limited){btn.dataset.range="168";btn.textContent="7日";}',
"  });",
"  if(forecastRange>m.maxHours)forecastRange=m.maxHours;",
"  if((m.dense1km||m.localTerrain)&&compareMode)compareMode=false;",
"  updateCompareButton();",
"}"
]);
s=s.slice(0,uiStart)+ui+s.slice(uiEnd);

const cbStart=s.indexOf("function updateCompareButton(){"),cbEnd=s.indexOf("\n\n\nfunction project",cbStart);
if(cbStart<0||cbEnd<0)throw new Error("compare block missing");
const cb=lines([
"function updateCompareButton(){",
"  const locked=!!(modelInfo().dense1km||modelInfo().localTerrain);",
'  $("compareBtn").disabled=locked;',
'  $("compareBtn").classList.toggle("active",!locked&&compareMode);',
'  $("compareBtn").textContent=locked?"3モデル比較 —":(compareMode?"3モデル比較 ON":"3モデル比較 OFF");',
'  if(modelInfo().localTerrain)$("compareSummary").textContent="局地1kmはDEM地形補正を優先するため3モデル比較を停止";',
'  else if(modelInfo().dense1km)$("compareSummary").textContent="1km間隔時は通信量を抑えるため3モデル比較を停止";',
'  else if(!compareMode)$("compareSummary").textContent="";',
"}"
]);
s=s.slice(0,cbStart)+cb+s.slice(cbEnd);

const ins=s.indexOf("function dense1kmPoints(){");
if(ins<0)throw new Error("dense function missing");
s=s.slice(0,ins)+localFns+"\n"+s.slice(ins);

rep("  const px=5000/metersPerPixel(center.lat,zoom);",
"  const rangeMeters=modelInfo().localTerrain?1000:5000;\n  const px=rangeMeters/metersPerPixel(center.lat,zoom);","circle");

const r0=s.indexOf("function renderWindMarkers(){"),r1=s.indexOf("\nfunction normalizeJaAddress",r0);
if(r0<0||r1<0)throw new Error("render block missing");
const render=lines([
"function renderWindMarkers(){",
'  const layer=$("windLayer");layer.replaceChildren();',
'  const wrap=$("mapWrap"),w=wrap.clientWidth,h=wrap.clientHeight;if(!w||!h)return;',
"  const cp=project(center.lat,center.lng,zoom),stride=modelInfo().localTerrain?localRenderStride():1;",
"  windSamples.forEach(x=>{",
"    if(!Number.isFinite(x.speed)||!Number.isFinite(x.dir))return;",
"    if(modelInfo().localTerrain&&!x.isCenter&&Number.isFinite(x.gx)&&Number.isFinite(x.gy)){",
"      if((Math.abs(x.gx)%stride)!==0||(Math.abs(x.gy)%stride)!==0)return;",
"    }",
"    const p=project(x.lat,x.lng,zoom),sx=w/2+(p.x-cp.x),sy=h/2+(p.y-cp.y);",
"    if(sx<-70||sx>w+70||sy<-70||sy>h+70)return;",
'    const el=document.createElement("div");el.className="marker"+(x.compareLevel?(" "+x.compareLevel):"");',
'    el.style.left=sx+"px";el.style.top=sy+"px";',
'    const to=(x.dir+180)%360,prefix=x.estimated?"≈":"";',
'    el.innerHTML=\'<div class="arrow" style="transform:rotate(\'+to+\'deg)">↑</div><div class="tag">\'+prefix+x.speed.toFixed(1)+\' m/s</div>\';',
"    layer.appendChild(el);",
"  });",
"}"
]);
s=s.slice(0,r0)+render+s.slice(r1);

const rf=s.indexOf("async function refreshSelectedForecast(){");
if(rf<0)throw new Error("refresh selected missing");
s=s.slice(0,rf)+localRefresh+"\n"+s.slice(rf);

rep('async function refreshSelectedForecast(){\n  if(!selectedForecastTime){refreshData();return}\n  const req=++dataRequestSeq;\n  loading=true;\n  clearError();\n  $("compareSummary").textContent="";\n  setStatus("固定時刻の"+(modelInfo().dense1km?"1km高密度":"5km")+"予報を取得中…");\n  $("place").textContent=placeName+"　("+(modelInfo().dense1km?"1km高密度":"青円5km")+")";\n  try{',
'async function refreshSelectedForecast(){\n  if(!selectedForecastTime){refreshData();return}\n  const req=++dataRequestSeq;loading=true;clearError();$("compareSummary").textContent="";\n  setStatus(modelInfo().localTerrain?"固定時刻の局地1km地形補正を計算中…":"固定時刻の"+(modelInfo().dense1km?"1km間隔":"5km")+"予報を取得中…");\n  $("place").textContent=placeName+"　("+rangeLabel()+")";\n  try{\n    if(modelInfo().localTerrain){await refreshLocalSelected(req);return;}',"selected branch");

rep('async function refreshData(){\n  const req=++dataRequestSeq;\n  loading=true;\n  clearError();\n  setStatus(modelInfo().label+" の風を取得中…");\n  $("place").textContent=placeName+"　("+(modelInfo().dense1km?"1km高密度":"青円5km")+")";\n  try{\n    const ps=samplePoints();',
'async function refreshData(){\n  const req=++dataRequestSeq;loading=true;clearError();\n  setStatus(modelInfo().localTerrain?"局地1kmの地形を解析中…":modelInfo().label+" の風を取得中…");\n  $("place").textContent=placeName+"　("+rangeLabel()+")";\n  try{\n    if(modelInfo().localTerrain){await refreshLocalCurrent(req);return;}\n    const ps=samplePoints();',"current branch");

s=s.replaceAll("1km高密度","1km間隔");
rep('$("place").textContent="地図で選択した地点　(青円5km)";','$("place").textContent="地図で選択した地点　("+rangeLabel()+")";',"drag");
rep('  if(modelInfo().dense1km&&zoom<13){\n    zoom=13;\n    renderMap();\n  }','  if(modelInfo().dense1km&&zoom<13){zoom=13;renderMap();}\n  if(modelInfo().localTerrain&&zoom<14){zoom=14;renderMap();}',"zoom");
rep("  if(modelInfo().dense1km)return;","  if(modelInfo().dense1km||modelInfo().localTerrain)return;","compare guard");
rep("  updateModelUI();\n  if(selectedForecastTime)refreshSelectedForecast();","  updateModelUI();\n  renderMap();\n  if(selectedForecastTime)refreshSelectedForecast();","model render");

for(const n of ['class="versionBadge">v3.3','value="local_terrain"',"function localGridPoints","function terrainAdjustPoint","dem5a_png","100m内部"]){
  if(!s.includes(n))throw new Error("V3.3 sanity missing: "+n);
}
fs.mkdirSync("wind-wave-local-v33",{recursive:true});
fs.writeFileSync("wind-wave-local-v33/index.html",s);
console.log("Built V3.3",s.length);
