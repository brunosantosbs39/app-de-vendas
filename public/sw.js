const CACHE_NAME = 'sistema-elite-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/login',
  '/estoque',
  '/financeiro',
  '/clientes',
  '/manifest.json',
  '/icon-192x192.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Estratégia: Tenta rede, se falhar vai pro cache
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
