import {spawn} from "node:child_process";
import {chromium} from "playwright";

const port=4178;
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const assert=(cond,msg)=>{if(!cond)throw new Error(msg)};
const base=new Date("2026-10-05T08:00:00Z");
function times(n,start=base){return Array.from({length:n},(_,i)=>new Date(start.getTime()+i*3600000).toISOString().slice(0,13)+":00");}
function modelOffset(model){return model==="ecmwf_ifs"?.45:model==="best_match"?.20:0;}
function makeRows(lats,lngs,n,model,exactIso=null,current=false){
  const off=modelOffset(model);
  return lats.map((lat,pi)=>{
    const ts=exactIso?[exactIso]:times(n);
    const speed=ts.map((_,i)=>{
      const globalIndex=exactIso?Math.round((new Date(exactIso).getTime()-base.getTime())/3600000):i;
      if(model==="jma_msm"&&globalIndex>65)return null;
      return 4+off+(globalIndex%12)*.12+pi*.01;
    });
    const dir=ts.map((_,i)=>{
      const globalIndex=exactIso?Math.round((new Date(exactIso).getTime()-base.getTime())/3600000):i;
      if(model==="jma_msm"&&globalIndex>65)return null;
      return (300+globalIndex*3+(model==="ecmwf_ifs"?8:model==="best_match"?3:0))%360;
    });
    const row={latitude:Number(lat),longitude:Number(lngs[pi]||lngs[0]),hourly:{time:ts,wind_speed_10m:speed,wind_direction_10m:dir,wind_gusts_10m:speed.map(x=>Number.isFinite(x)?x+2:null)}};
    if(current)row.current={time:ts[0],wind_speed_10m:4.2+off,wind_direction_10m:300,wind_gusts_10m:6.1+off};
    return row;
  });
}
function pct(text){const m=String(text).match(/精度目安\s*(\d+)%/);return m?Number(m[1]):NaN;}

let browser;
try{
  await sleep(600);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route("**/*",async route=>{
    const url=new URL(route.request().url());
    if(url.hostname==="api.open-meteo.com"){
      const lats=(url.searchParams.get("latitude")||"35").split(",");
      const lngs=(url.searchParams.get("longitude")||"135").split(",");
      const model=url.searchParams.get("models")||"best_match";
      const exact=url.searchParams.get("start_hour");
      const n=exact?1:Number(url.searchParams.get("forecast_hours")||24);
      const rows=makeRows(lats,lngs,n,model,exact,url.searchParams.has("current"));
      await route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(rows.length===1?rows[0]:rows)});
      return;
    }
    if(url.hostname==="marine-api.open-meteo.com"){
      const exact=url.searchParams.get("start_hour");
      const n=exact?1:Number(url.searchParams.get("forecast_hours")||168);
      const ts=exact?[exact]:times(n);
      const body={latitude:35.5,longitude:135.7,current:{wave_height:.5,wave_period:6},hourly:{time:ts,wave_height:ts.map(()=>.5),wave_period:ts.map(()=>6)}};
      await route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(body)});
      return;
    }
    if(url.hostname==="cyberjapandata.gsi.go.jp"&&url.pathname.includes("/xyz/dem")){
      await route.fulfill({status:404,headers:{"access-control-allow-origin":"*"},body:""});return;
    }
    if(url.hostname==="tile.openstreetmap.org"){await route.abort();return;}
    await route.continue();
  });

  await page.goto("http://127.0.0.1:"+port+"/wind-wave-learned-surface-v312/",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#status")?.textContent.includes("✅"),null,{timeout:20000});
  await page.click("#precisionBtn");
  await page.waitForFunction(()=>document.querySelector("#modelSelect")?.value==="local_terrain",null,{timeout:5000});
  await page.click("#forecastBtn");
  await page.waitForSelector("#forecastList .hourCard",{timeout:25000});
  await page.click('.forecastBtns button[data-range="168"]');
  await page.waitForFunction(()=>document.querySelectorAll("#forecastList .hourCard").length>=160,null,{timeout:25000});

  const earlyMeta=await page.locator("#forecastList .hourCard").nth(24).locator(".hourMeta").textContent();
  const lateMeta=await page.locator("#forecastList .hourCard").nth(150).locator(".hourMeta").textContent();
  const lateWind=await page.locator("#forecastList .hourCard").nth(150).locator(".hourWind").textContent();
  assert(earlyMeta.includes("精度目安"),"early surface card missing accuracy percentage");
  assert(lateMeta.includes("精度目安"),"late surface card missing accuracy percentage");
  assert(lateMeta.includes("ECMWF＋Best"),"late forecast did not fall back to ECMWF + Best Match");
  assert(!lateWind.includes("--"),"late 7-day surface forecast has no wind value");
  const earlyPct=pct(earlyMeta),latePct=pct(lateMeta);
  assert(Number.isFinite(earlyPct)&&Number.isFinite(latePct),"could not parse accuracy percentages");
  assert(latePct<earlyPct,"long-range accuracy estimate did not decline: "+earlyPct+" -> "+latePct);

  await page.locator("#forecastList .hourCard").nth(150).click();
  await page.waitForFunction(()=>{
    const t=document.querySelector("#status")?.textContent||"";
    return t.includes("予報：")&&t.includes("精密地表風")&&document.querySelector("#wind")?.textContent.includes("m/s");
  },null,{timeout:30000});
  assert((await page.textContent("#gustLabel")).includes("予報精度目安"),"selected long-range surface forecast did not show accuracy label");
  assert((await page.textContent("#gust")).includes("%"),"selected long-range surface forecast did not show accuracy percent");

  console.log("E2E OK: V3.12 renders 7-day ~2m surface forecast");
  console.log("E2E OK: JMA horizon falls back to ECMWF + Best Match");
  console.log("E2E OK: forecast accuracy percentage declines with lead time");
  console.log("E2E OK: selected long-range hour shows accuracy percentage");
}finally{
  if(browser)await browser.close();
  server.kill("SIGTERM");
}