/* eslint-disable no-restricted-globals */
// Service worker DEDICADO ao Web Push. Não faz cache de app-shell.
// Recebe pushes VAPID e abre a rota certa ao clicar na notificação.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: 'Politiza IA', body: '', url: '/campo/tarefas', tag: 'politiza' };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (_) {
    data.body = event.data?.text() ?? '';
  }

  const options = {
    body: data.body,
    tag: data.tag,
    renotify: true,
    icon: '/pwa-icon-192.png',
    badge: '/pwa-icon-192.png',
    data: { url: data.url },
    vibrate: [180, 90, 180],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/campo/tarefas';

  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of all) {
      const url = new URL(client.url);
      if (url.origin === self.location.origin) {
        await client.focus();
        // Navega o cliente para a rota alvo
        if ('navigate' in client) {
          try { await client.navigate(target); } catch (_) { /* noop */ }
        }
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
