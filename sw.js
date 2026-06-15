// INCREMENTED: Version bumped to v5 to clear old code out of user devices automatically
const CACHE_NAME = 'fitquest-cache-v5';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './game.js',
  './app.js',
  './manifest.json',
  './assets/background.png',
  './assets/choco-bar.png',
  './assets/hero-sprite.png',
  './assets/hero-sprite2.png',
  './assets/attack-sprite.png',  // ⬅️ Added: Pre-caches Female Attack animation
  './assets/attack-sprite2.png', // ⬅️ Added: Pre-caches Male Attack animation
  './assets/sugar-cube.png',
  './assets/apple.png',
  './assets/slime.png',
  './assets/bg-music.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        ASSETS_TO_CACHE.map(url => {
          return cache.add(url).catch(err => console.warn(`Asset skipped: ${url}`));
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// IMPROVED: Cache-First Strategy
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return from cache if found, otherwise fetch from network
      return response || fetch(event.request);
    })
  );
});
