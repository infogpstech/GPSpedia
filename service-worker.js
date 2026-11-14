const CACHE_NAME='gpsepedia-cache-v25';
const CORE_ASSETS=['./','./index.html','./HTML/add_cortes.html','./HTML/users.html','./JS/Frontend/main.js','./JS/Frontend/clientInteractionPolicy.js','./JS/Frontend/auth.js','./JS/Frontend/ui.js','./JS/Frontend/rich-text.js','./JS/Frontend/state.js','./JS/Frontend/navigation.js','./JS/Frontend/offline.js','./JS/Frontend/lightbox.js','./JS/Frontend/api-config.js','./JS/Frontend/serviceMetrics.js','./JS/Frontend/VinDifferentialEngine.js','./JS/Frontend/search-utils.js','./JS/Frontend/share-utils.js','./JS/Frontend/catalogStatus.js','./JS/Frontend/catalogRequest.js','./JS/Frontend/pys-data.js','./JS/Frontend/validationSubmission.js','./JS/Frontend/likeState.js','./JS/Frontend/youtubeUpload.js','./JS/Frontend/imageObjectUrlCache.js','./JS/Frontend/thumbnailCompressionQueue.js','./JS/Frontend/modalNavigation.js','./style.css','./button-system.css','./manifest.json','./Images/Logo_TemaOscuro.png','./Images/tracklink_logo.png'];
const OPTIONAL_ASSETS=['./Images/icon-v3-192x192.png','./Images/icon-v3-512x512.png','./Images/icon-pwa-192x192.png','./Images/icon-pwa-512x512.png'];
function isQuotaExceeded(error){return Boolean(error&&(error.name==='QuotaExceededError'||error.code===22));}
function reportCacheWriteError(error,operation){
 if(isQuotaExceeded(error)){console.warn('[GPSpedia SW] Cuota de Cache Storage agotada; se omite esta escritura.',operation);return;}
 console.warn('[GPSpedia SW] No se pudo actualizar Cache Storage.',operation,error);
}
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE_NAME);
  try{await cache.addAll(CORE_ASSETS);}
  catch(error){console.error('[GPSpedia SW] Falló la precarga esencial; se conserva el Service Worker anterior.',error);throw error;}
  for(const asset of OPTIONAL_ASSETS){
   try{await cache.add(asset);}
   catch(error){reportCacheWriteError(error,asset);if(isQuotaExceeded(error))break;}
  }
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(names=>Promise.all(
  names.filter(name=>name.startsWith('gpsepedia-cache-')&&name!==CACHE_NAME).map(name=>caches.delete(name))
 )).then(()=>self.clients.claim()));
});

self.addEventListener('message',event=>{
 const message=event.data;
 if(!message||message.type!=='GPSEPEDIA_CLEAR_RUNTIME_CACHE')return;
 const reply=event.ports&&event.ports[0];
 event.waitUntil((async()=>{
  const keep=new Set([...CORE_ASSETS,...OPTIONAL_ASSETS].map(asset=>new URL(asset,self.location).href));
  const names=(await caches.keys()).filter(name=>name.startsWith('gpsepedia-cache-'));
  let removedCount=0,preservedCount=0;
  for(const name of names){
   const cache=await caches.open(name);
   const requests=await cache.keys();
   for(const request of requests){
    if(keep.has(request.url)){preservedCount++;continue;}
    if(await cache.delete(request))removedCount++;
   }
  }
  if(reply)reply.postMessage({status:'success',removedCount,preservedCount});
 })().catch(error=>{
  if(reply)reply.postMessage({status:'error',message:error&&error.message?error.message:'No se pudo limpiar Cache Storage.'});
 }));
});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const request=event.request;
 if(request.destination==='image'){
  const updatePromise=caches.open(CACHE_NAME).then(async cache=>{
   const response=await fetch(request);
   if(response&&response.status===200){
    try{
     await cache.put(request,response.clone());
     const keys=await cache.keys();
     const images=keys.filter(key=>key.destination==='image');
     while(images.length>150){const oldest=images.shift();await cache.delete(oldest);}
    }catch(error){reportCacheWriteError(error,request.url);}
   }
   return response;
  });
  event.waitUntil(updatePromise.then(()=>undefined).catch(()=>undefined));
  event.respondWith(caches.open(CACHE_NAME).then(cache=>cache.match(request)).then(cached=>cached||updatePromise));
  return;
 }
 const networkResponse=fetch(request);
 const cacheWrite=networkResponse.then(response=>{
  if(!response||response.status!==200)return;
  return caches.open(CACHE_NAME).then(cache=>cache.put(request,response.clone()))
   .catch(error=>reportCacheWriteError(error,request.url));
 }).catch(()=>undefined);
 event.waitUntil(cacheWrite);
 if(request.mode==='navigate'){
  event.respondWith(networkResponse.catch(()=>caches.match(request,{ignoreSearch:true})
   .then(cached=>cached||caches.match('./index.html'))));
  return;
 }
 event.respondWith(networkResponse.catch(()=>caches.match(request,{ignoreSearch:true})));
});
