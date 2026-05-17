const CACHE_NAME = 'studyquest-v1';
const ASSETS = [
  './index.html',
  './manifest.json'
];

// Installation — mise en cache des ressources statiques
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activation — nettoyage des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — stratégie : cache d'abord pour les assets, réseau pour l'API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Requêtes API Anthropic → toujours réseau
  if (url.hostname === 'api.anthropic.com') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Polices Google → réseau avec fallback cache
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          const fetchPromise = fetch(event.request).then(response => {
            cache.put(event.request, response.clone());
            return response;
          });
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Autres ressources → cache d'abord
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
