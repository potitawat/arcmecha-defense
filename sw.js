const CACHE = "arcmecha-defense-v2";
const FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./balance.js",
  "./game.js",
  "./icon.svg",
  "./manifest.webmanifest",
  "./assets/fortress-hero-v2.jpg",
  "./assets/zombie-king-v2.jpg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("arcmecha-defense-") && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request).then(hit => hit || (event.request.mode === "navigate" ? caches.match("./index.html") : Response.error())))
  );
});
