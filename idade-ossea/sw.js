// Public app/model metadata only. Images and examination data never enter caches.
const CACHE = "bone-age-app-258ec98689f2c5ab";
const FILES = ["./","./assets/index-4ifJESps.css","./assets/index-Dei2Wr_o.js","./assets/inference.worker-ChvjbgoQ.js","./favicon.svg","./index.html","./model-license.txt","./model-notice.txt","./runtime/ort-wasm-simd-threaded.mjs","./runtime/ort-wasm-simd-threaded.wasm"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
});
// A new version waits until every tab closes, which can strand a visitor on an
// old build for days. The page offers the update; this applies it on request.
self.addEventListener("message", (event) => {
  if (event.data?.type === "skip-waiting") self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith("bone-age-app-") && key !== CACHE)
          await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.endsWith(".onnx")
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      // These are immutable public assets. Ignore the dev server's Vary: Origin
      // difference between cache.addAll() and module-script requests.
      const cached = await cache.match(event.request, { ignoreVary: true });
      if (cached) return cached;
      if (event.request.mode === "navigate") {
        try {
          return await fetch(event.request);
        } catch {
          return await cache.match("./");
        }
      }
      return fetch(event.request);
    })(),
  );
});
