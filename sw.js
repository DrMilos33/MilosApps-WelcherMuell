self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.registration.unregister(),
      caches.keys().then((names) =>
        Promise.all(names.filter((name) => name.startsWith("waste-guide-")).map((name) => caches.delete(name)))
      )
    ])
  );
});
