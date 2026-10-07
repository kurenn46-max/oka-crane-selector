import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';
const root=process.cwd(),d=path.join(root,'gr120n-reach');
const base=['index.html','app.js','styles.css','data/gr120n.json'];
for(const f of base){const p=path.join(d,f);if(!fs.existsSync(p)||fs.statSync(p).size<80)throw Error('missing/bad '+f)}
const chunks=['00','01','02','03','04','05'].map(n=>path.join(d,'assets','chart-min-b64',n+'.txt'));
for(const p of chunks)if(!fs.existsSync(p)||fs.statSync(p).size<1000)throw Error('missing chart chunk '+p);
const h=fs.readFileSync(path.join(d,'index.html'),'utf8'),j=fs.readFileSync(path.join(d,'app.js'),'utf8');
for(const x of ['GR-120N 到達図 V1','23.8m','3.6mジブ','5.5mジブ','旋回芯から'])if(!h.includes(x))throw Error('HTML missing '+x);
for(const x of ['function calculate','offsetDeg','workToSvg','depth:tip.x-distance','maxAngle','chart-min-b64'])if(!j.includes(x))throw Error('JS missing '+x);
const b64=chunks.map(p=>fs.readFileSync(p,'utf8').trim()).join('');
const svg=zlib.gunzipSync(Buffer.from(b64,'base64')).toString('utf8');
if(!svg.includes('viewBox="45 46 505 704"')||svg.length<300000)throw Error('official chart vector invalid');
const D=JSON.parse(fs.readFileSync(path.join(d,'data/gr120n.json'),'utf8'));
if(D.geometry.boom.length!==23.8||D.geometry.jibs.jib36.offsetDeg!==45||D.geometry.jibs.jib55.offsetDeg!==45)throw Error('geometry config');
const p=D.geometry.pivot,b=D.geometry.boom,dist=2,height=5,a=Math.atan2(height-p.height,dist-p.radius);const radius=p.radius+b.length*Math.cos(a);if(Math.abs(radius-14.90)>.15)throw Error('reference calc '+radius);
new Function(j.replace(/export \{ calculate \};/,'').replace(/init\(\)\.catch[\s\S]*$/,''));
console.log('GR-120N Reach V1 smoke: PASS; exact vector chart '+svg.length+' chars');
