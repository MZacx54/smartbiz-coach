// SmartBiz Coach Service Worker - High-Speed Offline-First PWA (v4)
const CACHE_NAME = 'smartbiz-cache-v4';
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
        // Individual asset failure will not prevent SW installation
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. Never intercept backend API or external critical services
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/s/p/') ||
    url.pathname.startsWith('/s/u/') ||
    url.pathname === '/sw.js' ||
    url.hostname.includes('api.smartbizcoach.com.ng') ||
    url.hostname.includes('onrender.com') ||
    url.hostname.includes('paystack.co')
  ) {
    return;
  }

  // 2. Cache-First for static hashed assets (/assets/*), fonts, and images (never sw.js)
  if (
    (url.pathname.startsWith('/assets/') ||
     url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2?|ttf|css)$/)) &&
    !url.pathname.endsWith('/sw.js')
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

  // 3. Network-First with Offline Fallback for SPA navigations (/dashboard, /market, /login, etc.)
  // When online: users always get the freshest deployment bundle.
  // When offline: instantly falls back to cached index.html so the PWA works anywhere.
  if (event.request.mode === 'navigate' || (event.request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('/index.html', clone.clone());
              cache.put('/', clone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback
          const cache = await caches.open(CACHE_NAME);
          const cached = (await cache.match(event.request)) ||
                         (await cache.match('/index.html')) ||
                         (await cache.match('/'));
          if (cached) return cached;
          return new Response('Offline - SmartBiz Coach requires an internet connection for this page.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        })
    );
    return;
  }
});
