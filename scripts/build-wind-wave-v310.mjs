import fs from "node:fs";

let s=fs.readFileSync("wind-wave-learned-surface-v39/index.html","utf8");
function rep(a,b,label){if(!s.includes(a))throw new Error("V3.10 target missing: "+label);s=s.replace(a,b);}

rep("<title>OKA Learned Surface Wind v3.9</title>","<title>OKA Learned Surface Wind v3.10</title>","title");
rep('<h1>OKA Learned Surface Wind <span class="versionBadge">v3.9</span></h1>\n<div class="sub">予報を送った時間をモデル変更後もそのまま保持</div>',
    '<h1>OKA Learned Surface Wind <span class="versionBadge">v3.10</span></h1>\n<div class="sub">選んだ予報時刻を固定して、モデルだけ切り替え</div>',"header");

rep("  const target=forecastViewportTime||selectedForecastTime;",
    "  const target=selectedForecastTime||forecastViewportTime;","selected time priority");

rep("  if(forecastWasOpen)captureForecastViewport();",
    "  if(forecastWasOpen&&!selectedForecastTime)captureForecastViewport();","do not override locked time");

rep('<div class="note">予報を横へ送った位置は時刻で保持します。モデルを変更しても同じ予報時刻へ自動復帰し、モデルごとの時間範囲が短い場合だけ最も近い時刻へ合わせます。精密地表風の地形・実測学習機能はV3.8から継続。</div>',
    '<div class="note">予報カードをタップして時刻を選ぶと、その日時を固定します。JMA MSM・ECMWF・Best Match・精密地表風へモデルを切り替えても、選んだ同じ日時の予報を表示します。横スクロール位置より選択時刻を優先します。</div>',"note");

for(const n of [
  'class="versionBadge">v3.10',
  "const target=selectedForecastTime||forecastViewportTime",
  "if(forecastWasOpen&&!selectedForecastTime)captureForecastViewport()",
  "横スクロール位置より選択時刻を優先します"
])if(!s.includes(n))throw new Error("V3.10 sanity missing: "+n);

fs.mkdirSync("wind-wave-learned-surface-v310",{recursive:true});
fs.writeFileSync("wind-wave-learned-surface-v310/index.html",s);
console.log("Built V3.10",s.length);