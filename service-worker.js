const CACHE_NAME = 'gpsepedia-cache-v3';
const urlsToCache = [
  './',
  './index.html'
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
  // Use a network-first strategy
  event.respondWith(
    fetch(event.request).then(response => {
      // If the fetch is successful, clone the response and cache it
      if (response && response.status === 200) {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });
      }
      return response;
    }).catch(() => {
      // If the network request fails, try to serve from the cache
      return caches.match(event.request);
    })
  );
});
