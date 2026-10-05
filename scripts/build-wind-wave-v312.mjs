import fs from "node:fs";

let s=fs.readFileSync("wind-wave-learned-surface-v311/index.html","utf8");
const confidenceCore=fs.readFileSync("scripts/v312-confidence-core.txt","utf8");
const surfaceForecast=fs.readFileSync("scripts/v312-surface-forecast.txt","utf8");
function rep(a,b,label){if(!s.includes(a))throw new Error("V3.12 target missing: "+label);s=s.replace(a,b);}
function splice(start,end,replacement,label){const a=s.indexOf(start),b=s.indexOf(end,a+start.length);if(a<0||b<0)throw new Error("V3.12 splice missing: "+label);s=s.slice(0,a)+replacement+"\n"+s.slice(b);}

rep("<title>OKA Learned Surface Wind v3.11</title>","<title>OKA Learned Surface Wind v3.12</title>","title");
rep('<h1>OKA Learned Surface Wind <span class="versionBadge">v3.11</span></h1>\n<div class="sub">精密地表風へ切り替えても選択予報時刻を保持</div>',
    '<h1>OKA Learned Surface Wind <span class="versionBadge">v3.12</span></h1>\n<div class="sub">7日地表風＋予報精度目安％</div>',"header");

rep('  local_terrain:{label:"精密地表風（約2m）",param:"jma_msm",maxHours:96,gust:false,localTerrain:true,note:"MSMを基準に地形風向補正。実測学習があれば3モデルの重みと地点補正を自動更新"},',
    '  local_terrain:{label:"精密地表風（約2m）",param:"jma_msm",maxHours:168,gust:false,localTerrain:true,note:"JMAを優先し、JMA終了後はBest Match＋ECMWFで7日先まで継続。精度目安％を表示"},',"surface 7-day horizon");

const sfStart=s.indexOf("let surfaceForecastValues=[];");
const sfEnd=s.indexOf("const SURFACE_LEARN_KEY",sfStart);
if(sfStart<0||sfEnd<0)throw new Error("V3.12 surface forecast block missing");
s=s.slice(0,sfStart)+surfaceForecast+"\n"+s.slice(sfEnd);

splice("function blendPrecisionRows","async function recordSurfaceObservation",confidenceCore+"\n","precision blend/confidence core");

rep("if(modelInfo().localTerrain)await buildCenterSurfaceForecast(hourly);",
    "if(modelInfo().localTerrain)await buildCenterSurfaceForecast(hourly,forecastRows[0]&&forecastRows[0].precision_meta||[]);","surface forecast metadata");

rep('<div class="hourMeta">地表 約2m\'+(sf&&Number.isFinite(sf.confidence)?\'<br>信頼度 \'+Math.round(sf.confidence*100)+\'%\':\'\')+\'</div>\';',
    '<div class="hourMeta">地表 約2m\'+(sf&&Number.isFinite(sf.accuracyPct)?\'<br>精度目安 \'+sf.accuracyPct+\'%\':\'\')+(sf&&sf.sourceLabel?\'<br>\'+sf.sourceLabel:\'\')+\'</div>\';',"forecast card accuracy");

const rsStart=s.indexOf("async function refreshLocalSelected(req){");
const rsEnd=s.indexOf("async function refreshSelectedForecast",rsStart);
if(rsStart<0||rsEnd<0)throw new Error("refreshLocalSelected missing");
let rs=s.slice(rsStart,rsEnd);
rs=rs.replace(
  '  const cc=windSamples.find(x=>x.isCenter)||windSamples[0]||{};\n  $("wind").textContent=Number.isFinite(cc.speed)?"≈"+cc.speed.toFixed(1)+" m/s":"-- m/s";',
  '  const cc=windSamples.find(x=>x.isCenter)||windSamples[0]||{};\n  const precisionMeta=rows[0]&&rows[0].precisionMeta||{};\n  const selectedAccuracy=surfaceForecastAccuracy(cc.confidence,precisionMeta,cc.calibrationN);\n  $("wind").textContent=Number.isFinite(cc.speed)?"≈"+cc.speed.toFixed(1)+" m/s":"-- m/s";'
);
rs=rs.replace(
  '  $("gust").textContent=Number.isFinite(cc.confidence)?Math.round(cc.confidence*100)+"%":"--";',
  '  $("gust").textContent=Number.isFinite(selectedAccuracy)?selectedAccuracy+"%":"--";\n  $("gustLabel").textContent="予報精度目安";\n  $("gustSub").textContent=precisionSourceLabel(precisionMeta.usedSources||precisionMeta.sources||[]);'
);
rs=rs.replace(
  '"点 / 地形"+localSurfaceMeta.centerFactor.toFixed(2)+"× / 高度"+localSurfaceMeta.centerHeightFactor.toFixed(2)+"×");',
  '"点 / 地形"+localSurfaceMeta.centerFactor.toFixed(2)+"× / 高度"+localSurfaceMeta.centerHeightFactor.toFixed(2)+"× / 精度目安"+selectedAccuracy+"%");'
);
s=s.slice(0,rsStart)+rs+s.slice(rsEnd);

rep('<div class="note">予報カードで日時を選んだ後に「精密地表風」を押しても、その選択日時を維持したまま約2m地表風へ再計算します。JMA MSM・ECMWF・Best Matchへの切替でも同じ日時を保持します。</div>',
    '<div class="note">精度目安％は「的中率」ではなく、予報先の長さ・利用できるモデル・モデル同士の一致度・地形計算信頼度・現地学習量を合成した目安です。JMA MSMが終了した先はBest Match＋ECMWFへ自動継続し、最大7日先まで約2m地表風を表示します。</div>',"accuracy disclosure");

for(const n of [
  'class="versionBadge">v3.12',
  'maxHours:168,gust:false,localTerrain:true',
  "function surfaceForecastAccuracy",
  "function precisionAgreementScore",
  "getPrecisionWindForecast(ps)",
  'precisionModelSets(ps,"forecast",null,168)',
  "accuracyPct",
  "予報精度目安",
  "Best Match＋ECMWFへ自動継続",
  "的中率」ではなく"
])if(!s.includes(n))throw new Error("V3.12 sanity missing: "+n);

fs.mkdirSync("wind-wave-learned-surface-v312",{recursive:true});
fs.writeFileSync("wind-wave-learned-surface-v312/index.html",s);
console.log("Built V3.12",s.length);