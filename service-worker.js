const CACHE_NAME='gpsepedia-cache-v17';
const CORE_ASSETS=['./','./index.html','./add_cortes.html','./users.html','./main.js','./auth.js','./ui.js','./rich-text.js','./state.js','./navigation.js','./offline.js','./lightbox.js','./api-config.js','./VinDifferentialEngine.js','./search-utils.js','./share-utils.js','./catalogStatus.js','./catalogRequest.js','./pys-data.js','./validationSubmission.js','./likeState.js','./youtubeUpload.js','./imageObjectUrlCache.js','./thumbnailCompressionQueue.js','./modalNavigation.js','./style.css','./manifest.json'];
const OPTIONAL_ASSETS=['./icon-v3-192x192.png','./icon-v3-512x512.png','./icon-pwa-192x192.png','./icon-pwa-512x512.png'];
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
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const networkResponse=fetch(event.request);
 const cacheWrite=networkResponse.then(response=>{
  if(!response||response.status!==200)return;
  return caches.open(CACHE_NAME).then(cache=>cache.put(event.request,response.clone()))
   .catch(error=>reportCacheWriteError(error,event.request.url));
 }).catch(()=>undefined);
 event.waitUntil(cacheWrite);
 if(event.request.mode==='navigate'){
  event.respondWith(networkResponse.catch(()=>caches.match(event.request,{ignoreSearch:true})
   .then(cached=>cached||caches.match('./index.html'))));
  return;
 }
 event.respondWith(networkResponse.catch(()=>caches.match(event.request,{ignoreSearch:true})));
});
