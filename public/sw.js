// Minimal service worker for PWA installability
// Caches app shell only — NO offline lesson/audio/image caching

const CACHE_NAME = "allstars-shell-v1";
const SHELL_ASSETS = ["/logo-small.png", "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Network-first for everything — no offline support in this version
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
