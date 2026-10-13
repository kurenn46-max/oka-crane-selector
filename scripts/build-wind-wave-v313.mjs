import fs from "node:fs";

// V3.13 is generated from V3.12; the previous release remains untouched.
let s=fs.readFileSync("wind-wave-learned-surface-v312/index.html","utf8");
function rep(a,b,label){
  if(!s.includes(a))throw new Error("V3.13 target missing: "+label);
  s=s.replace(a,b);
}
function splice(start,end,replacement,label){
  const i=s.indexOf(start),j=s.indexOf(end,i+start.length);
  if(i<0||j<=i)throw new Error("V3.13 splice missing: "+label);
  s=s.slice(0,i)+replacement+"\n"+s.slice(j);
}
rep("<title>OKA Learned Surface Wind v3.12</title>","<title>OKA Learned Surface Wind v3.13</title>","title");
rep('class="versionBadge">v3.12','class="versionBadge">v3.13',"badge");
rep("7日地表風＋予報精度目安％","DEM障害検知＋沿岸格子診断","description");

// Failed DEM tiles are cached within one calculation but retried on the next refresh.
splice("async function terrainTile(source,tx,ty){","function decodeElevation(data,px,py){","const terrainFailedTileKeys=new Set();\nfunction clearFailedTerrainTiles(){\n  for(const key of terrainFailedTileKeys)terrainTileCache.delete(key);\n  terrainFailedTileKeys.clear();\n}\nasync function terrainTile(source,tx,ty){\n  const key=source.id+\":\"+source.z+\":\"+tx+\":\"+ty;\n  if(terrainTileCache.has(key))return terrainTileCache.get(key);\n  const pending=(async()=>{\n    try{\n      const u=\"https://cyberjapandata.gsi.go.jp/xyz/\"+source.id+\"/\"+source.z+\"/\"+tx+\"/\"+ty+\".png\";\n      const r=await fetchWithTimeout(u,{cache:\"force-cache\"},9000);\n      if(!r.ok)return null;\n      return await blobImageData(await r.blob());\n    }catch(_){return null;}\n  })();\n  terrainTileCache.set(key,pending);\n  const data=await pending;\n  if(data===null)terrainFailedTileKeys.add(key);\n  else terrainFailedTileKeys.delete(key);\n  if(terrainTileCache.size>80){\n    const oldest=terrainTileCache.keys().next().value;\n    if(oldest){terrainTileCache.delete(oldest);terrainFailedTileKeys.delete(oldest);}\n  }\n  return data;\n}"+"\n","DEM tile retry");
splice("async function elevationAt(lat,lng){","function terrainShelterFactor(","async function elevationAt(lat,lng){\n  let receivedTile=false;\n  for(const source of TERRAIN_SOURCES){\n    const p=terrainPixel(lat,lng,source.z);\n    const data=await terrainTile(source,p.tx,p.ty);\n    if(data)receivedTile=true;\n    const elev=decodeElevation(data,p.px,p.py);\n    if(Number.isFinite(elev))return{elev,source:source.label};\n  }\n  return receivedTile?{elev:0,source:\"海面/無効\"}:{elev:null,source:\"DEM取得失敗\"};\n}"+"\n","DEM missing vs sea");
rep("async function terrainAdjustPoint(p,base,options={}){",
    "function unavailableSurfaceWind(base){\n  return{\n    speed:null,dir:base.dir,rawSurfaceSpeed:null,rawSurfaceDir:base.dir,\n    factor:1,heightFactor:1,terrainTurn:0,confidence:0,calibrationN:0,\n    calibrationFactor:1,calibrationAdd:0,calibrationDirOffset:0,\n    terrainSource:\"DEM取得失敗\",roughnessLabel:\"DEM未取得\",seaShare:0\n  };\n}"+'\nasync function terrainAdjustPoint(p,base,options={}){',"fail-closed helper");
rep("  const here=await elevationAt(p.lat,p.lng),e0=here.elev,up=[],upSources=[];",
    '  const here=await elevationAt(p.lat,p.lng),e0=here.elev,up=[],upSources=[];\n  if(here.source==="DEM取得失敗"||!Number.isFinite(e0))return unavailableSurfaceWind(base);',
    "missing target DEM");
rep("  const prominence=e0-((up[0]??e0)+down.elev)/2;",
    '  if(upSources.includes("DEM取得失敗")||[down,left,right,leftDiag,rightDiag].some(x=>x.source==="DEM取得失敗"))return unavailableSurfaceWind(base);\n  const prominence=e0-((up[0]??e0)+down.elev)/2;',
    "missing neighbor DEM");
rep("function surfaceForecastAccuracy(terrainConfidence,meta={},learningN=0){",
    'function surfaceForecastAccuracy(terrainConfidence,meta={},learningN=0){\n  if(!Number.isFinite(terrainConfidence)||terrainConfidence<=0)return NaN;',
    "accuracy guard");
rep("async function refreshLocalSelected(req){\n  const anchors=localWindAnchors();",
    "async function refreshLocalSelected(req){\n  clearFailedTerrainTiles();\n  const anchors=localWindAnchors();",
    "selected retry");
rep("async function refreshLocalCurrent(req){\n  const anchors=localWindAnchors();",
    "async function refreshLocalCurrent(req){\n  clearFailedTerrainTiles();\n  const anchors=localWindAnchors();",
    "current retry");

// Keep land-priority selection as default until accuracy is measured with observations.
rep('<div id="modelNote" class="modelNote">Open-Meteo Best Match</div>',
    '<div class="modelRow" style="margin-top:6px"><label for="windCellSelect">風の取得格子</label><select id="windCellSelect"><option value="land">陸優先（従来）</option><option value="sea">海優先（比較用）</option><option value="nearest">最寄り（比較用）</option></select></div>\n<div id="modelNote" class="modelNote">Open-Meteo Best Match</div>\n<div id="gridDiag" class="modelNote" aria-live="polite">API応答座標：取得待ち</div>',
    "grid selector");
rep("function modelInfo(){","let windCellChoice=\"land\";\nfunction describeGridResponse(rows,ps){\n  if(!Array.isArray(rows)||!Array.isArray(ps)||rows.length!==ps.length)\n    throw new Error(\"風API地点数が一致しません\");\n  const valid=rows.map(r=>{\n    const lat=Number(r&&r.latitude),lng=Number(r&&r.longitude);\n    return Number.isFinite(lat)&&Number.isFinite(lng)?lat.toFixed(5)+\",\"+lng.toFixed(5):null;\n  }).filter(Boolean);\n  const count=new Set(valid).size;\n  const suffix=valid.length===rows.length?\"\":\" / 応答座標欠損 \"+(rows.length-valid.length)+\"件\";\n  return \"API応答座標 \"+count+\"種類 / 地図表示 \"+ps.length+\"地点\"+suffix+\n      \"（同じ座標は同じ元格子の可能性。地点別の実測ではありません）\";\n}\nfunction showWindGridDiagnosis(rows,ps){\n  $(\"gridDiag\").textContent=describeGridResponse(rows,ps);\n}"+"\nfunction modelInfo(){","diagnostics");

// Select the Open-Meteo model cell consistently for all weather-model requests.
let apiCount=0;
s=s.split("\n").map(line=>{
  if(line.startsWith('  u.searchParams.set("models",')){
    apiCount++;
    return line+'\n  u.searchParams.set("cell_selection",windCellChoice);';
  }
  return line;
}).join("\n");
if(apiCount<5)throw new Error("V3.13 wind API injection incomplete: "+apiCount);

// Match response coordinates to the number of display locations; never claim 21 model cells.
const sampleNeedle="    windSamples=rows.map((x,i)=>({";
let normalCount=0;
s=s.replaceAll(sampleNeedle,()=>{
  normalCount++;
  return "    showWindGridDiagnosis(rows,ps);\n"+sampleNeedle;
});
if(normalCount!==2)throw new Error("V3.13 normal map sampling sites: "+normalCount);

// Center terrain validation is visible instead of a deceptively confident wind estimate.
let localCount=0;
s=s.replace(/(  windSamples=await buildLocalSurfaceSamples\(rows,anchors,(?:true|false)\);\n)/g,(_match,group)=>{
  localCount++;
  return group+
    '  $("gridDiag").textContent=localSurfaceMeta.centerConfidence<=0?' +
    '"⚠️ 標高DEMを取得できません。精密地表風は計算不可。更新で再試行します。":' +
    '"地形計算：100m内部"+localSurfaceMeta.computed+"地点 / DEM "+localSurfaceMeta.terrainSource;\n';
});
if(localCount!==2)throw new Error("V3.13 terrain refresh count: "+localCount);

rep('$("modelSelect").addEventListener("change",()=>{',
    '$("windCellSelect").addEventListener("change",()=>{\n' +
    '  windCellChoice=$("windCellSelect").value;\n' +
    '  $("gridDiag").textContent="取得格子を切り替え中…";\n' +
    '  if(selectedForecastTime)refreshSelectedForecast();else refreshData();\n' +
    '  if($("forecastPanel").classList.contains("open"))loadForecast();\n' +
    '});\n$("modelSelect").addEventListener("change",()=>{',
    "grid selector action");

if(!s.includes("function clearFailedTerrainTiles") || !s.includes("function showWindGridDiagnosis") ||
   !s.includes('cell_selection",windCellChoice') || !s.includes("function unavailableSurfaceWind") ||
   !s.includes("versionBadge\">v3.13"))throw new Error("V3.13 integrity guard");

fs.mkdirSync("wind-wave-learned-surface-v313",{recursive:true});
fs.writeFileSync("wind-wave-learned-surface-v313/index.html",s);
console.log("Built V3.13",s.length,"bytes; wind API sites:",apiCount);
