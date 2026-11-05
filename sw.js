// Cache names belong only to this app, even when other Pages apps share the origin.
const PREFIX = 'space-explorer-';
const SHELL_CACHE = PREFIX + 'shell-v1';
const DATA_CACHE = PREFIX + 'data-v1';
const IMAGE_CACHE = PREFIX + 'images-v1';
const BASE = new URL('./', self.location.href);
const SHELL = [
  './', 'index.html', 'style.css?v=pwa1', 'js/dateRange.js',
  'js/script.js?v=pwa1', 'manifest.json', 'img/nasa-worm-logo.png',
  'img/icon-192.png', 'img/icon-512.png',
].map(path => new URL(path, BASE).href);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(PREFIX) &&
      ![SHELL_CACHE, DATA_CACHE, IMAGE_CACHE].includes(name)).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

// App files and previously viewed photos are served from cache first.
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const saved = await cache.match(request);
  if (saved) return saved;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') {
    try { await cache.put(request, response.clone()); } catch { /* Storage may be full. */ }
  }
  return response;
}

// Refresh NASA data online; reuse the last successful response if the network fails.
async function networkFirst(request) {
  const cache = await caches.open(DATA_CACHE);
  try {
    const response = await fetch(request, { signal: AbortSignal.timeout(10000) });
    if (response.ok) {
      try { await cache.put(request, response.clone()); } catch { /* Keep the live response. */ }
      return response;
    }
    if (response.status < 500) return response;
  } catch { /* Try this device's saved response. */ }
  const saved = await cache.match(request);
  return saved || new Response(JSON.stringify({ error: 'This date is not available offline.' }), {
    status: 503, headers: { 'Content-Type': 'application/json' },
  });
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin === 'https://science.nasa.gov' &&
      url.pathname.startsWith('/wp-json/wp/v2/apod-basic/')) {
    event.respondWith(networkFirst(event.request));
  } else if (event.request.mode === 'navigate' &&
             url.origin === BASE.origin && url.pathname.startsWith(BASE.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL_CACHE);
      return (await cache.match(BASE.href)) || fetch(event.request);
    })());
  } else if (event.request.destination === 'image') {
    event.respondWith(cacheFirst(event.request, IMAGE_CACHE));
  } else if (SHELL.includes(url.href)) {
    event.respondWith(cacheFirst(event.request, SHELL_CACHE));
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window' });
    const existing = windows.find(client => client.url.startsWith(BASE.href));
    if (existing) return existing.focus();
    return self.clients.openWindow(BASE.href);
  })());
});
