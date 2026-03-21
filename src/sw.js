import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache manifest injected by Vite PWA
precacheAndRoute(self.__WB_MANIFEST);

// Runtime caching — ported from the old vite.config.js workbox block
registerRoute(
  ({ url }) => /^https?:\/\/.*\/api\/.*/i.test(url.href),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 5 })]
  })
);

registerRoute(
  ({ url }) => /^https:\/\/fonts\.googleapis\.com\/.*/i.test(url.href),
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })
    ]
  })
);

// Push handler — receives server push and shows native OS notification
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'CRM', {
      body: data.body ?? '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: data.data ?? {}
    })
  );
});

// Notification click — focus/open the CRM tab at the entity URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { entityType, entityId } = event.notification.data ?? {};
  const urlMap = {
    deal: 'deals',
    lead: 'leads',
    contact: 'contacts',
    activity: 'activities',
    conversation: 'whatsapp'
  };
  const path =
    entityType && entityId
      ? `/${urlMap[entityType] ?? entityType}/${entityId}`
      : '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((list) => {
        if (list.length > 0) {
          list[0].navigate(path);
          return list[0].focus();
        }
        return clients.openWindow(path);
      })
  );
});
