const SHELL_CACHE_NAME = 'gpspedia-shell-v4';
const IMAGE_CACHE_NAME = 'gpspedia-images-v3';
const ALL_CACHES = [SHELL_CACHE_NAME, IMAGE_CACHE_NAME];

const urlsToCache = [
  '/',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cacheando el App Shell');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!ALL_CACHES.includes(cacheName)) {
            console.log('[Service Worker] Borrando caché antigua:', cacheName);
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

  if (url.hostname.includes('sheets.googleapis.com')) {
    // Siempre ir a la red para los datos de la API. La lógica offline se maneja en el cliente.
    return;
  }

  if (url.hostname.includes('drive.google.com')) {
    event.respondWith(cacheFirst(event.request, IMAGE_CACHE_NAME));
    return;
  }

  event.respondWith(staleWhileRevalidate(event.request, SHELL_CACHE_NAME));
});

async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            await cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.error('[Service Worker] Fallo al obtener del cache o red:', error);
        throw error;
    }
}

async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    });

    return cachedResponse || fetchPromise;
}

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'PRECACHE_IMAGES') {
        const urlsToPrecache = event.data.payload;
        if (urlsToPrecache && urlsToPrecache.length > 0) {
            event.waitUntil(
                caches.open(IMAGE_CACHE_NAME).then(cache => {
                    return Promise.all(
                        urlsToPrecache.map(url => {
                            return cache.add(url).catch(err => console.warn(`[SW] No se pudo cachear la imagen: ${url}`, err));
                        })
                    );
                })
            );
        }
    }
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientsArr => {
            const hadWindowToFocus = clientsArr.some(windowClient => windowClient.url === self.location.origin + '/' ? (windowClient.focus(), true) : false);
            if (!hadWindowToFocus) clients.openWindow(self.location.origin).then(windowClient => windowClient ? windowClient.focus() : null);
        })
    );
});