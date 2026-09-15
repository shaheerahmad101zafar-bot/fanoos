const CACHE = "fanoos-shell-v6";
const SHELL = [
  "/",
  "/shop",
  "/shop/pos",
  "/shop/invoices",
  "/shop/more",
  "/shop/products",
  "/shop/settings",
  "/shop/cash",
  "/shop/customers",
  "/shop/discounts",
  "/shop/printer",
  "/manifest.webmanifest",
  "/icon",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      for (const url of SHELL) {
        await cache.add(url).catch(() => undefined);
      }
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (
    url.pathname.endsWith(".apk") ||
    url.pathname.endsWith(".zip") ||
    url.pathname.startsWith("/download") ||
    url.pathname.startsWith("/install")
  ) {
    return;
  }

  const put = (res) => {
    if (res && res.ok && (res.type === "basic" || res.type === "cors")) {
      const copy = res.clone();
      caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => undefined);
    }
    return res;
  };

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(put)
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match("/shop") || caches.match("/")),
        ),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) {
        fetch(req).then(put).catch(() => undefined);
        return hit;
      }
      return fetch(req)
        .then(put)
        .catch(() => hit);
    }),
  );
});
