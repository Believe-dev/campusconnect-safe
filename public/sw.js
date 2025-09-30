const CACHE_NAME = 'unimarket-v1';
const STATIC_CACHE = 'unimarket-static-v1';
const DYNAMIC_CACHE = 'unimarket-dynamic-v1';

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
  
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone response for caching
            const responseToCache = response.clone();
            
            // Cache dynamic content
            caches.open(DYNAMIC_CACHE)
              .then(cache => {
                cache.put(request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Offline fallback
            if (request.destination === 'document') {
              return caches.match('/offline.html');
            }
          });
      })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(clientList => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New notification from UniMarket',
    icon: '/logo.png',
    badge: '/logo.png',
    tag: 'unimarket-notification',
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: '/logo.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('UniMarket', options)
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