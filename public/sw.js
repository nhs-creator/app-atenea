const CACHE_NAME = 'atenea-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png'
];

// Install event: cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
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

// Fetch event: Network first con bypass para Supabase
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // IMPORTANTE: Bypass total para Supabase para evitar race conditions
  if (event.request.url.includes('supabase.co')) {
    return; // El SW no interviene en estas peticiones
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});