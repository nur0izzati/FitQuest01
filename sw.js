const CACHE_NAME = 'fitquest-cache-v4';
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
  './assets/sugar-cube.png',
  './assets/apple.png',
  './assets/slime.png',
  './assets/bg-music.mp3'
];

// Cache core game layers during installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Safe map loop prevents a single missing file from breaking the installation
      return Promise.all(
        ASSETS_TO_CACHE.map(url => {
          return cache.add(url).catch(err => {
            console.warn(`FitQuest Cache Warning: Asset skipped or missing -> ${url}`);
          });
        })
      );
    })
  );
  self.skipWaiting();
});

// Clear old cache versions automatically
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fallback logic to instantly pull from cache offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
