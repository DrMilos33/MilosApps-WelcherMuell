const CACHE_NAME = "waste-guide-2026-08-03-search-v4";
const APP_SHELL = [
  "/MilosApps-WelcherMuell/",
  "/MilosApps-WelcherMuell/index.html",
  "/MilosApps-WelcherMuell/manifest.webmanifest",
  "/MilosApps-WelcherMuell/meta.json",
  "/MilosApps-WelcherMuell/milos-app.json",
  "/MilosApps-WelcherMuell/milos-essentials.json",
  "/MilosApps-WelcherMuell/assets/icon.svg",
  "/MilosApps-WelcherMuell/assets/preview.svg",
  "/MilosApps-WelcherMuell/src/styles.css",
  "/MilosApps-WelcherMuell/src/app.js",
  "/MilosApps-WelcherMuell/src/i18n.js",
  "/MilosApps-WelcherMuell/src/search.js",
  "/MilosApps-WelcherMuell/src/shell-session.js",
  "/MilosApps-WelcherMuell/vendor/milosapps-shell/v2/bootstrap.js",
  "/MilosApps-WelcherMuell/vendor/milosapps-shell/v2/milos-app-shell.js",
  "/MilosApps-WelcherMuell/vendor/milosapps-shell/v2/milos-app-shell.css",
  "/MilosApps-WelcherMuell/vendor/milosapps-shell/v2/milos-app-shell-theme.css",
  "/MilosApps-WelcherMuell/vendor/milosapps-shell/v2/shell-lock.json",
  "/MilosApps-WelcherMuell/vendor/milosapps-essentials/v1/bootstrap.js",
  "/MilosApps-WelcherMuell/vendor/milosapps-essentials/v1/milos-app-essentials.js",
  "/MilosApps-WelcherMuell/vendor/milosapps-essentials/v1/milos-app-essentials.css",
  "/MilosApps-WelcherMuell/vendor/milosapps-essentials/v1/milos-app-essentials-theme.css",
  "/MilosApps-WelcherMuell/vendor/milosapps-essentials/v1/essentials-lock.json",
  "/MilosApps-WelcherMuell/public/data/waste-items.v1.json",
  "/MilosApps-WelcherMuell/public/data/sources.v1.json",
  "/MilosApps-WelcherMuell/public/data/regions.v1.json",
  "/MilosApps-WelcherMuell/public/data/locales/en.v1.json"
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
          caches.open(CACHE_NAME).then((cache) => cache.put("/MilosApps-WelcherMuell/index.html", copy));
          return response;
        })
        .catch(() => caches.match("/MilosApps-WelcherMuell/index.html"))
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
