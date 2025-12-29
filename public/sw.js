const CACHE_NAME = 'atenea-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event: cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Usamos map y Promise.all para intentar cachear cada recurso.
      // Si alguno falla, los demás se cachearán igual.
      return Promise.all(
        ASSETS.map(asset => {
          return cache.add(asset).catch(err => {
            console.warn(`No se pudo cachear el recurso: ${asset}`, err);
          });
        })
      );
    })
  );
  self.skipWaiting();
});

// Activate event: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch event: Network first, with cache fallback
self.addEventListener('fetch', (event) => {
  // Solo manejamos peticiones GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si la respuesta es válida, la guardamos en el cache (opcional)
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Si falla la red, intentamos buscar en el cache
        return caches.match(event.request);
      })
  );
});