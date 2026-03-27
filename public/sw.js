/* Minimal no-cache service worker.
 * Tujuan: cegah stale _next/static asset (CSS/JS chunk) setelah deploy/build ulang.
 */
const SW_VERSION = "idik-sw-no-cache-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SW_VERSION)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Intentionally no fetch handler so requests go directly to network.
