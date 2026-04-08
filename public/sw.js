const VERSION = 'v2';
const APP_SHELL = `tcg-pokemon-shell-${VERSION}`;
const ASSET_CACHE = `tcg-pokemon-assets-${VERSION}`;
const API_CACHE = `tcg-pokemon-api-${VERSION}`;
const IMAGE_CACHE = `tcg-pokemon-images-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL).then((cache) => cache.addAll(['/', '/index.html']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => ![APP_SHELL, ASSET_CACHE, API_CACHE, IMAGE_CACHE].includes(key))
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

function isAppAsset(requestUrl) {
  return requestUrl.origin === self.location.origin;
}

function isApiRequest(requestUrl) {
  return requestUrl.origin === 'https://api.pokemontcg.io';
}

function isImageRequest(requestUrl) {
  return requestUrl.origin === 'https://images.pokemontcg.io';
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || networkPromise;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error('Network and cache miss');
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

  if (isApiRequest(requestUrl)) {
    event.respondWith(networkFirst(event.request, API_CACHE));
    return;
  }

  if (isImageRequest(requestUrl)) {
    event.respondWith(staleWhileRevalidate(event.request, IMAGE_CACHE));
    return;
  }

  if (isAppAsset(requestUrl)) {
    event.respondWith(staleWhileRevalidate(event.request, ASSET_CACHE));
  }
});
