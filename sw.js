const CACHE = 'panaderia-v4';
const ASSETS = ['/', '/index.html', '/style.css', '/app.js', '/data.js', '/db.js',
  '/manifest.json', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Nunca cachear la API (datos siempre frescos y escrituras)
  if (url.includes('/api/')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Cache-first para assets estaticos (offline)
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
