import { routeAction } from './api-config.js';
import { getState, setState } from './state.js';
const PYS_CACHE_KEY="gpsepedia_pys_cache";
const PYS_CACHE_TIMESTAMP_KEY="gpsepedia_pys_cache_updated_at";
const PYS_CACHE_CURSOR_KEY="gpsepedia_pys_cache_cursor";
export const PYS_CACHE_TTL_MS=5*60*1000;
const PYS_CACHE_RETRY_DELAY_MS=30*1000;
const pysDataLoadedListeners=new Set();
let inFlightPromise=null,cacheHydrated=false,cacheGeneration=0;
function isValidPysCollection_(value){return Array.isArray(value)&&value.every(item=>item&&typeof item==="object"&&!Array.isArray(item));}
export function subscribePysDataLoaded(listener){if(typeof listener!=="function")throw new TypeError("El listener de PyS debe ser una función.");pysDataLoadedListeners.add(listener);return()=>pysDataLoadedListeners.delete(listener);}
export function getCachedPysData(){
 const current=getState().pysData;if(Array.isArray(current)){cacheHydrated=true;return current;}
 if(cacheHydrated)return null;cacheHydrated=true;
 try{const raw=localStorage.getItem(PYS_CACHE_KEY);if(!raw)return null;const parsed=JSON.parse(raw);if(!isValidPysCollection_(parsed))throw new Error("La caché PyS local no contiene una colección válida.");const updatedAt=Number(localStorage.getItem(PYS_CACHE_TIMESTAMP_KEY))||0;const stale=!updatedAt||Date.now()-updatedAt>PYS_CACHE_TTL_MS;setState({pysData:parsed,pysDataUpdatedAt:updatedAt,pysDataStale:stale,pysDataError:null,pysDataLoading:false});return parsed;}
 catch(error){setState({pysDataStale:true,pysDataError:"No se pudo leer la caché local de PyS."});return null;}
}
export function getPysDataFreshness(){
 const data=getCachedPysData(),current=getState(),updatedAt=Number(current.pysDataUpdatedAt)||0,expired=!updatedAt||Date.now()-updatedAt>PYS_CACHE_TTL_MS;
 return{hasCache:Array.isArray(data),stale:Array.isArray(data)&&(current.pysDataStale===true||expired),updatedAt,loading:current.pysDataLoading===true,error:current.pysDataError||null};
}
export function getPysDataCursor(){
 try{const raw=localStorage.getItem(PYS_CACHE_CURSOR_KEY);if(raw===null||raw==="")return null;const value=Number(raw);return Number.isSafeInteger(value)&&value>=0?value:null;}
 catch(error){return null;}
}
export function setPysDataCursor(cursor){
 if(!Array.isArray(getCachedPysData()))return false;
 const valid=Number.isSafeInteger(cursor)&&cursor>=0,now=Date.now();
 try{
  localStorage.setItem(PYS_CACHE_TIMESTAMP_KEY,String(now));
  if(valid)localStorage.setItem(PYS_CACHE_CURSOR_KEY,String(cursor));
  else localStorage.removeItem(PYS_CACHE_CURSOR_KEY);
 }catch(error){return false;}
 setState({pysDataUpdatedAt:now,pysDataStale:false,pysDataError:null,pysDataLastAttemptAt:now});
 return true;
}
export function invalidatePysDataCache(){cacheGeneration++;const data=getCachedPysData();setState({pysDataStale:true,pysDataUpdatedAt:0,pysDataError:null,pysDataLastAttemptAt:0});try{localStorage.removeItem(PYS_CACHE_TIMESTAMP_KEY);}catch(error){}return data;}
export function applyPysCatalogChanges(changes,cursor){
 if(!Array.isArray(changes))return{changed:false,needsRefresh:true};
 const relevant=changes.filter(change=>change&&(change.collection==="pys"||change.operation==="reset"||change.resetRequired===true));
 if(!relevant.length)return{changed:false,needsRefresh:false};
 if(relevant.some(change=>change.operation==="reset"||change.resetRequired===true||change.collection==="*"))return{changed:false,needsRefresh:true};
 const current=getCachedPysData();if(!Array.isArray(current))return{changed:false,needsRefresh:true};
 const index=new Map();
 for(const item of current){
  const id=String(item&&item.id_problem||"").trim(),key=id.toLowerCase();
  if(!/^isue-\d+$/i.test(id)||index.has(key))return{changed:false,needsRefresh:true};
  index.set(key,item);
 }
 let changed=false;
 for(const event of relevant){
  const id=String(event.recordId||"").trim(),key=id.toLowerCase();
  if(!/^isue-\d+$/i.test(id))return{changed:false,needsRefresh:true};
  if(event.operation==="delete"){changed=index.delete(key)||changed;continue;}
  const record=event.snapshot;
  if(event.operation!=="upsert"||!record||typeof record!=="object"||Array.isArray(record)||
     String(record.id_problem||"").trim().toLowerCase()!==key)return{changed:false,needsRefresh:true};
  index.set(key,record);changed=true;
 }
 if(!changed)return{changed:false,needsRefresh:false};
 const next=Array.from(index.values()),now=Date.now();
 cacheGeneration++;
 cacheHydrated=true;
 setState({pysData:next,pysDataUpdatedAt:now,pysDataStale:false,pysDataError:null,pysDataLoading:false,pysDataLastAttemptAt:now});
 try{
  localStorage.setItem(PYS_CACHE_KEY,JSON.stringify(next));localStorage.setItem(PYS_CACHE_TIMESTAMP_KEY,String(now));
  if(Number.isSafeInteger(cursor)&&cursor>=0)localStorage.setItem(PYS_CACHE_CURSOR_KEY,String(cursor));
 }catch(error){return{changed:false,needsRefresh:true};}
 pysDataLoadedListeners.forEach(listener=>{try{listener(next);}catch(error){console.warn("Error notificando el delta de PyS:",error);}});
 return{changed:true,needsRefresh:false,data:next};
}
function fetchPysData_(){
 if(inFlightPromise)return inFlightPromise;const startedAt=Date.now();setState({pysDataLoading:true,pysDataError:null,pysDataLastAttemptAt:startedAt});let pending;
 pending=(async()=>{
  try{
   let response;while(true){const generationAtStart=cacheGeneration;response=await routeAction("getPysData");if(generationAtStart===cacheGeneration)break;}
   if(!response||!isValidPysCollection_(response.data))throw new Error("getPysData no devolvió una colección válida.");
   const now=Date.now();cacheHydrated=true;setState({pysData:response.data,pysDataUpdatedAt:now,pysDataStale:false,pysDataError:null,pysDataLoading:false,pysDataLastAttemptAt:now});
   try{localStorage.setItem(PYS_CACHE_KEY,JSON.stringify(response.data));localStorage.setItem(PYS_CACHE_TIMESTAMP_KEY,String(now));}catch(error){}
   pysDataLoadedListeners.forEach(listener=>{try{listener(response.data);}catch(error){console.warn("Error notificando la actualización de PyS:",error);}});
   return response.data;
  }catch(error){
   const cached=getCachedPysData(),message=error&&error.message?error.message:"No se pudo actualizar PyS.";
   if(Array.isArray(cached)){setState({pysDataStale:true,pysDataError:message,pysDataLoading:false,pysDataLastAttemptAt:Date.now()});return cached;}
   setState({pysDataStale:false,pysDataError:message,pysDataLoading:false,pysDataLastAttemptAt:Date.now()});throw error;
  }finally{if(inFlightPromise===pending)inFlightPromise=null;}
 })();inFlightPromise=pending;return pending;
}
export function loadPysData({refresh=false}={}){
 const cached=getCachedPysData();if(inFlightPromise)return inFlightPromise;const freshness=getPysDataFreshness();
 if(!refresh&&freshness.hasCache&&!freshness.stale)return Promise.resolve(cached);
 // Con cursor conocido, el feed global garantiza la frescura; el TTL no debe forzar
 // una descarga completa si no hubo cambios. updatedAt=0 sigue forzando recuperación tras invalidación.
 if(!refresh&&freshness.hasCache&&freshness.updatedAt>0&&getPysDataCursor()!==null)return Promise.resolve(cached);
 const lastAttemptAt=Number(getState().pysDataLastAttemptAt)||0;
 if(!refresh&&freshness.hasCache&&freshness.stale&&freshness.error&&lastAttemptAt&&Date.now()-lastAttemptAt<PYS_CACHE_RETRY_DELAY_MS)return Promise.resolve(cached);
 return fetchPysData_();
}
