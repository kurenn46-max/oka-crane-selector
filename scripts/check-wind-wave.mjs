import fs from "node:fs";

const files=[
  ["v1","wind-wave-5km/index.html"],
  ["v2","wind-wave-5km-v2/index.html"],
  ["v3","wind-wave-5km-v3/index.html"]
];

let failed=false;
function fail(msg){console.error("FAIL:",msg);failed=true}
function ok(msg){console.log("OK:",msg)}

for(const [name,path] of files){
  if(!fs.existsSync(path)){fail(name+" missing: "+path);continue}
  const html=fs.readFileSync(path,"utf8");
  const m=html.match(/<script>([\s\S]*?)<\/script>/);
  if(!m){fail(name+" script tag missing");continue}
  try{new Function(m[1]);ok(name+" JavaScript syntax")}
  catch(e){fail(name+" JavaScript syntax: "+e.message)}

  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  const dup=[...new Set(ids.filter((x,i)=>ids.indexOf(x)!==i))];
  if(dup.length)fail(name+" duplicate ids: "+dup.join(","));
  else ok(name+" unique ids");

  const refs=[...html.matchAll(/\$\("([^"]+)"\)/g)].map(x=>x[1]);
  const missing=[...new Set(refs.filter(x=>!ids.includes(x)))];
  if(missing.length)fail(name+" missing DOM ids: "+missing.join(","));
  else ok(name+" DOM references");
}

const v3=fs.existsSync("wind-wave-5km-v3/index.html")
  ?fs.readFileSync("wind-wave-5km-v3/index.html","utf8"):"";
const required=[
  ["v3 badge",'class="versionBadge">v3'],
  ["timeout guard","function fetchWithTimeout"],
  ["request race guard","dataRequestSeq"],
  ["location race guard","locationRequestSeq"],
  ["forecast center-only","中心1地点・軽量モード"],
  ["comparison dedupe","getThreeModelComparison(ps,windPromise)"],
  ["map GPU drag",'style.transform="translate("+dx+"px,"+dy+"px)"'],
  ["tide pointer swipe",'panel.addEventListener("pointermove"'],
  ["JMA tide priority","JMA_TIDE_MAX_KM=45"],
  ["sea temperature","sea_surface_temperature"],
  ["offline hold",'オフライン：最後の表示を保持']
];
for(const [label,needle] of required){
  if(v3.includes(needle))ok(label); else fail(label+" missing");
}

if(failed)process.exit(1);
console.log("Wind & Wave smoke checks passed");
