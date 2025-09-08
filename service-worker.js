// service-worker.js
// This file enables offline support by caching assets for the game.

const CACHE_NAME = "busting-bias-v2"; // Name of the cache for this version

// List of assets to pre-cache for offline use
const PRECACHE_ASSETS = [
  "/", // Root page
  "/index.html", // Main HTML file
  "/style.css", // Stylesheet
  "/game.js", // Game logic
  "/manifest.json", // PWA manifest
  "/icons/icon-192.png", // App icon (small)
  "/icons/icon-512.png", // App icon (large)
  "/correct.wav", // Sound for correct answers
  "/incorrect.wav", // Sound for incorrect answers
  "/offline.html" // Offline fallback page
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