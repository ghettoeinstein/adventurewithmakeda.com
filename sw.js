// Pages: network-first. Assets: stale-while-revalidate, so updates land on the next visit.
const CACHE = 'awm-multiverse-v4';
const CORE = [
  './', './index.html', './story.html', './world.html', './parents.html',
  './styles.css', './site.js', './manifest.json', './favicon.svg',
  './assets/logo-360.webp', './assets/logo-720.webp', './assets/logo-1200.webp',
  './assets/book1-cover-480.webp', './assets/book3-cover-480.webp', './assets/book2-cover-640.webp', './assets/book2-cover-1024.webp', './assets/book4-cover-480.webp', './assets/book4-cover-768.webp',
  './assets/cameo-makeda.webp', './assets/cameo-apollo.webp', './assets/cameo-faith.webp',
  './assets/deco-heart.webp', './assets/deco-stars.webp', './assets/deco-gem-red.webp', './assets/deco-gem-green.webp', './assets/deco-crown.webp', './assets/deco-pearl.webp',
  './assets/value-learn.webp', './assets/value-faith.webp', './assets/value-love.webp', './assets/value-happiness.webp',
];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const put = res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(put).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html'))));
  } else {
    e.respondWith(caches.match(req).then(hit => {
      const fresh = fetch(req).then(put).catch(() => hit);
      return hit || fresh;
    }));
  }
});
