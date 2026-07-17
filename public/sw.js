// Bumping these version suffixes (v1 -> v2) is what makes the activate
// handler below actually purge anything — it only deletes caches whose name
// doesn't match these constants, so as long as the constants stay the same,
// every entry ever cached under them persists forever, un-evictable, even
// across new deploys. This bump clears out everything cached under the old
// cache-first strategy (see the fetch handler) that was serving the same
// stale JS/CSS bundle indefinitely regardless of how many times the app
// code changed.
const CACHE_NAME = 'unimarket-v2';
const STATIC_CACHE = 'unimarket-static-v2';
const DYNAMIC_CACHE = 'unimarket-dynamic-v2';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/logo.png',
  '/offline.html'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => 
              cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE
            )
            .map(cacheName => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip external requests
  if (!request.url.startsWith(self.location.origin)) return;

  // Never intercept Vite's dev-server-only endpoints. This matters even
  // though registration is production-only (see App.tsx) — a service worker
  // from an earlier prod build/preview can still be active on this origin,
  // and without this bypass it tries to cache/serve these as normal assets,
  // which breaks HMR and throws "Failed to convert value to 'Response'".
  const { pathname } = new URL(request.url);
  if (
    pathname.startsWith('/@vite') ||
    pathname.startsWith('/@react-refresh') ||
    pathname.startsWith('/@id/') ||
    pathname.startsWith('/src/') ||
    pathname.startsWith('/node_modules/')
  ) {
    return;
  }

  // Network-first, not cache-first: a cached copy is only ever a fallback
  // for when the network request fails (i.e. actually offline), never a
  // substitute for a reachable network. The previous cache-first order
  // meant that once any bundle was cached, it was served forever — the
  // network was never even consulted again as long as a cache entry
  // existed, so new deploys were invisible to anyone who'd already loaded
  // the app once.
  event.respondWith(
    fetch(request)
      .then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(DYNAMIC_CACHE)
          .then(cache => {
            cache.put(request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        return caches.match(request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            if (request.destination === 'document') {
              return caches.match('/offline.html');
            }
            // event.respondWith() requires a Response — returning undefined
            // here throws "Failed to convert value to 'Response'" for every
            // non-document request that fails offline (scripts, styles, etc).
            return Response.error();
          });
      })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  if (event.action === 'dismiss') {
    event.notification.close();
    return;
  }

  event.notification.close();

  const notificationData = event.notification.data || {};

  let targetUrl = '/';
  
  // Determine target URL based on notification data
  if (notificationData.url) {
    targetUrl = notificationData.url;
  } else if (notificationData.type) {
    switch (notificationData.type) {
      case 'message':
        targetUrl = '/messages';
        break;
      case 'order':
        targetUrl = '/orders';
        break;
      case 'payment':
        targetUrl = '/wallet';
        break;
      case 'seller':
        targetUrl = '/dashboard';
        break;
      default:
        targetUrl = '/notifications';
    }
  } else {
    targetUrl = '/notifications';
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            // Navigate to target URL and focus
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              url: targetUrl,
              data: notificationData
            });
            return client.focus();
          }
        }
        
        // Open new window with target URL
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  let notificationData = {};
  let title = 'UniMarket';
  let body = 'You have a new notification';
  
  if (event.data) {
    try {
      notificationData = event.data.json();
      title = notificationData.title || title;
      body = notificationData.body || notificationData.message || body;
    } catch (e) {
      body = event.data.text();
    }
  }
  
  const options = {
    body: body,
    icon: '/logo.png',
    badge: '/logo.png',
    tag: 'unimarket-notification',
    vibrate: [200, 100, 200],
    requireInteraction: false,
    silent: false,
    data: notificationData,
    actions: [
      {
        action: 'open',
        title: 'Open',
        icon: '/logo.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle offline actions when back online
      handleBackgroundSync()
    );
  }
});

function handleBackgroundSync() {
  // Implement offline action handling
  return Promise.resolve();
}