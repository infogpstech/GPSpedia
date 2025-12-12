const SHELL_CACHE_NAME = 'gpspedia-shell-v4'; // Incremented to force update
const IMAGE_CACHE_NAME = 'gpspedia-images-v3'; // Incremented to force update

const urlsToCache = [
  '/',
  './index.html',
  './manifest.json',
  './icon-v2-192x192.png', // Add new icons to the cache
  './icon-v2-512x512.png'
];

self.addEventListener('install', event => {
  // Perform install steps
  event.waitUntil(
    caches.open(SHELL_CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Force the waiting service worker to become the active service worker.
  );
});

self.addEventListener('activate', event => {
  // Clean up old caches and take control of the page
  const cacheWhitelist = [SHELL_CACHE_NAME, IMAGE_CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all open clients immediately
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignore requests to the Google Sheets API, always fetch from network.
  if (url.hostname.includes('sheets.googleapis.com')) {
    return;
  }

  // Cache-First strategy for Google Drive images.
  if (url.hostname.includes('drive.google.com')) {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          const fetchPromise = fetch(event.request).then(networkResponse => {
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Cache-First strategy for the application shell.
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});