// service-worker.js
const CACHE_NAME = "busting-bias-v2";

// List all assets you want to pre-cache
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/game.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/correct.wav",
  "/incorrect.wav"
  // "/offline.html" // add later if you create it
];

// Install: pre-cache core assets safely
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      for (const asset of PRECACHE_ASSETS) {
        try {
          await cache.add(asset);
          console.log(`[SW] Cached: ${asset}`);
        } catch (err) {
          console.warn(`[SW] Failed to cache ${asset}: ${err}`);
        }
      }
    })()
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => (key === CACHE_NAME ? null : caches.delete(key)))
      )
    )
  );
  self.clients.claim();
});

// Fetch: serve cached content when offline
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle HTTP(s) requests
  if (!req.url.startsWith("http")) return;

  if (req.mode === "navigate") {
    // HTML pages: try network first, fallback to cache, then offline.html
    event.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch {
          return (await caches.match(req)) || caches.match("/offline.html");
        }
      })()
    );
    return;
  }

  // Other requests: try cache first, fallback to network
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;

      try {
        const fresh = await fetch(req);

        // Only cache HTTP(s) requests
        if (req.url.startsWith("http")) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, fresh.clone());
        }

        return fresh;
      } catch {
        return cached; // fallback to cache if network fails
      }
    })()
  );
});