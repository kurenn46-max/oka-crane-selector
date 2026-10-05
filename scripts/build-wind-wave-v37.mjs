import fs from "node:fs";

let s=fs.readFileSync("wind-wave-layer-forecast-v36/index.html","utf8");
const precisionCore=fs.readFileSync("scripts/v37-precision-core.txt","utf8");
function rep(a,b,label){if(!s.includes(a))throw new Error("V3.7 target missing: "+label);s=s.replace(a,b);}
function splice(start,end,replacement,label){const a=s.indexOf(start),b=s.indexOf(end,a+start.length);if(a<0||b<0)throw new Error("V3.7 splice missing: "+label);s=s.slice(0,a)+replacement+"\n"+s.slice(b);}

rep("<title>OKA Wind Layer Forecast v3.6</title>","<title>OKA Wind Layer Forecast v3.7</title>","title");
rep('<h1>OKA Wind Layer Forecast <span class="versionBadge">v3.6</span></h1>\n<div class="sub">今見ている風情報を、そのまま未来予報へ</div>',
    '<h1>OKA Wind Layer Forecast <span class="versionBadge">v3.7</span></h1>\n<div class="sub">選択レイヤー予報＋沿岸地表風の精度補正</div>',"header");

splice("function surfaceRoughnessProfile","async function buildLocalSurfaceSamples",precisionCore+"\n","precision core");

rep('    centerRoughness:(c&&c.roughnessLabel)||"",\n    centerAngle:Number.isFinite(c&&c.shelterAngle)?c.shelterAngle:0,',
    '    centerRoughness:(c&&c.roughnessLabel)||"",\n    centerSeaShare:Number.isFinite(c&&c.seaShare)?c.seaShare:0,\n    centerAngle:Number.isFinite(c&&c.shelterAngle)?c.shelterAngle:0,',"sea share metadata");

rep('<div class="note">予報は現在選択中の風情報をそのまま引き継ぎます。精密地表風を見ている時は先の各時刻も約2m地表風、JMA MSM・Best Match・ECMWF・1km間隔表示ならその選択モデルの予報を表示します。予報ボタンだけで風レイヤーを勝手に切り替えません。</div>',
    '<div class="note">予報は現在選択中の風情報をそのまま引き継ぎます。精密地表風では風上0.2/0.4/0.7/1kmのDEM有無から海上フェッチを判定し、海面・沿岸移行域・陸上で約2m高度換算を変えます。DEM地形による遮蔽補正と地表粗度を二重に強く掛け過ぎないよう補正済み。実測ではありません。</div>',"note");

for(const n of [
  'class="versionBadge">v3.7',
  "function surfaceRoughnessProfile(hereSource,upwindSources,relief)",
  "seaShare>=.75",
  "沿岸移行域",
  "centerSeaShare",
  "二重に強く掛け過ぎないよう補正済み"
])if(!s.includes(n))throw new Error("V3.7 sanity missing: "+n);

fs.mkdirSync("wind-wave-layer-forecast-v37",{recursive:true});
fs.writeFileSync("wind-wave-layer-forecast-v37/index.html",s);
console.log("Built V3.7",s.length);