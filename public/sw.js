/*
 * Offline is not a feature here, it is the baseline: the data never leaves the
 * device, so the app has no reason to need a network to open.
 *
 * Stale-while-revalidate over every same-origin GET. The build emits hashed
 * asset names, so there is no precache manifest to keep in step — the first
 * visit populates the cache and every later one is served from it while a fresh
 * copy is fetched in the background.
 */
const CACHE = "squares-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);

      const fresh = fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === "basic") {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        event.waitUntil(fresh);
        return cached;
      }

      const response = await fresh;
      if (response) return response;

      if (request.mode === "navigate") {
        const shell = (await cache.match("/")) || (await cache.match("/index.html"));
        if (shell) return shell;
      }
      return new Response("offline", { status: 503, statusText: "offline" });
    })(),
  );
});
