import fs from"node:fs";import path from"node:path";
const root=process.cwd(),d=path.join(root,"gr120n-reach-v12");
for(const f of["index.html","app.js","styles.css"]){const p=path.join(d,f);if(!fs.existsSync(p)||fs.statSync(p).size<500)throw Error("missing/bad "+f)}
const h=fs.readFileSync(path.join(d,"index.html"),"utf8"),j=fs.readFileSync(path.join(d,"app.js"),"utf8");
for(const x of["GR-120N 到達図 V1.2","画像として保存","基本1を維持"])if(!h.includes(x))throw Error("HTML missing "+x);
for(const x of["renderShareCanvas","saveShareImage","1080","1920","../gr120n-reach/data/gr120n.json","../gr120n-reach/assets/chart-min-b64/"])if(!j.includes(x))throw Error("JS missing "+x);
const base=path.join(root,"gr120n-reach");
for(const f of["index.html","app.js","data/gr120n.json"])if(!fs.existsSync(path.join(base,f)))throw Error("basic1 missing "+f);
console.log("GR-120N V1.2 share-image smoke: PASS");
