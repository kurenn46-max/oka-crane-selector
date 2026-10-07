import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';
const root=process.cwd(),d=path.join(root,'gr120n-reach');
const base=['index.html','app.js','styles.css','data/gr120n.json'];
for(const f of base){const p=path.join(d,f);if(!fs.existsSync(p)||fs.statSync(p).size<80)throw Error('missing/bad '+f)}
const chunks=['00','01','02','03','04','05'].map(n=>path.join(d,'assets','chart-min-b64',n+'.txt'));
for(const p of chunks)if(!fs.existsSync(p)||fs.statSync(p).size<1000)throw Error('missing chart chunk '+p);
const h=fs.readFileSync(path.join(d,'index.html'),'utf8'),j=fs.readFileSync(path.join(d,'app.js'),'utf8');
for(const x of ['GR-120N 到達図 V1.1','23.8m','3.6mジブ','5.5mジブ','旋回芯から'])if(!h.includes(x))throw Error('HTML missing '+x);
for(const x of ['function calculate','offsetDeg','workToSvg','depth:tip.x-distance','maxAngle','chart-min-b64'])if(!j.includes(x))throw Error('JS missing '+x);
const b64=chunks.map(p=>fs.readFileSync(p,'utf8').trim()).join('');
const svg=zlib.gunzipSync(Buffer.from(b64,'base64')).toString('utf8');
if(!svg.includes('viewBox="45 46 505 704"')||svg.length<300000)throw Error('official chart vector invalid');
const D=JSON.parse(fs.readFileSync(path.join(d,'data/gr120n.json'),'utf8'));
if(D.version!=="1.0.1"||D.geometry.boom.length!==23.8||D.geometry.jibs.jib36.offsetDeg!==45||D.geometry.jibs.jib55.offsetDeg!==45)throw Error('geometry config');
const p=D.geometry.pivot,b=D.geometry.boom;
if(Math.abs(p.radius-(-1.3005))>.0001||Math.abs(p.height-2.4389)>.0001)throw Error('pivot calibration');
if(Math.abs(D.geometry.jibs.jib36.length-3.6932)>.0001||Math.abs(D.geometry.jibs.jib55.length-5.6235)>.0001)throw Error('jib calibration');
function calc(dist,height,jib=0){const a=Math.max(b.minAngle,Math.min(b.maxAngle,Math.atan2(height-p.height,dist-p.radius)*180/Math.PI)),ar=a*Math.PI/180;let x=p.radius+b.length*Math.cos(ar),y=p.height+b.length*Math.sin(ar);if(jib){const jr=(a-45)*Math.PI/180;x+=jib*Math.cos(jr);y+=jib*Math.sin(jr)}return{a,x,y,d:x-dist}}
const refs=[
  [2,5,0,37.8105,17.5025,17.0295],
  [6,16,0,61.7046,9.9811,23.3952],
  [6,8,0,37.2981,17.6323,16.8608],
  [10,10,0,33.7863,18.4801,15.6740],
  [15,5,0,8.9292,22.2111,6.1330]
];
for(const [dist,height,jib,ea,ex,ey] of refs){const q=calc(dist,height,jib);if(Math.abs(q.a-ea)>.001||Math.abs(q.x-ex)>.002||Math.abs(q.y-ey)>.002)throw Error('precision ref '+dist+','+height+' '+JSON.stringify(q))}
const j36=calc(2,5,D.geometry.jibs.jib36.length),j55=calc(2,5,D.geometry.jibs.jib55.length);
if(Math.abs(j36.x-21.1667)>.002||Math.abs(j36.y-16.5673)>.002)throw Error('jib36 ref');
if(Math.abs(j55.x-23.0818)>.002||Math.abs(j55.y-16.3257)>.002)throw Error('jib55 ref');
new Function(j.replace(/export \{ calculate \};/,'').replace(/init\(\)\.catch[\s\S]*$/,''));
console.log('GR-120N Reach V1.1 precision smoke: PASS; exact vector chart '+svg.length+' chars');
