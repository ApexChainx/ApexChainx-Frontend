const BUILD_HASH = "__BUILD_HASH__"; // Injected at build time
const CACHE_NAME = `apexchain-static-v${BUILD_HASH}`;
const STATIC_ASSETS = [
  "/",
  "/login",
  "/outages",
  "/payments",
  "/bulk-import",
  "/webhooks",
];

// Offline fallback page
const OFFLINE_FALLBACK = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ApexChain - Offline</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
    .container { text-align: center; padding: 2rem; max-width: 400px; }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { color: #1e293b; margin-bottom: 0.5rem; }
    p { color: #64748b; margin-bottom: 1.5rem; }
    .btn { display: inline-block; padding: 0.75rem 1.5rem; background: #3b82f6; color: white; border: none; border-radius: 0.5rem; font-size: 1rem; cursor: pointer; text-decoration: none; }
    .btn:hover { background: #2563eb; }
    .btn:disabled { background: #94a3b8; cursor: not-allowed; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📡</div>
    <h1>You're Offline</h1>
    <p>This page isn't available offline. Check your connection and try again.</p>
    <button class="btn" id="retry-btn" onclick="window.location.reload()">Retry</button>
    <a href="/outages" class="btn" style="margin-top: 0.5rem; display: inline-block;">Back to Outages</a>
  </div>
  <script>
    // Auto-retry when online
    window.addEventListener('online', () => window.location.reload());
    // Disable retry button when offline
    window.addEventListener('offline', () => {
      document.getElementById('retry-btn').disabled = true;
    });
    window.addEventListener('online', () => {
      document.getElementById('retry-btn').disabled = false;
    });
  </script>
</body>
</html>
`;

const MAX_STATIC_ENTRIES = 50;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // API GET requests - network first with cache fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const cacheResponse = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cacheResponse));
          }
          return response;
        })
        .catch(async () => {
          // Try cache
          const cached = await caches.match(request);
          if (cached) return cached;
          // Return offline response for API
          return new Response(JSON.stringify({ error: "Offline", message: "This data is not available offline" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        })
    );
    return;
  }

  // Navigation requests - try cache, then network, then offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request)
          .then((response) => {
            if (response.ok) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
            }
            return response;
          })
          .catch(async () => {
            // Try cache for any matching route
            const cache = await caches.open(CACHE_NAME);
            const keys = await cache.keys();
            for (const key of keys) {
              if (key.url === request.url || key.url.endsWith(request.url.pathname)) {
                const match = await cache.match(key);
                if (match) return match;
              }
            }
            // Return offline fallback
            return new Response(OFFLINE_FALLBACK, {
              headers: { "Content-Type": "text/html" },
            });
          });
      })
    );
    return;
  }

  // Static assets - cache first with network fallback
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    )
  );
});

// Message listener for SKIP_WAITING (Issue #557)
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data?.type === "CLEANUP") {
    void cleanupOldEntries();
  }
});

// Notify clients of update available
async function notifyClientsOfUpdate() {
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: "UPDATE_AVAILABLE", cacheName: CACHE_NAME });
  });
}

// Periodic cleanup of old static entries
async function cleanupOldEntries() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  if (keys.length > MAX_STATIC_ENTRIES) {
    // Sort by date (oldest first) - we'd need to track timestamps
    // For simplicity, delete oldest half
    const toDelete = keys.slice(0, keys.length - MAX_STATIC_ENTRIES);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}

// Notify on new SW installation
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
  // Notify after install that update is available
  event.waitUntil(notifyClientsOfUpdate());
});
