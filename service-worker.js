/* NTPC Simhadri Area Owner Geotag — offline service worker */
const CACHE = 'area-owner-v7';
const CORE = [
  './',
  './index.html',
  './app.js',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-192-maskable.png',
  './icon-512-maskable.png',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      // Cache core app files; CDN files cached best-effort (don't fail install if offline)
      Promise.allSettled(CORE.map(u => c.add(u)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Map tiles (Esri / OSM): cache-on-use so revisited areas work offline.
  const isTile = /arcgisonline\.com|tile\.openstreetmap\.org/.test(url.hostname);

  if (isTile) {
    e.respondWith(
      caches.open('tiles-v1').then(c =>
        c.match(req).then(hit => hit || fetch(req).then(res => {
          if (res && res.status === 200) c.put(req, res.clone());
          return res;
        }).catch(() => hit))
      )
    );
    return;
  }

  // App shell + CDN libs: cache-first, network fallback.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      try {
        if (res && res.status === 200 && (url.origin === location.origin || /cdnjs\.cloudflare\.com|gstatic\.com/.test(url.hostname))) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
      } catch (_) {}
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
