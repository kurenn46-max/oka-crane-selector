import {spawn} from "node:child_process";
import {chromium} from "playwright";

const port=4174;
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const assert=(cond,msg)=>{if(!cond)throw new Error(msg)};
function times(n){
  const base=new Date("2026-10-05T08:00:00Z");
  return Array.from({length:n},(_,i)=>{
    const d=new Date(base.getTime()+i*3600000);
    return d.toISOString().slice(0,13)+":00";
  });
}
function modelOffset(model){
  if(model==="ecmwf_ifs")return .45;
  if(model==="best_match")return .20;
  return 0;
}
function forecastRow(lat,lng,hours,current,model){
  const t=times(hours),off=modelOffset(model);
  const speed=t.map((_,i)=>4+off+(i%12)*0.2);
  const dir=t.map((_,i)=>(315+i*7+(model==="ecmwf_ifs"?8:model==="best_match"?3:0))%360);
  const gust=t.map((_,i)=>6+off+(i%8)*0.25);
  const row={
    latitude:Number(lat),longitude:Number(lng),
    hourly:{time:t,wind_speed_10m:speed,wind_direction_10m:dir,wind_gusts_10m:gust}
  };
  if(current)row.current={time:t[0],wind_speed_10m:4.2+off,wind_direction_10m:315+(model==="ecmwf_ifs"?8:model==="best_match"?3:0),wind_gusts_10m:6.1+off};
  return row;
}

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
      const hours=url.searchParams.has("start_hour")?1:Number(url.searchParams.get("forecast_hours")||24);
      const hasCurrent=url.searchParams.has("current");
      const model=url.searchParams.get("models")||"best_match";
      const rows=lats.map((lat,i)=>forecastRow(lat,lngs[i]||lngs[0],hours,hasCurrent,model));
      await route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(rows.length===1?rows[0]:rows)});
      return;
    }
    if(url.hostname==="marine-api.open-meteo.com"){
      const hours=url.searchParams.has("start_hour")?1:Number(url.searchParams.get("forecast_hours")||168);
      const t=times(hours);
      const body={latitude:35.5,longitude:135.7,current:{wave_height:.5,wave_period:6},hourly:{time:t,wave_height:t.map((_,i)=>.4+(i%4)*.1),wave_period:t.map(()=>6)}};
      await route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(body)});
      return;
    }
    if(url.hostname==="cyberjapandata.gsi.go.jp"&&url.pathname.includes("/xyz/dem")){
      await route.fulfill({status:404,headers:{"access-control-allow-origin":"*"},body:""});
      return;
    }
    if(url.hostname==="tile.openstreetmap.org"){await route.abort();return;}
    await route.continue();
  });

  await page.goto("http://127.0.0.1:"+port+"/wind-wave-learned-surface-v38/",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#status")?.textContent.includes("✅"),null,{timeout:20000});

  await page.click("#precisionBtn");
  await page.waitForFunction(()=>document.querySelector("#windLabel")?.textContent.includes("地表風"),null,{timeout:20000});
  await page.waitForFunction(()=>document.querySelector("#wind")?.textContent.includes("m/s"),null,{timeout:20000});
  assert(await page.inputValue("#modelSelect")==="local_terrain","precision mode not active");

  await page.click("#forecastBtn");
  await page.waitForSelector("#forecastList .hourCard",{timeout:20000});
  const beforeText=await page.locator("#forecastList .hourWind").first().textContent();
  const before=parseFloat(beforeText);
  assert(Number.isFinite(before),"surface forecast missing before learning");
  await page.click("#forecastClose");

  await page.click("#learnBtn");
  await page.waitForSelector("#learnPanel.open",{timeout:5000});
  await page.fill("#learnSpeed",String(before+2.5));
  await page.selectOption("#learnDir","315");
  await page.click("#learnSave");
  await page.waitForFunction(()=>document.querySelector("#learnMsg")?.textContent.includes("保存しました"),null,{timeout:20000});
  await page.waitForFunction(()=>{
    try{
      const d=JSON.parse(localStorage.getItem("oka_surface_learning_v38")||"{}");
      return Array.isArray(d.observations)&&d.observations.length===1;
    }catch(_){return false}
  },null,{timeout:5000});
  await page.waitForTimeout(900);
  assert((await page.textContent("#learnBtn")).includes("1"),"learning badge did not update");

  await page.click("#forecastBtn");
  await page.waitForSelector("#forecastList .hourCard",{timeout:20000});
  const afterText=await page.locator("#forecastList .hourWind").first().textContent();
  const after=parseFloat(afterText);
  assert(Number.isFinite(after),"surface forecast missing after learning");
  assert(after>before,"learned correction did not move forecast toward stronger observation");
  const meta=await page.locator("#forecastList .hourMeta").first().textContent();
  assert(meta.includes("地表 約2m"),"surface forecast card lost 2m label");
  await page.click("#forecastClose");

  await page.selectOption("#modelSelect","jma_msm");
  await page.waitForFunction(()=>document.querySelector("#status")?.textContent.includes("JMA MSM"),null,{timeout:15000});
  await page.click("#forecastBtn");
  await page.waitForSelector("#forecastList .hourCard",{timeout:15000});
  const jmaMeta=await page.locator("#forecastList .hourMeta").first().textContent();
  assert(!jmaMeta.includes("地表 約2m"),"JMA MSM forecast incorrectly used surface learning");
  assert(await page.inputValue("#modelSelect")==="jma_msm","selected layer was not preserved");

  console.log("E2E OK: field observation stored locally");
  console.log("E2E OK: learned correction changes future ~2m surface forecast");
  console.log("E2E OK: non-surface selected layer remains isolated from learning");
}finally{
  if(browser)await browser.close();
  server.kill("SIGTERM");
}