const CACHE_NAME = 'fitness-mirror-v2';

// 定義需要快取到本地端的檔案清單
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './js/MathUtils.js',
  './js/StateMachine.js',
  './js/exercises/squat.js',
  './js/exercises/lunge.js',
  './js/exercises/plank.js',
  './js/app.js'
];

// 安裝階段：將檔案寫入快取
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('快取已開啟');
        return cache.addAll(urlsToCache);
      })
  );
});

// 攔截網路請求：如果快取有檔案，就直接從本地拿 (離線也能運作)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果在快取中找到匹配的檔案，直接回傳
        if (response) {
          return response;
        }
        // 否則透過網路去抓取 (例如 MediaPipe 動態載入的 WASM 模型檔)
        return fetch(event.request);
      })
  );
});

// 啟動階段：清除舊版本的快取
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
