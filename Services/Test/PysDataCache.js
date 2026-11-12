import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const source=fs.readFileSync("pys-data.js","utf8");
const uiSource=fs.readFileSync("ui.js","utf8");
const NOW=1800000000000;
function buildHarness(options={}){
 let now=options.now??NOW,state={...(options.state||{})},requests=0;
 const storage=new Map(Object.entries(options.storage||{})),queued=[];
 const localStorage={getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)};
 const context={routeAction:()=>{requests++;const next=queued.shift();return next?next():Promise.resolve({status:"success",data:[]});},getState:()=>({...state}),setState:patch=>{state={...state,...patch};},localStorage,Date:{now:()=>now},Promise,Set,TypeError,Error,JSON,Array,Number,String,Object,Math,console:{warn:()=>{},error:()=>{}}};
 const code=source.replace(/^import .*;\n/gm,"").replace(/\bexport\s+(?=(?:async\s+)?function|const|let|class)/g,"");
 vm.runInNewContext(code+"\nthis.api={loadPysData,getCachedPysData,getPysDataFreshness,invalidatePysDataCache,subscribePysDataLoaded,ttl:PYS_CACHE_TTL_MS};",context);
 return{api:context.api,get state(){return state;},get requests(){return requests;},storage,enqueue:fn=>queued.push(fn),setNow:value=>{now=value;}};
}
function ttl(){return 5*60*1000;}
async function runPysDataCacheTests(){
 const results=[];let passed=0,failed=0;
 const test=async(name,fn)=>{try{await fn();passed++;results.push({name,status:"PASS"});}catch(error){failed++;results.push({name,status:"FAIL",message:String(error.message||error)});}};
 await test("reutiliza datos en memoria dentro del TTL",async()=>{const h=buildHarness({state:{pysData:[{id:"1"}],pysDataUpdatedAt:NOW-1000,pysDataStale:false}});assert.deepEqual(await h.api.loadPysData(),[{id:"1"}]);assert.equal(h.requests,0);});
 await test("refresca una caché vencida",async()=>{const h=buildHarness({state:{pysData:[{id:"old"}],pysDataUpdatedAt:NOW-ttl()-1,pysDataStale:false}});h.enqueue(()=>Promise.resolve({status:"success",data:[{id:"new"}]}));assert.deepEqual(await h.api.loadPysData(),[{id:"new"}]);assert.equal(h.requests,1);assert.equal(h.api.getPysDataFreshness().stale,false);});
 await test("comparte una única promesa entre solicitudes simultáneas",async()=>{const h=buildHarness();let resolveRequest;h.enqueue(()=>new Promise(resolve=>{resolveRequest=resolve;}));const a=h.api.loadPysData({refresh:true}),b=h.api.loadPysData({refresh:true});assert.equal(a,b);assert.equal(h.requests,1);resolveRequest({status:"success",data:[{id:"one"}]});const values=await Promise.all([a,b]);assert.deepEqual(values[0],[{id:"one"}]);assert.deepEqual(values[1],[{id:"one"}]);});
 await test("conserva caché antigua y marca advertencia si falla la red",async()=>{const old=[{id:"cached"}],h=buildHarness({state:{pysData:old,pysDataUpdatedAt:NOW-9999999,pysDataStale:false}});h.enqueue(()=>Promise.reject(new Error("offline")));assert.deepEqual(await h.api.loadPysData(),old);assert.equal(h.api.getPysDataFreshness().stale,true);assert.equal(h.api.getPysDataFreshness().error,"offline");assert.deepEqual(await h.api.loadPysData(),old);assert.equal(h.requests,1);h.enqueue(()=>Promise.reject(new Error("offline again")));assert.deepEqual(await h.api.loadPysData({refresh:true}),old);assert.equal(h.requests,2);});
 await test("rechaza fallo de red cuando no existe caché",async()=>{const h=buildHarness();h.enqueue(()=>Promise.reject(new Error("offline")));await assert.rejects(h.api.loadPysData(),/offline/);assert.equal(h.api.getPysDataFreshness().hasCache,false);});
 await test("invalida datos recientes y fuerza la siguiente consulta",async()=>{const h=buildHarness({state:{pysData:[{id:"old"}],pysDataUpdatedAt:NOW,pysDataStale:false}});h.api.invalidatePysDataCache();assert.equal(h.api.getPysDataFreshness().stale,true);h.enqueue(()=>Promise.resolve({status:"success",data:[{id:"fresh"}]}));assert.deepEqual(await h.api.loadPysData(),[{id:"fresh"}]);assert.equal(h.requests,1);});
 await test("una invalidación durante una petición impide guardar la respuesta anterior",async()=>{const h=buildHarness();let resolveFirst;h.enqueue(()=>new Promise(resolve=>{resolveFirst=resolve;}));h.enqueue(()=>Promise.resolve({status:"success",data:[{id:"after-mutation"}]}));const pending=h.api.loadPysData({refresh:true});h.api.invalidatePysDataCache();resolveFirst({status:"success",data:[{id:"before-mutation"}]});assert.deepEqual(await pending,[{id:"after-mutation"}]);assert.equal(h.requests,2);});
 await test("ignora caché local corrupta y recupera desde backend",async()=>{const h=buildHarness({storage:{gpsepedia_pys_cache:"{bad json"}});h.enqueue(()=>Promise.resolve({status:"success",data:[{id:"recovered"}]}));assert.deepEqual(await h.api.loadPysData(),[{id:"recovered"}]);assert.equal(h.requests,1);});
 await test("considera una colección vacía como caché válida",async()=>{const h=buildHarness({storage:{gpsepedia_pys_cache:"[]",gpsepedia_pys_cache_updated_at:String(NOW-1000)}});assert.deepEqual(h.api.getCachedPysData(),[]);assert.equal(h.api.getPysDataFreshness().hasCache,true);assert.deepEqual(await h.api.loadPysData(),[]);assert.equal(h.requests,0);});
 await test("guarda marca temporal y notifica listeners al completar la carga",async()=>{const h=buildHarness();let notified=0;h.api.subscribePysDataLoaded(data=>{notified++;assert.equal(data.length,1);});h.enqueue(()=>Promise.resolve({status:"success",data:[{id:"saved"}]}));await h.api.loadPysData();assert.equal(notified,1);assert.equal(h.storage.get("gpsepedia_pys_cache_updated_at"),String(NOW));assert.equal(JSON.parse(h.storage.get("gpsepedia_pys_cache"))[0].id,"saved");});
 await test("la UI centraliza caché, advierte obsolescencia e invalida tras mutaciones",async()=>{assert.match(uiSource,/getCachedPysData/);assert.match(uiSource,/getPysDataFreshness/);assert.match(uiSource,/invalidatePysDataCache/);assert.match(uiSource,/pys-stale-notice/);assert.doesNotMatch(uiSource,/localStorage\.getItem\('gpsepedia_pys_cache'\)/);assert.doesNotMatch(uiSource,/loadPysData\(\{\s*refresh:\s*true\s*\}\)/);assert.ok((uiSource.match(/invalidatePysDataCache\(\)/g)||[]).length>=6);});
 await test("TTL expira al superar cinco minutos",async()=>{const h=buildHarness({state:{pysData:[{id:"old"}],pysDataUpdatedAt:NOW-ttl()-1,pysDataStale:false}});h.enqueue(()=>Promise.resolve({status:"success",data:[{id:"fresh"}]}));await h.api.loadPysData();assert.equal(h.requests,1);});
 return{status:failed?"FAIL":"PASS",passed,failed,results};
}
const result=await runPysDataCacheTests();console.log(JSON.stringify(result,null,2));if(result.status!=="PASS")process.exitCode=1;
