// Legacy service worker shutdown for the React/Vite version of «Строитель».
// The previous app cached the old HTML/CSS/JS shell under stroitel-v1.
// This worker deliberately clears those caches and unregisters itself.
self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: "window", includeUncontrolled: true }))
      .then(clients => clients.forEach(client => client.navigate(client.url)))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(fetch(event.request));
});
