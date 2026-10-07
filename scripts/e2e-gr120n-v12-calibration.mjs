import{chromium}from"playwright";import http from"node:http";import fs from"node:fs";import path from"node:path";
const root=process.cwd(),srv=http.createServer((q,r)=>{let x=(q.url||"/").split("?")[0].replace(/^\/+/,"");if(!x||x.endsWith("/"))x+="index.html";const f=path.resolve(root,x);if(!f.startsWith(path.resolve(root))||!fs.existsSync(f)){r.writeHead(404);return r.end()}const ext=path.extname(f),ct=ext===".html"?"text/html; charset=utf-8":ext===".js"?"text/javascript; charset=utf-8":ext===".css"?"text/css":ext===".json"?"application/json":ext===".txt"?"text/plain; charset=utf-8":"application/octet-stream";r.writeHead(200,{"content-type":ct,"cache-control":"no-store"});r.end(fs.readFileSync(f))});
await new Promise(x=>srv.listen(4176,"127.0.0.1",x));
const b=await chromium.launch({headless:true}),c=await b.newContext({viewport:{width:900,height:1200},timezoneId:"Asia/Tokyo"});
const base=await c.newPage(),v12=await c.newPage();
for(const [p,u] of [[base,"http://127.0.0.1:4176/gr120n-reach/"],[v12,"http://127.0.0.1:4176/gr120n-reach-v12/"]]){await p.goto(u,{waitUntil:"networkidle"})}
const cases=[[2,5],[4,5],[6,8],[6,16],[10,10],[15,5]];
const modes=["boom","jib36","jib55"];
function num(t){return parseFloat(String(t).trim())}
for(const [d,h] of cases){
  for(const m of modes){
    for(const p of [base,v12]){
      await p.locator("#distance").fill(String(d));
      await p.locator("#height").fill(String(h));
      if(m!=="boom") await p.locator('.mode[data-mode="'+m+'"]').click();
      else await p.locator('.mode[data-mode="boom"]').click();
      await p.waitForTimeout(30);
    }
    const ids=["radiusResult","depthResult","angleResult","tipHeightResult"];
    const a={},z={};
    for(const id of ids){a[id]=num(await base.locator("#"+id).textContent());z[id]=num(await v12.locator("#"+id).textContent())}
    for(const id of ids)if(Math.abs(a[id]-z[id])>0.001)throw Error("numeric parity "+d+","+h+","+m+","+id+" "+a[id]+" vs "+z[id]);
    const da=await base.locator("#drawing").evaluate(el=>el.innerHTML.replace(/\s+/g," ").trim());
    const dz=await v12.locator("#drawing").evaluate(el=>el.innerHTML.replace(/\s+/g," ").trim());
    if(da!==dz)throw Error("overlay parity "+d+","+h+","+m);
  }
}
await base.locator("#distance").fill("2");await base.locator("#height").fill("5");await base.locator('.mode[data-mode="boom"]').click();
await v12.locator("#distance").fill("2");await v12.locator("#height").fill("5");await v12.locator('.mode[data-mode="boom"]').click();
const ref=await v12.evaluate(async()=>{const s=window.__gr120nV12.getState();const c=await window.__gr120nV12.renderShareCanvas();return{s,w:c.width,h:c.height}});
if(ref.w!==1080||ref.h!==1920||ref.s.distance!==2||ref.s.height!==5||ref.s.mode!=="boom")throw Error("share state/canvas "+JSON.stringify(ref));
console.log("GR-120N V1.2 calibration parity: PASS; 18 conditions matched Basic1 exactly");
await b.close();srv.close();
