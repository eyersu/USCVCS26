// Civics PWA service worker.
// Navigations are NETWORK-FIRST: when online, always load the freshest app and refresh the
// cached copy; when offline, fall back to the cached copy. Other assets are cache-first.
// With this strategy content updates appear on the next launch WITHOUT bumping a version or
// reinstalling — bump CACHE only when this SW logic or the offline asset list itself changes.
const CACHE = "civics-v31";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest",
                "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  // Page loads: network-first so the newest app shows up as soon as it's online.
  const isPage = req.mode === "navigate" || req.destination === "document";
  if (isPage) {
    e.respondWith(
      fetch(req)
        .then((resp) => {
          try {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put("./index.html", copy));
          } catch (_) {}
          return resp;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")))
    );
    return;
  }

  // Everything else: cache-first with runtime caching.
  e.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req)
        .then((resp) => {
          try {
            if (resp && resp.status === 200 && (resp.type === "basic" || resp.type === "default")) {
              const copy = resp.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
          } catch (_) {}
          return resp;
        })
        .catch(() => caches.match("./index.html"))
    )
  );
});
