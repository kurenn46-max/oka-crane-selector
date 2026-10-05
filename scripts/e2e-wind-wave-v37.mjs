import {spawn} from "node:child_process";
import {chromium} from "playwright";

const port=4173;
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
function forecastRow(lat,lng,hours,current){
  const t=times(hours);
  const speed=t.map((_,i)=>4+(i%12)*0.2);
  const dir=t.map((_,i)=>(315+i*7)%360);
  const gust=t.map((_,i)=>6+(i%8)*0.25);
  const row={
    latitude:Number(lat),longitude:Number(lng),
    hourly:{time:t,wind_speed_10m:speed,wind_direction_10m:dir,wind_gusts_10m:gust}
  };
  if(current)row.current={time:t[0],wind_speed_10m:4.2,wind_direction_10m:315,wind_gusts_10m:6.1};
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
      const rows=lats.map((lat,i)=>forecastRow(lat,lngs[i]||lngs[0],hours,hasCurrent));
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

  await page.goto(`http://127.0.0.1:${port}/wind-wave-layer-forecast-v37/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#status")?.textContent.includes("✅"),null,{timeout:20000});

  assert(await page.inputValue("#modelSelect")==="best_match","initial model changed unexpectedly");
  await page.click("#forecastBtn");
  await page.waitForSelector("#forecastList .hourCard",{timeout:15000});
  assert((await page.textContent("#forecastTitle")).includes("Best Match"),"Best Match forecast title missing");
  assert(await page.inputValue("#modelSelect")==="best_match","forecast button forced another layer from Best Match");
  await page.click("#forecastClose");

  await page.click("#precisionBtn");
  await page.waitForFunction(()=>document.querySelector("#windLabel")?.textContent.includes("地表風"),null,{timeout:20000});
  await page.waitForFunction(()=>document.querySelector("#wind")?.textContent.includes("m/s"),null,{timeout:20000});
  assert(await page.inputValue("#modelSelect")==="local_terrain","precision button did not select surface layer");

  await page.click("#forecastBtn");
  await page.waitForSelector("#forecastList .hourCard",{timeout:20000});
  assert((await page.textContent("#forecastTitle")).includes("精密地表風予報"),"surface forecast title missing");
  const metas=await page.locator("#forecastList .hourMeta").allTextContents();
  assert(metas.length>2&&metas[0].includes("地表 約2m"),"surface forecast card is not 2m wind");
  assert(await page.inputValue("#modelSelect")==="local_terrain","surface forecast changed selected layer");
  const winds=await page.locator("#forecastList .hourWind").allTextContents();
  assert(winds.length>2&&winds[0]!==winds[1],"future surface wind values did not vary with forecast");
  await page.click("#forecastClose");

  await page.selectOption("#modelSelect","jma_msm");
  await page.waitForFunction(()=>document.querySelector("#status")?.textContent.includes("JMA MSM"),null,{timeout:15000});
  await page.click("#forecastBtn");
  await page.waitForSelector("#forecastList .hourCard",{timeout:15000});
  assert((await page.textContent("#forecastTitle")).includes("JMA MSM"),"JMA MSM forecast title missing");
  const jmaMeta=await page.locator("#forecastList .hourMeta").first().textContent();
  assert(!jmaMeta.includes("地表 約2m"),"JMA MSM forecast was incorrectly converted to surface mode");
  assert(await page.inputValue("#modelSelect")==="jma_msm","JMA MSM layer not preserved");

  console.log("E2E OK: selected-layer forecast preserved");
  console.log("E2E OK: precision surface mode shows future ~2m wind");
  console.log("E2E OK: non-surface JMA MSM remains non-surface forecast");
}finally{
  if(browser)await browser.close();
  server.kill("SIGTERM");
}