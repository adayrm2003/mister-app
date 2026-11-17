// Avisos de Míster: se cargan dentro del service worker de la app (ver vite.config.ts).
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: "Míster", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Míster", {
    body: d.body || "",
    tag: d.tag,
    icon: "/icons/icono-192.png",
    badge: "/icons/icono-192.png",
    data: { url: d.url || "/" }
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "/", self.location.origin).href;
  e.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const v of ventanas) {
      if (v.url.startsWith(self.location.origin)) { await v.focus(); return v.navigate ? v.navigate(url) : undefined; }
    }
    return self.clients.openWindow(url);
  })());
});
