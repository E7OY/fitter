const CACHE_NAME = 'fitter-v1';
const APP_ROOT = new URL('./', self.registration.scope);
const APP_SHELL = [
  APP_ROOT.href,
  new URL('manifest.webmanifest', APP_ROOT).href,
  new URL('icons/fitter-icon.svg', APP_ROOT).href,
  new URL('icons/fitter-icon-192.png', APP_ROOT).href,
  new URL('icons/fitter-icon-512.png', APP_ROOT).href,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('fitter-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function cacheResponse(event, request, response) {
  if (response.ok) {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone())),
    );
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => cacheResponse(event, request, response))
        .catch(async () => (await caches.match(request)) || caches.match(APP_ROOT.href)),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => cacheResponse(event, request, response))),
  );
});
