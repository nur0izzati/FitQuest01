/**
 * FitQuest: PWA Service Worker (service-worker.js)
 * Menguruskan sistem caching supaya game boleh dibuka secara offline tanpa internet.
 */

const CACHE_NAME = 'fitquest-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './game.js',
  './app.js',
  './manifest.json'
  // Anda boleh tambah fail asset lain di sini jika ada, contohnya:
  // './styles.css',
  // './assets/icon-192.png'
];

// 1. Fasa Pemasangan (Install Event) - Menyimpan fail penting ke dalam cache memori telefon
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('FitQuest Cache: Menyimpan fail asas ke dalam memori peranti...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Fasa Pengaktifan (Activate Event) - Membuang cache lama jika ada kemas kini baru
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('FitQuest Cache: Memadam cache lama yang tidak digunakan...');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. Fasa Pengambilan Data (Fetch Event) - Membuka fail dari cache jika tiada talian internet
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Pulangkan fail dari cache jika ada, jika tiada ambil dari rangkaian internet asal
      return cachedResponse || fetch(event.request);
    })
  );
});
