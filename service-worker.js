const CACHE_NAME = 'gpspedia-shell-v1';

// Archivos que componen la "cáscara" de la aplicación.
const urlsToCache = [
  '/',
  './index.html',
  './manifest.json'
];

// Instala el Service Worker y guarda en caché los archivos de la cáscara.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache de la aplicación abierto y cacheando archivos base');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activa el Service Worker y limpia las cachés antiguas.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Intercepta las peticiones.
self.addEventListener('fetch', event => {
  // Ignora completamente las peticiones a la API de Google Sheets,
  // permitiendo que siempre vayan directamente a la red.
  if (event.request.url.includes('sheets.googleapis.com')) {
    return; // No hace nada, la petición va a la red como si no hubiera SW.
  }

  // Para todos los demás recursos (la cáscara de la app), usa la estrategia Cache-First.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si el recurso está en la caché, lo devuelve. Si no, lo busca en la red.
        return response || fetch(event.request);
      })
  );
});