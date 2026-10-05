const lat=35.49,lng=135.74;
const models=["jma_msm","best_match","ecmwf_ifs"];
const offsets=[95,119,143,167,191];

function validAt(h,i){
  return Number.isFinite(h?.wind_speed_10m?.[i])&&Number.isFinite(h?.wind_direction_10m?.[i]);
}
async function getForecast(model,hours=192){
  const u=new URL("https://api.open-meteo.com/v1/forecast");
  u.searchParams.set("latitude",String(lat));
  u.searchParams.set("longitude",String(lng));
  u.searchParams.set("hourly","wind_speed_10m,wind_direction_10m");
  u.searchParams.set("forecast_hours",String(hours));
  u.searchParams.set("models",model);
  u.searchParams.set("wind_speed_unit","ms");
  u.searchParams.set("timezone","Asia/Tokyo");
  const r=await fetch(u,{signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw new Error(model+" HTTP "+r.status);
  return r.json();
}

const rows={};
for(const model of models){
  try{
    const d=await getForecast(model,192);
    rows[model]=d;
    const h=d.hourly||{};
    let last=-1;
    for(let i=0;i<(h.time||[]).length;i++)if(validAt(h,i))last=i;
    console.log("MODEL",model,"rows",(h.time||[]).length,"lastValidIndex",last,"lastValidTime",last>=0?h.time[last]:"none");
    for(const i of offsets){
      console.log("CHECK",model,i+1+"h",h.time?.[i]||"no-time",validAt(h,i)?"VALID":"NO_DATA",
        validAt(h,i)?h.wind_speed_10m[i].toFixed(1)+"m/s":"");
    }
  }catch(e){
    console.log("MODEL",model,"ERROR",e.message);
  }
}

for(const i of offsets){
  const available=models.filter(m=>rows[m]&&validAt(rows[m].hourly||{},i));
  console.log("SURFACE_SELECTED_TIME",i+1+"h","availableModels",available.join(",")||"none",available.length?"CALCULABLE":"NOT_CALCULABLE");
}

console.log("APP_DIRECT_SURFACE_LIST_LIMIT","96h","4 days");
console.log("APP_LONG_MODEL_LIST_LIMIT","168h","7 days");