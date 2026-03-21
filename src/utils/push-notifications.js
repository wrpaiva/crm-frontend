export function isPushSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export async function requestPermission() {
  if (!isPushSupported()) return 'unsupported';
  const result = await Notification.requestPermission();
  return result;
}

export function getPermissionStatus() {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

export async function showNotification(title, options = {}) {
  if (!isPushSupported()) return;
  if (Notification.permission !== 'granted') return;

  const registration = await navigator.serviceWorker.ready;
  registration.showNotification(title, {
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    ...options
  });
}
