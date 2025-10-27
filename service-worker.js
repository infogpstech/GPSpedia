const SHELL_CACHE_NAME = 'gpspedia-shell-v3';
const IMAGE_CACHE_NAME = 'gpspedia-images-v2';
const ALL_CACHES = [SHELL_CACHE_NAME, IMAGE_CACHE_NAME];

const urlsToCache = [
  '/',
  './index.html',
  './manifest.json'
];

// --- FASE DE INSTALACIÓN ---
// Se cachean los archivos esenciales de la aplicación.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cacheando el App Shell');
        return cache.addAll(urlsToCache);
      })
  );
});

// --- FASE DE ACTIVACIÓN ---
// Se limpia cualquier caché antigua que no esté en la lista blanca.
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

// --- FASE DE FETCH (INTERCEPCIÓN DE PETICIONES) ---
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignorar peticiones a la API de Google Sheets. La lógica offline para esto se maneja en el cliente con IndexedDB.
  if (url.hostname.includes('sheets.googleapis.com')) {
    return;
  }

  // Estrategia: Cache First para las imágenes de Google Drive.
  // Responde desde la caché si está disponible, si no, va a la red y guarda la respuesta en caché.
  if (url.hostname.includes('drive.google.com')) {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then(networkResponse => {
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // Estrategia: Stale-While-Revalidate para los archivos de la aplicación.
  // Responde inmediatamente desde la caché y luego actualiza la caché con la versión de la red.
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        caches.open(SHELL_CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
        });
        return networkResponse;
      });

      // Devuelve la respuesta de la caché si existe, si no, la de la red.
      return cachedResponse || fetchPromise;
    })
  );
});

// --- GESTIÓN DE NOTIFICACIONES ---
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientsArr => {
            const hadWindowToFocus = clientsArr.some(windowClient => windowClient.url === self.location.origin + '/' ? (windowClient.focus(), true) : false);
            if (!hadWindowToFocus) clients.openWindow(self.location.origin).then(windowClient => windowClient ? windowClient.focus() : null);
        })
    );
});

// --- GESTIÓN DE MENSAJES (PARA PRECACHING) ---
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'PRECACHE_IMAGES') {
        const urlsToPrecache = event.data.payload;
        if (urlsToPrecache && urlsToPrecache.length > 0) {
            console.log('[Service Worker] Recibida solicitud de precache para', urlsToPrecache.length, 'imágenes.');
            event.waitUntil(
                caches.open(IMAGE_CACHE_NAME).then(cache => {
                    return Promise.all(
                        urlsToPrecache.map(url => {
                            // Usamos add para evitar errores si la imagen ya está en caché.
                            // Si una imagen falla, no detiene el resto del proceso.
                            return cache.add(url).catch(err => console.warn(`[Service Worker] No se pudo cachear la imagen: ${url}`, err));
                        })
                    );
                })
            );
        }
    }
});