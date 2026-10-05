import fs from "node:fs";

let s=fs.readFileSync("wind-wave-learned-surface-v310/index.html","utf8");
function rep(a,b,label){if(!s.includes(a))throw new Error("V3.11 target missing: "+label);s=s.replace(a,b);}

rep("<title>OKA Learned Surface Wind v3.10</title>","<title>OKA Learned Surface Wind v3.11</title>","title");
rep('<h1>OKA Learned Surface Wind <span class="versionBadge">v3.10</span></h1>\n<div class="sub">選んだ予報時刻を固定して、モデルだけ切り替え</div>',
    '<h1>OKA Learned Surface Wind <span class="versionBadge">v3.11</span></h1>\n<div class="sub">精密地表風へ切り替えても選択予報時刻を保持</div>',"header");

const oldFn=[
  "function activatePrecisionSurface(){",
  "  invalidateLocationRequests();",
  "  invalidateLiveRequests();",
  "  invalidateForecast();",
  "  closeForecastPanel();",
  '  activeModel="local_terrain";',
  '  $("modelSelect").value=activeModel;',
  "  compareMode=false;",
  "  if(zoom<15)zoom=15;",
  "  updateModelUI();",
  "  updateCompareButton();",
  "  renderMap();",
  "  refreshData();",
  "}"
].join("\n");
const newFn=[
  "function activatePrecisionSurface(){",
  "  const keepForecastTime=!!selectedForecastTime;",
  "  invalidateLocationRequests();",
  "  invalidateLiveRequests();",
  "  invalidateForecast(keepForecastTime);",
  "  closeForecastPanel();",
  '  activeModel="local_terrain";',
  '  $("modelSelect").value=activeModel;',
  "  compareMode=false;",
  "  if(zoom<15)zoom=15;",
  "  updateModelUI();",
  "  updateCompareButton();",
  "  renderMap();",
  "  if(keepForecastTime)refreshSelectedForecast();",
  "  else refreshData();",
  "}"
].join("\n");
rep(oldFn,newFn,"precision time retention");

rep('<div class="note">予報カードをタップして時刻を選ぶと、その日時を固定します。JMA MSM・ECMWF・Best Match・精密地表風へモデルを切り替えても、選んだ同じ日時の予報を表示します。横スクロール位置より選択時刻を優先します。</div>',
    '<div class="note">予報カードで日時を選んだ後に「精密地表風」を押しても、その選択日時を維持したまま約2m地表風へ再計算します。JMA MSM・ECMWF・Best Matchへの切替でも同じ日時を保持します。</div>',"note");

for(const n of [
  'class="versionBadge">v3.11',
  "const keepForecastTime=!!selectedForecastTime",
  "invalidateForecast(keepForecastTime)",
  "if(keepForecastTime)refreshSelectedForecast()",
  "精密地表風」を押しても、その選択日時を維持"
])if(!s.includes(n))throw new Error("V3.11 sanity missing: "+n);

fs.mkdirSync("wind-wave-learned-surface-v311",{recursive:true});
fs.writeFileSync("wind-wave-learned-surface-v311/index.html",s);
console.log("Built V3.11",s.length);