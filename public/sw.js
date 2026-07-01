// ============================================================================
// KILL-SWITCH Service Worker
// ----------------------------------------------------------------------------
// El SW anterior usaba estrategia "network-first": hacía fetch a la red en CADA
// request y solo usaba el caché como fallback offline. Es decir, NO ahorraba
// bandwidth — re-descargaba toda la app desde Netlify en cada apertura. Eso
// disparó el consumo de bandwidth hasta agotar la cuota free.
//
// Este SW reemplaza al anterior, borra todos los cachés que dejó y se
// auto-desregistra. Borrar el archivo no alcanzaba: los equipos que ya tenían
// el SW viejo instalado lo seguirían usando. Este se instala encima y se mata.
//
// El navegador detecta que sw.js cambió (byte-diff) en la próxima navegación,
// instala este, lo activa, y en activate se limpia todo.
// ============================================================================

self.addEventListener('install', () => {
  // Activar de inmediato, sin esperar a que se cierren las pestañas viejas.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 1. Borrar TODOS los cachés que dejó el SW anterior.
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));

      // 2. Desregistrar este Service Worker.
      await self.registration.unregister();

      // 3. Recargar las pestañas abiertas para que queden sin SW controlándolas.
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        if ('navigate' in client) client.navigate(client.url);
      }
    })()
  );
});

// NO hay handler de 'fetch': el SW no intercepta nada. Todas las requests van
// directo a la red y al caché HTTP normal del navegador.
