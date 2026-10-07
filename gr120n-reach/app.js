const $ = (id) => document.getElementById(id);
let DATA;
let mode = 'boom';

const SVG_NS = 'http://www.w3.org/2000/svg';
const state = { distance: 2, height: 5 };

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

  // Building front + maximum roof depth shown from building face to calculated radius.
  addLine(g,buildingBottom,buildingTop,{stroke:red,'stroke-width':sw,'vector-effect':'non-scaling-stroke'});
  addLine(g,buildingTop,radiusAtRoof,{stroke:red,'stroke-width':sw,'vector-effect':'non-scaling-stroke'});

  // Ground dimension from swing center to building.
  const zero=workToSvg(0,0), dimY=workToSvg(0,-0.55);
  const dimA={x:zero.x,y:dimY.y}, dimB={x:buildingBottom.x,y:dimY.y};
  addLine(g,dimA,dimB,{stroke:red,'stroke-width':1.15,'vector-effect':'non-scaling-stroke'});
  addLine(g,{x:dimA.x,y:dimA.y-3},{x:dimA.x,y:dimA.y+3},{stroke:red,'stroke-width':1.15,'vector-effect':'non-scaling-stroke'});
  addLine(g,{x:dimB.x,y:dimB.y-3},{x:dimB.x,y:dimB.y+3},{stroke:red,'stroke-width':1.15,'vector-effect':'non-scaling-stroke'});

  // Main boom and optional jib.
  addLine(g,pivot,mainTip,{stroke:red,'stroke-width':2.1,'vector-effect':'non-scaling-stroke'});
  if(calc.jibTip){ addLine(g,mainTip,tip,{stroke:violet,'stroke-width':2.4,'vector-effect':'non-scaling-stroke'}); }

  // Work radius vertical.
  addLine(g,radiusGround,tip,{stroke:green,'stroke-width':2.1,'vector-effect':'non-scaling-stroke'});

  // Points.
  addCircle(g,pivot,2.2,{fill:red,stroke:'white','stroke-width':1});
  addCircle(g,tip,2.2,{fill:calc.jibTip?violet:red,stroke:'white','stroke-width':1});

  // Labels.
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
  const calc=calculate(state.distance,state.height,mode);
  $('radiusResult').textContent=fmt(calc.radius);
  $('depthResult').textContent=fmt(calc.depth);
  $('angleResult').textContent=fmt(calc.angle);
  $('tipHeightResult').textContent=fmt(calc.tip.h);

  const warn=$('warning');
  if(!Number.isFinite(state.distance)||!Number.isFinite(state.height)||state.distance<=0||state.height<=0){
    warn.textContent='距離と高さは0より大きい値を入力してください。'; warn.classList.remove('hidden');
  } else if(calc.rawAngle>DATA.geometry.boom.maxAngle){
    warn.textContent=`必要ブーム角は ${fmt(calc.rawAngle)}°。V1の上限 ${DATA.geometry.boom.maxAngle}° を超えます。表示は上限角で止めています。`; warn.classList.remove('hidden');
  } else if(calc.rawAngle<DATA.geometry.boom.minAngle){
    warn.textContent='入力条件ではブーム角が0°未満になります。表示は0°で止めています。'; warn.classList.remove('hidden');
  } else if(calc.depth<0){
    warn.textContent='この条件では先端作業半径が建物手前まで届きません。'; warn.classList.remove('hidden');
  } else warn.classList.add('hidden');
  draw(calc);
}

async function init(){
  DATA=await fetch('./data/gr120n.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('data load');return r.json()});
  $('distance').addEventListener('input',update);
  $('height').addEventListener('input',update);
  document.querySelectorAll('.mode').forEach(btn=>btn.addEventListener('click',()=>{
    mode=btn.dataset.mode;
    document.querySelectorAll('.mode').forEach(x=>x.classList.toggle('active',x===btn));
    update();
  }));
  $('resetBtn').addEventListener('click',()=>{$('distance').value='2.0';$('height').value='5.0';mode='boom';document.querySelectorAll('.mode').forEach(x=>x.classList.toggle('active',x.dataset.mode==='boom'));update();});
  update();
}
init().catch(err=>{console.error(err);$('warning').textContent='アプリデータの読み込みに失敗しました。再読み込みしてください。';$('warning').classList.remove('hidden')});

export { calculate };
