// public/sw.js

// --- konfigurasi lokal, jangan import dari file TS ---
const CACHE_VERSION = "IDIK-v7.1";
const PRECACHE_URLS = ["/", "/dashboard", "/favicon.ico", "/manifest.json"];

// --- instalasi cache baru ---
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// --- aktivasi dan hapus cache lama ---
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_VERSION) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// --- intercept fetch request ---
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200) return response;
          const cloned = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(event.request, cloned);
          });
          return response;
        })
        .catch(() => cached);
    })
  );
});

// --- notifikasi versi baru ---
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
