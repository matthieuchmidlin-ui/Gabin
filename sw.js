const CACHE_NAME = 'studyquest-v2';
const ASSETS = ['./index.html', './manifest.json'];

// Installation
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activation
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — stratégie minimaliste pour iOS Safari
// On ne touche PAS aux requêtes externes (API, fonts, CDN)
// On gère uniquement les fichiers locaux de l'app
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Laisser passer SANS interception :
  // - Toutes les requêtes non-GET (POST, PUT... = appels API)
  // - Tout ce qui est externe (api.anthropic.com, fonts, CDN unpkg...)
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin
  ) {
    // Ne pas appeler event.respondWith → le navigateur gère directement
    return;
  }

  // Uniquement pour les fichiers locaux de l'app (index.html, manifest.json, sw.js, icônes)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Mettre en cache seulement les ressources locales valides
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // Fallback offline : retourner index.html si disponible
      return caches.match('./index.html');
    })
  );
});
