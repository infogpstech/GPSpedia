const CACHE_NAME='gpsepedia-cache-v75';
const CORE_ASSETS=['./','./index.html','./HTML/add_cortes.html','./HTML/users.html','./JS/Frontend/main.js','./JS/Frontend/clientInteractionPolicy.js','./JS/Frontend/auth.js','./JS/Frontend/ui.js','./JS/Frontend/activityDashboard.js','./JS/Frontend/termsDeviceAcceptance.js','./JS/Frontend/rich-text.js','./JS/Frontend/state.js','./JS/Frontend/navigation.js','./JS/Frontend/offline.js','./JS/Frontend/lightbox.js','./JS/Frontend/api-config.js','./JS/Frontend/serviceTelemetry.js','./JS/Frontend/VinDifferentialEngine.js','./JS/Frontend/search-utils.js','./JS/Frontend/share-utils.js','./JS/Frontend/catalogStatus.js','./JS/Frontend/catalogRequest.js','./JS/Frontend/pys-data.js','./JS/Frontend/validationSubmission.js','./JS/Frontend/likeState.js','./JS/Frontend/youtubeUpload.js','./JS/Frontend/imageObjectUrlCache.js','./JS/Frontend/thumbnailCompressionQueue.js','./JS/Frontend/modalNavigation.js','./style.css','./contextual-help.css','./button-system.css','./manifest.json','./Images/Logo_TemaOscuro.png','./Images/icon-v3-512x512.png','./Images/tracklink_logo.png'];
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
function isCacheableRequest_(request) {
 if (!request || request.method !== 'GET') return false;
 if (request.destination === 'image') return true;
 let url;
 try { url = new URL(request.url, self.location.href); } catch (error) { return false; }
 if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
 if (url.origin === self.location.origin) {
  if (request.mode === 'navigate' || request.destination === 'document' ||
      request.destination === 'script' || request.destination === 'style' ||
      request.destination === 'font') return true;
  return /\.(?:html?|mjs|js|css|json|webmanifest|woff2?|ttf|otf|svg|png|jpe?g|webp|gif|ico)$/i.test(url.pathname);
 }
 // Solo se permite almacenamiento externo para recursos estáticos del CDN de iconos.
 return url.hostname === 'cdnjs.cloudflare.com' &&
  /\.(?:css|woff2?|ttf|otf)$/i.test(url.pathname);
}

async function fetchAndCache_(request) {
 const cache = await caches.open(CACHE_NAME);
 const response = await fetch(request);
 if (!response || (response.status !== 200 && response.type !== 'opaque')) {
  return { response, cacheWrite: Promise.resolve() };
 }
 let cacheWrite = Promise.resolve();
 try {
  // Clonar antes de entregar la respuesta original a respondWith: ambos cuerpos
  // quedan independientes y Cache Storage no compite con el consumidor de la página.
  const cacheCopy = response.clone();
  cacheWrite = cache.put(request, cacheCopy).then(async () => {
   if (request.destination !== 'image') return;
   const keys = await cache.keys();
   const images = keys.filter(key => key.destination === 'image');
   while (images.length > 150) {
    const oldest = images.shift();
    await cache.delete(oldest);
   }
  }).catch(error => reportCacheWriteError(error, request.url));
 } catch (error) {
  reportCacheWriteError(error, request.url);
 }
 return { response, cacheWrite };
}

function offlineNavigationFallback_(request) {
 return caches.match(request, { ignoreSearch: true }).then(cached => {
  if (cached) return cached;
  return caches.match('./index.html');
 });
}

self.addEventListener('fetch', event => {
 const request = event.request;
 if (!isCacheableRequest_(request)) return;

 const cachedResponse = caches.open(CACHE_NAME).then(cache => cache.match(request));
 const updatePromise = fetchAndCache_(request);
 event.waitUntil(updatePromise.then(result => result.cacheWrite).catch(() => undefined));

 event.respondWith(cachedResponse.then(cached => {
  if (cached) return cached;
  return updatePromise.then(result => result.response);
 }).catch(error => {
  if (request.mode === 'navigate') return offlineNavigationFallback_(request);
  throw error;
 }));
});
