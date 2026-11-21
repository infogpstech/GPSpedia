const CACHE_NAME = 'gpsepedia-cache-v13';
const urlsToCache = [
  './',
  './index.html',
  './add_cortes.html',
  './users.html',
  './main.js',
  './auth.js',
  './ui.js',
  './state.js',
  './navigation.js',
  './offline.js',
  './lightbox.js',
  './api-config.js',
  './style.css',
  './icon-v3-192x192.png',
  './icon-v3-512x512.png',
  './icon-pwa-192x192.png',
  './icon-pwa-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching basic assets');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting(); // Force the new service worker to activate immediately
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all open clients
  );
});

self.addEventListener('fetch', event => {
  // Ignorar peticiones que no sean GET (como las de la API que usan POST)
  if (event.request.method !== 'GET') return;

  // Estrategia para peticiones de navegación (recarga de página)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Si hay red, actualizamos el caché y devolvemos la respuesta
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
          }
          return response;
        })
        .catch(() => {
          // Si falla la red (offline refresh), intentamos servir el recurso desde caché
          // o como último recurso el index.html
          return caches.match(event.request, { ignoreSearch: true })
            .then(cachedResponse => {
              return cachedResponse || caches.match('./index.html');
            });
        })
    );
    return;
  }

  // Estrategia general para assets (Network-First con fallback a Cache)
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        }
        return response;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
