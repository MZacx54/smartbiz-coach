// SmartBiz Coach Service Worker - High-Speed Offline-First PWA (v3)
const CACHE_NAME = 'smartbiz-cache-v3';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/favicon.png',
  '/logo-horizontal.webp',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => {
        // Ignore individual asset failure so SW still installs cleanly
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip cross-origin API calls (handled by services/api.ts localStorage cache)
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('api.smartbizcoach.com.ng') ||
    url.hostname.includes('onrender.com') ||
    url.hostname.includes('paystack.co')
  ) {
    return;
  }

  // 1. Cache-First for immutable hashed Vite bundles (/assets/*), images, icons, and fonts
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2?|ttf|css|js)$/) ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        }).catch(() => cachedResponse);
      })
    );
    return;
  }

  // 2. Stale-While-Revalidate for SPA navigation (/dashboard/cashbook, /login, etc.)
  // Serves cached app shell immediately (<50ms) and updates cache in background!
  if (event.request.mode === 'navigate' || (event.request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedShell = (await cache.match(event.request)) || (await cache.match('/index.html')) || (await cache.match('/'));

        const networkFetch = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put('/index.html', networkResponse.clone());
              cache.put('/', networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedShell);

        // If we have the cached SPA shell, return it immediately for instant load, while updating in background
        return cachedShell || networkFetch;
      })
    );
    return;
  }
});
