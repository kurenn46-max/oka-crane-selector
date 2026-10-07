import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';
const root=process.cwd(),d=path.join(root,'gr120n-reach');
for(const f of ['index.html','app.js','styles.css','data/gr120n.json','assets/gr120n-range-chart.svg.gz']){const p=path.join(d,f);if(!fs.existsSync(p)||fs.statSync(p).size<80)throw Error('missing/bad '+f)}
const h=fs.readFileSync(path.join(d,'index.html'),'utf8'),j=fs.readFileSync(path.join(d,'app.js'),'utf8');
const s=zlib.gunzipSync(fs.readFileSync(path.join(d,'assets/gr120n-range-chart.svg.gz'))).toString('utf8');
for(const x of ['GR-120N 到達図 V1','23.8m','3.6mジブ','5.5mジブ','旋回芯から','sourceChart'])if(!h.includes(x))throw Error('HTML missing '+x);
for(const x of ['function calculate','offsetDeg','workToSvg','depth:tip.x-distance','maxAngle','DecompressionStream','gr120n-range-chart.svg.gz'])if(!j.includes(x))throw Error('JS missing '+x);
if(!s.includes('viewBox="45 46 505 704"')||!s.includes('5.5'))throw Error('official chart crop invalid');
const D=JSON.parse(fs.readFileSync(path.join(d,'data/gr120n.json'),'utf8'));
if(D.geometry.boom.length!==23.8||D.geometry.jibs.jib36.offsetDeg!==45||D.geometry.jibs.jib55.offsetDeg!==45)throw Error('geometry config');
const p=D.geometry.pivot,b=D.geometry.boom,dist=2,height=5,a=Math.atan2(height-p.height,dist-p.radius);const radius=p.radius+b.length*Math.cos(a);if(Math.abs(radius-14.90)>.15)throw Error('reference calc '+radius);
console.log('GR-120N Reach V1 smoke: PASS');
