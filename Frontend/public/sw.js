self.addEventListener('push', event => {
  let data = { title: 'SocialPilot update', body: 'Open your notification inbox.' }
  try { data = { ...data, ...event.data.json() } } catch { /* Display a safe notification for empty pushes. */ }
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, tag: `socialpilot-${data.id || 'update'}`, icon: '/favicon.svg' }))
})
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    const client = clients.find(c => new URL(c.url).origin === self.location.origin)
    return client ? client.focus() : self.clients.openWindow('/')
  }))
})
