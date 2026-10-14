// Bump this version whenever any file changes.
const CACHE = 'calc-v2';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './apple-touch-icon.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    // Try the network briefly so updates arrive; fall back to the cached app instantly offline.
    e.respondWith((async () => {
      const cached = (await caches.match(req, { ignoreSearch: true })) || (await caches.match('./index.html'));
      try {
        const net = await Promise.race([
          fetch(req),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 1500))
        ]);
        if (net && net.ok) {
          const c = await caches.open(CACHE);
          c.put('./index.html', net.clone());
          c.put('./', net.clone());
          return net;
        }
        return cached || net;
      } catch (err) {
        return cached || Response.error();
      }
    })());
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req)));
});
