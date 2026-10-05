import {spawn} from "node:child_process";
import {chromium} from "playwright";

const port=4175;
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
function forecastRow(lat,lng,hours,current,model){
  const t=times(hours);
  const off=model==="ecmwf_ifs"?.5:model==="best_match"?.2:0;
  const speed=t.map((_,i)=>4+off+(i%12)*.2);
  const dir=t.map((_,i)=>(300+i*5)%360);
  const gust=t.map((_,i)=>6+off+(i%8)*.2);
  const row={latitude:Number(lat),longitude:Number(lng),hourly:{time:t,wind_speed_10m:speed,wind_direction_10m:dir,wind_gusts_10m:gust}};
  if(current)row.current={time:t[0],wind_speed_10m:4.2+off,wind_direction_10m:300,wind_gusts_10m:6.1+off};
  return row;
}
async function leftmostTime(page){
  return page.evaluate(()=>{
    const list=document.querySelector("#forecastList");
    const cards=[...list.querySelectorAll(".hourCard")];
    const lr=list.getBoundingClientRect();
    let best=null,d=Infinity;
    for(const card of cards){
      const r=card.getBoundingClientRect(),x=Math.abs(r.left-lr.left);
      if(x<d){best=card;d=x;}
    }
    return best?.querySelector(".hourTime")?.textContent||"";
  });
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
      const body={latitude:35.5,longitude:135.7,current:{wave_height:.5,wave_period:6},hourly:{time:t,wave_height:t.map(()=>.5),wave_period:t.map(()=>6)}};
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

  await page.goto("http://127.0.0.1:"+port+"/wind-wave-learned-surface-v39/",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#status")?.textContent.includes("✅"),null,{timeout:20000});
  await page.click("#forecastBtn");
  await page.waitForSelector("#forecastList .hourCard",{timeout:15000});

  const target=page.locator("#forecastList .hourCard").nth(18);
  await target.evaluate(el=>el.scrollIntoView({behavior:"auto",inline:"start",block:"nearest"}));
  await page.waitForTimeout(250);
  const beforeScroll=await page.locator("#forecastList").evaluate(el=>el.scrollLeft);
  const beforeTime=await leftmostTime(page);
  assert(beforeScroll>500,"forecast did not scroll far enough for persistence test");
  assert(beforeTime.length>0,"could not capture forecast anchor time");

  await page.click("#forecastClose");
  await page.selectOption("#modelSelect","jma_msm");
  await page.waitForFunction(()=>document.querySelector("#status")?.textContent.includes("JMA MSM"),null,{timeout:15000});
  await page.click("#forecastBtn");
  await page.waitForSelector("#forecastPanel.open #forecastList .hourCard",{timeout:15000});
  await page.waitForFunction(()=>document.querySelector("#forecastList").scrollLeft>500,null,{timeout:5000});
  const jmaTime=await leftmostTime(page);
  assert(jmaTime===beforeTime,"JMA MSM model change reset forecast time: "+beforeTime+" -> "+jmaTime);

  await page.click("#forecastClose");
  await page.selectOption("#modelSelect","ecmwf_ifs");
  await page.waitForFunction(()=>document.querySelector("#status")?.textContent.includes("ECMWF"),null,{timeout:15000});
  await page.click("#forecastBtn");
  await page.waitForSelector("#forecastPanel.open #forecastList .hourCard",{timeout:15000});
  await page.waitForFunction(()=>document.querySelector("#forecastList").scrollLeft>500,null,{timeout:5000});
  const ecmwfTime=await leftmostTime(page);
  assert(ecmwfTime===beforeTime,"ECMWF model change reset forecast time: "+beforeTime+" -> "+ecmwfTime);

  console.log("E2E OK: forecast horizontal time survives JMA MSM model change");
  console.log("E2E OK: forecast horizontal time survives ECMWF model change");
}finally{
  if(browser)await browser.close();
  server.kill("SIGTERM");
}