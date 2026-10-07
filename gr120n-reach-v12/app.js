const $ = (id) => document.getElementById(id);
let DATA;
let mode = 'boom';

const SVG_NS = 'http://www.w3.org/2000/svg';
const state = { distance: 0, height: 0 };

function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
function rad(d){ return d*Math.PI/180; }
function fmt(v){ return Number.isFinite(v) ? v.toFixed(1) : '--'; }

function workToSvg(x,h){
  const c=DATA.chart, t=c.pdfToSvg;
  const xp=c.pdfGridOrigin.x + x*c.pdfMeters;
  const yp=c.pdfGridOrigin.y + h*c.pdfMeters;
  return {x:t.a*xp, y:t.f + t.d*yp};
}

function calculate(distance,height,selected=mode){
  const g=DATA.geometry, p=g.pivot, b=g.boom;
  const dx=distance-p.radius, dy=height-p.height;
  const rawAngle=Math.atan2(dy,dx)*180/Math.PI;
  const angle=clamp(rawAngle,b.minAngle,b.maxAngle);
  const mainTip={
    x:p.radius+b.length*Math.cos(rad(angle)),
    h:p.height+b.length*Math.sin(rad(angle))
  };
  let tip={...mainTip}, jibTip=null;
  if(selected!=='boom'){
    const j=g.jibs[selected];
    const ja=angle-j.offsetDeg;
    jibTip={
      x:mainTip.x+j.length*Math.cos(rad(ja)),
      h:mainTip.h+j.length*Math.sin(rad(ja))
    };
    tip=jibTip;
  }
  return {
    rawAngle,angle,mainTip,jibTip,tip,
    radius:tip.x,
    depth:tip.x-distance,
    valid:rawAngle>=b.minAngle && rawAngle<=b.maxAngle && distance>0 && height>0
  };
}

function svgEl(tag,attrs={}){
  const el=document.createElementNS(SVG_NS,tag);
  for(const [k,v] of Object.entries(attrs)) el.setAttribute(k,String(v));
  return el;
}
function addLine(g,a,b,attrs={}){ g.append(svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,...attrs})); }
function addText(g,p,text,attrs={}){ const t=svgEl('text',{x:p.x,y:p.y,...attrs});t.textContent=text;g.append(t); }
function addCircle(g,p,r,attrs={}){g.append(svgEl('circle',{cx:p.x,cy:p.y,r,...attrs}));}

function draw(calc){
  const g=$('drawing'); g.replaceChildren();
  const p=DATA.geometry.pivot;
  const pivot=workToSvg(p.radius,p.height);
  const buildingBottom=workToSvg(state.distance,0);
  const buildingTop=workToSvg(state.distance,state.height);
  const mainTip=workToSvg(calc.mainTip.x,calc.mainTip.h);
  const tip=workToSvg(calc.tip.x,calc.tip.h);
  const radiusGround=workToSvg(calc.radius,0);
  const radiusAtRoof=workToSvg(calc.radius,state.height);
  const red='#ef312f', green='#20bf55', violet='#7c3aed';
  const sw=1.7;

  addLine(g,buildingBottom,buildingTop,{stroke:red,'stroke-width':sw,'vector-effect':'non-scaling-stroke'});
  addLine(g,buildingTop,radiusAtRoof,{stroke:red,'stroke-width':sw,'vector-effect':'non-scaling-stroke'});

  const zero=workToSvg(0,0), dimY=workToSvg(0,-0.55);
  const dimA={x:zero.x,y:dimY.y}, dimB={x:buildingBottom.x,y:dimY.y};
  addLine(g,dimA,dimB,{stroke:red,'stroke-width':1.15,'vector-effect':'non-scaling-stroke'});
  addLine(g,{x:dimA.x,y:dimA.y-3},{x:dimA.x,y:dimA.y+3},{stroke:red,'stroke-width':1.15,'vector-effect':'non-scaling-stroke'});
  addLine(g,{x:dimB.x,y:dimB.y-3},{x:dimB.x,y:dimB.y+3},{stroke:red,'stroke-width':1.15,'vector-effect':'non-scaling-stroke'});

  addLine(g,pivot,mainTip,{stroke:red,'stroke-width':2.1,'vector-effect':'non-scaling-stroke'});
  if(calc.jibTip) addLine(g,mainTip,tip,{stroke:violet,'stroke-width':2.4,'vector-effect':'non-scaling-stroke'});
  addLine(g,radiusGround,tip,{stroke:green,'stroke-width':2.1,'vector-effect':'non-scaling-stroke'});

  addCircle(g,pivot,2.2,{fill:red,stroke:'white','stroke-width':1});
  addCircle(g,tip,2.2,{fill:calc.jibTip?violet:red,stroke:'white','stroke-width':1});

  const roofMid={x:(buildingTop.x+radiusAtRoof.x)/2,y:buildingTop.y-5};
  addText(g,{x:(dimA.x+dimB.x)/2,y:dimA.y-4},`建物まで ${fmt(state.distance)}m`,{fill:red,'text-anchor':'middle',class:'overlay-dim'});
  addText(g,{x:buildingTop.x+5,y:(buildingTop.y+buildingBottom.y)/2},`高さ ${fmt(state.height)}m`,{fill:red,class:'overlay-dim',transform:`rotate(-90 ${buildingTop.x+5} ${(buildingTop.y+buildingBottom.y)/2})`});
  addText(g,roofMid,`奥へ ${fmt(calc.depth)}m`,{fill:red,'text-anchor':'middle',class:'overlay-dim'});
  addText(g,{x:radiusGround.x+5,y:(radiusGround.y+tip.y)/2},`半径 ${fmt(calc.radius)}m`,{fill:green,class:'overlay-dim',transform:`rotate(-90 ${radiusGround.x+5} ${(radiusGround.y+tip.y)/2})`});
  addText(g,{x:pivot.x+8,y:pivot.y-6},`${fmt(calc.angle)}°`,{fill:'#b42318',class:'overlay-label'});
  if(calc.jibTip) addText(g,{x:(mainTip.x+tip.x)/2,y:(mainTip.y+tip.y)/2-5},DATA.geometry.jibs[mode].label,{fill:violet,'text-anchor':'middle',class:'overlay-label'});
}

function update(){
  state.distance=Number($('distance').value);
  state.height=Number($('height').value);
  const ready=Number.isFinite(state.distance)&&Number.isFinite(state.height)&&state.distance>0&&state.height>0;
  $('saveImageBtn').disabled=!ready;
  $('notice').classList.add('hidden');
  if(!ready){
    for(const id of ['radiusResult','depthResult','angleResult','tipHeightResult']) $(id).textContent='--';
    $('drawing').replaceChildren();
    $('warning').classList.add('hidden');
    return;
  }
  const calc=calculate(state.distance,state.height,mode);
  $('radiusResult').textContent=fmt(calc.radius);
  $('depthResult').textContent=fmt(calc.depth);
  $('angleResult').textContent=fmt(calc.angle);
  $('tipHeightResult').textContent=fmt(calc.tip.h);

  const warn=$('warning');
  if(calc.rawAngle>DATA.geometry.boom.maxAngle){
    warn.textContent=`必要ブーム角は ${fmt(calc.rawAngle)}°。上限 ${DATA.geometry.boom.maxAngle}° を超えます。`;
    warn.classList.remove('hidden');
  } else if(calc.rawAngle<DATA.geometry.boom.minAngle){
    warn.textContent='入力条件ではブーム角が0°未満になります。';
    warn.classList.remove('hidden');
  } else if(calc.depth<0){
    warn.textContent='この条件では先端作業半径が建物手前まで届きません。';
    warn.classList.remove('hidden');
  } else warn.classList.add('hidden');
  draw(calc);
}

async function loadSourceChart(){
  if(typeof DecompressionStream==='undefined') throw Error('gzip svg unsupported');
  const names=['00','01','02','03','04','05'];
  const parts=await Promise.all(names.map(async n=>{
    const r=await fetch('../gr120n-reach/assets/chart-min-b64/'+n+'.txt',{cache:'force-cache'});
    if(!r.ok) throw Error('chart part '+n+' '+r.status);
    return (await r.text()).trim();
  }));
  const bin=atob(parts.join(''));
  const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const svg=await new Response(stream).text();
  if(!svg.includes('viewBox="45 46 505 704"')) throw Error('chart geometry');
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  const img=$('sourceChart');
  await new Promise((resolve,reject)=>{
    img.addEventListener('load',resolve,{once:true});
    img.addEventListener('error',reject,{once:true});
    img.src=url;
  });
  URL.revokeObjectURL(url);
}

function currentModeLabel(){
  if(mode==='boom') return '23.8mフルブーム';
  return DATA.geometry.jibs[mode].label;
}

function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

function drawResultCard(ctx,x,y,w,h,label,value,primary=false){
  roundRect(ctx,x,y,w,h,22);
  ctx.fillStyle=primary?'#f3f7ff':'#f8fafc';
  ctx.fill();
  ctx.strokeStyle=primary?'#91b8ff':'#e4e7ec';
  ctx.lineWidth=2;
  ctx.stroke();
  ctx.fillStyle='#667085';
  ctx.font='700 24px system-ui, sans-serif';
  ctx.fillText(label,x+24,y+38);
  ctx.fillStyle=primary?'#0b55cf':'#111827';
  ctx.font='800 46px system-ui, sans-serif';
  ctx.fillText(value,x+24,y+92);
}

async function overlayToImage(){
  const source=$('overlay');
  const clone=source.cloneNode(true);
  clone.setAttribute('xmlns',SVG_NS);
  const style=document.createElementNS(SVG_NS,'style');
  style.textContent='.overlay-label{font:700 8px system-ui,sans-serif;paint-order:stroke;stroke:white;stroke-width:2.4px;stroke-linejoin:round}.overlay-dim{font:800 8.5px system-ui,sans-serif;paint-order:stroke;stroke:white;stroke-width:2.8px;stroke-linejoin:round}';
  clone.insertBefore(style,clone.firstChild);
  const blob=new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  try{
    const img=new Image();
    await new Promise((resolve,reject)=>{
      img.onload=resolve;
      img.onerror=reject;
      img.src=url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function renderShareCanvas(){
  const ready=Number.isFinite(state.distance)&&Number.isFinite(state.height)&&state.distance>0&&state.height>0;
  if(!ready) throw Error('先に建物までの距離と高さを入力してください。');
  const chart=$('sourceChart');
  if(!chart.complete||!chart.naturalWidth) throw Error('揚程図を読み込み中です。');
  const calc=calculate(state.distance,state.height,mode);
  const overlayImg=await overlayToImage();

  const canvas=document.createElement('canvas');
  canvas.width=1080;
  canvas.height=1920;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#eef1f5';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  roundRect(ctx,36,36,1008,1848,30);
  ctx.fillStyle='#ffffff';
  ctx.fill();

  ctx.fillStyle='#111827';
  ctx.font='800 46px system-ui, sans-serif';
  ctx.fillText('GR-120N-1 作業検討図',72,105);
  ctx.fillStyle='#475467';
  ctx.font='700 28px system-ui, sans-serif';
  ctx.fillText(currentModeLabel(),72,148);

  roundRect(ctx,72,180,936,92,18);
  ctx.fillStyle='#f8fafc';
  ctx.fill();
  ctx.fillStyle='#111827';
  ctx.font='800 28px system-ui, sans-serif';
  ctx.fillText(`建物まで  ${fmt(state.distance)} m`,104,238);
  ctx.fillText(`高さ  ${fmt(state.height)} m`,590,238);

  drawResultCard(ctx,72,302,450,120,'作業半径',`${fmt(calc.radius)} m`,true);
  drawResultCard(ctx,558,302,450,120,'建物奥へ',`${fmt(calc.depth)} m`,true);
  drawResultCard(ctx,72,444,450,120,'ブーム角度',`${fmt(calc.angle)}°`);
  drawResultCard(ctx,558,444,450,120,'先端高さ',`${fmt(calc.tip.h)} m`);

  ctx.fillStyle='#111827';
  ctx.font='800 28px system-ui, sans-serif';
  ctx.fillText('作業半径-揚程図',72,622);

  const chartRatio=505/704;
  const chartH=1160;
  const chartW=chartH*chartRatio;
  const chartX=(1080-chartW)/2;
  const chartY=650;
  ctx.fillStyle='#ffffff';
  ctx.fillRect(chartX,chartY,chartW,chartH);
  ctx.drawImage(chart,chartX,chartY,chartW,chartH);
  ctx.drawImage(overlayImg,chartX,chartY,chartW,chartH);

  ctx.fillStyle='#667085';
  ctx.font='600 21px system-ui, sans-serif';
  ctx.fillText('赤：建物・ブーム　緑：作業半径　紫：ジブ',72,1840);
  ctx.fillText('GR-120N 到達図 基本1 改良版 / V1.2',72,1872);
  return canvas;
}

async function saveShareImage(){
  const canvas=await renderShareCanvas();
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png',1));
  if(!blob) throw Error('PNG画像の作成に失敗しました。');
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`GR120N_${mode}_D${fmt(state.distance)}_H${fmt(state.height)}.png`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
  return {blob,width:canvas.width,height:canvas.height,filename:a.download};
}

async function init(){
  const [data]=await Promise.all([
    fetch('../gr120n-reach/data/gr120n.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('data load');return r.json()}),
    loadSourceChart()
  ]);
  DATA=data;
  $('distance').addEventListener('input',update);
  $('height').addEventListener('input',update);
  document.querySelectorAll('.mode').forEach(btn=>btn.addEventListener('click',()=>{
    mode=btn.dataset.mode;
    document.querySelectorAll('.mode').forEach(x=>x.classList.toggle('active',x===btn));
    update();
  }));
  $('resetBtn').addEventListener('click',()=>{
    $('distance').value='0.0';$('height').value='0.0';mode='boom';
    document.querySelectorAll('.mode').forEach(x=>x.classList.toggle('active',x.dataset.mode==='boom'));
    update();
  });
  $('saveImageBtn').addEventListener('click',async()=>{
    const btn=$('saveImageBtn');
    btn.disabled=true;
    try{
      await saveShareImage();
      $('notice').textContent='共有用PNG画像を保存しました。';
      $('notice').classList.remove('hidden');
      $('warning').classList.add('hidden');
    }catch(err){
      console.error(err);
      $('warning').textContent=err.message||'画像保存に失敗しました。';
      $('warning').classList.remove('hidden');
    }finally{
      btn.disabled=!(state.distance>0&&state.height>0);
    }
  });
  update();
}

init().catch(err=>{
  console.error(err);
  $('warning').textContent='アプリデータの読み込みに失敗しました。再読み込みしてください。';
  $('warning').classList.remove('hidden');
});

window.__gr120nV12={calculate,renderShareCanvas,saveShareImage,getState:()=>({...state,mode})};
export { calculate, renderShareCanvas, saveShareImage };
