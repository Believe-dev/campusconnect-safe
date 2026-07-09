// Service worker disabled for development
// Uncomment the code below to enable caching in production

/*
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
  
  const action = event.action;
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

// Handle notification action clicks
self.addEventListener('notificationclick', (event) => {
  if (event.action === 'dismiss') {
    event.notification.close();
    return;
  }
  
  // Handle 'open' action or notification click (handled above)
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
*/