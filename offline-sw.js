const CACHE_NAME = "waste-guide-2026-08-03-result-header-v2";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/meta.json",
  "/milos-app.json",
  "/milos-essentials.json",
  "/assets/icon.svg",
  "/assets/preview.svg",
  "/src/styles.css",
  "/src/app.js",
  "/src/i18n.js",
  "/src/search.js",
  "/src/shell-session.js",
  "/vendor/milosapps-shell/v2/bootstrap.js",
  "/vendor/milosapps-shell/v2/milos-app-shell.js",
  "/vendor/milosapps-shell/v2/milos-app-shell.css",
  "/vendor/milosapps-shell/v2/milos-app-shell-theme.css",
  "/vendor/milosapps-shell/v2/shell-lock.json",
  "/vendor/milosapps-essentials/v1/bootstrap.js",
  "/vendor/milosapps-essentials/v1/milos-app-essentials.js",
  "/vendor/milosapps-essentials/v1/milos-app-essentials.css",
  "/vendor/milosapps-essentials/v1/milos-app-essentials-theme.css",
  "/vendor/milosapps-essentials/v1/essentials-lock.json",
  "/public/data/waste-items.v1.json",
  "/public/data/sources.v1.json",
  "/public/data/regions.v1.json",
  "/public/data/locales/en.v1.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", copy));
          return response;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached ?? network;
    })
  );
});
