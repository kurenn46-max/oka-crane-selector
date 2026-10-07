import{chromium}from"playwright";import http from"node:http";import fs from"node:fs";import path from"node:path";
const root=path.join(process.cwd(),"gr120n-reach"),srv=http.createServer((q,r)=>{let x=(q.url||"/").split("?")[0].replace(/^\/+/, "");if(!x||x.endsWith("/"))x+="index.html";const f=path.resolve(root,x);if(!f.startsWith(path.resolve(root))||!fs.existsSync(f)){r.writeHead(404);return r.end()}const ext=path.extname(f),ct=ext===".html"?"text/html; charset=utf-8":ext===".js"?"text/javascript; charset=utf-8":ext===".css"?"text/css":ext===".json"?"application/json":ext===".txt"?"text/plain; charset=utf-8":"application/octet-stream";r.writeHead(200,{"content-type":ct,"cache-control":"no-store"});r.end(fs.readFileSync(f))});
await new Promise(x=>srv.listen(4174,"127.0.0.1",x));
const b=await chromium.launch({headless:true}),c=await b.newContext({viewport:{width:412,height:915},timezoneId:"Asia/Tokyo"}),page=await c.newPage();
const errs=[];page.on("pageerror",e=>errs.push(String(e)));
await page.goto("http://127.0.0.1:4174/",{waitUntil:"networkidle"});
if(errs.length)throw Error("pageerror "+errs.join(" | "));
if(await page.locator("#distance").inputValue()!=="0.0")throw Error("distance initial");
if(await page.locator("#height").inputValue()!=="0.0")throw Error("height initial");
for(const id of ["radiusResult","depthResult","angleResult","tipHeightResult"])if((await page.locator("#"+id).textContent()).trim()!=="--")throw Error("initial result "+id);
if(await page.locator("#drawing").locator("*").count()!==0)throw Error("initial overlay not empty");
await page.locator("#distance").fill("2.0");await page.locator("#height").fill("5.0");
await page.waitForFunction(()=>document.querySelector("#radiusResult").textContent.trim()==="14.9");
const vals={r:await page.locator("#radiusResult").textContent(),d:await page.locator("#depthResult").textContent(),a:await page.locator("#angleResult").textContent(),h:await page.locator("#tipHeightResult").textContent()};
if(!vals.d.includes("12.9")||!vals.a.includes("48.9")||!vals.h.includes("19.8"))throw Error("boom reference "+JSON.stringify(vals));
if(await page.locator("#drawing line").count()<4)throw Error("boom overlay lines");
for(const m of ["jib36","jib55"]){await page.locator('.mode[data-mode="'+m+'"]').click();await page.waitForTimeout(50);const r=parseFloat(await page.locator("#radiusResult").textContent());const d=parseFloat(await page.locator("#depthResult").textContent());if(!Number.isFinite(r)||!Number.isFinite(d)||r<=0)throw Error(m+" result");if(await page.locator("#drawing line").count()<5)throw Error(m+" overlay lines")}
await page.getByRole("button",{name:"初期値"}).click();if(await page.locator("#distance").inputValue()!=="0.0"||await page.locator("#height").inputValue()!=="0.0")throw Error("reset inputs");if((await page.locator("#radiusResult").textContent()).trim()!=="--")throw Error("reset results");if(await page.locator("#drawing").locator("*").count()!==0)throw Error("reset overlay");
console.log("GR-120N Reach browser E2E: PASS");await b.close();srv.close();
