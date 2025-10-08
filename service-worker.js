const SHELL_CACHE_NAME = 'gpspedia-shell-v2';
const IMAGE_CACHE_NAME = 'gpspedia-images-v1';

const urlsToCache = [
  '/',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE_NAME)
      .then(cache => {
        console.log('Cache de la aplicación abierto y cacheando archivos base');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [SHELL_CACHE_NAME, IMAGE_CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Borrando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignora las peticiones a la API de Google Sheets, siempre van a la red.
  if (url.hostname.includes('sheets.googleapis.com')) {
    return;
  }

  // Estrategia Cache-First para imágenes de Google Drive.
  if (url.hostname.includes('drive.google.com')) {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          const fetchPromise = fetch(event.request).then(networkResponse => {
            // Si la petición a la red es exitosa, la guardamos en caché.
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
          // Devolvemos la respuesta de la caché si existe, si no, esperamos la de la red.
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Estrategia Cache-First para la cáscara de la aplicación.
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});