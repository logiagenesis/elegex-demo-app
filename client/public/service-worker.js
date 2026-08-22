const CACHE_NAME = "elegex-shell-v3";
const NAVIGATION_FALLBACK = "/";
const APP_SHELL_ROUTES = ["/", "/app", "/field", "/login"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL_ROUTES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/storage/")
  ) {
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            void caches
              .open(CACHE_NAME)
              .then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const routeShell = await caches.match(url.pathname);
          return routeShell || caches.match(NAVIGATION_FALLBACK);
        })
    );
    return;
  }
  if (request.method !== "GET") return;
  event.respondWith(
    caches.match(request).then(
      cached =>
        cached ||
        fetch(request).then(response => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            void caches
              .open(CACHE_NAME)
              .then(cache => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});
