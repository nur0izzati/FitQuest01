const CACHE_NAME = 'fitquest-v1';
const ASSETS = [
  './',
  './index.html',
  './game.js',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js'
];

// Install Service Worker and Cache Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Fetch Assets from Cache when Offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
