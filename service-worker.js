const CACHE_NAME = 'gpsepedia-cache-v5';
// The icon paths will be renamed in the next step, this is a placeholder
const urlsToCache = [
  './',
  './index.html',
  './icon-v2-192x192.png',
  './icon-v2-512x512.png'
];

// 1. Install: Caches the essential app shell files.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Activate the new service worker immediately
  );
});

// 2. Activate: Deletes old caches to free up space.
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

// 3. Fetch: Implements a cache-first strategy.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // If the response is in the cache, return it.
        if (cachedResponse) {
          return cachedResponse;
        }
        // If not in cache, fetch from the network.
        return fetch(event.request).then(
          networkResponse => {
            // Optional: Cache the new response for future use.
            // Be careful with what you cache, especially API responses.
            return networkResponse;
          }
        );
      })
  );
});
