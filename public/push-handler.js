/* Loaded by the existing Workbox worker; works even when no app window is open. */
self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data?.json() || {} } catch { /* still show the promised reminder */ }
  event.waitUntil(self.registration.showNotification('Pocket Ledger', {
    body: data.body || 'Anything to record today? A little check-in keeps your ledger up to date.',
    icon: '/pocket-ledger-icon.png', badge: '/pocket-ledger-icon.png',
    tag: 'daily-logging-reminder', data: { url: '/app?record=expense' },
  }))
})
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL('/app?record=expense', self.location.origin).href
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin)
    if (existing) { await existing.navigate(target); return existing.focus() }
    return self.clients.openWindow(target)
  })())
})
