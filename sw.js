// My Día: permite abrir la app sin conexión y muestra las notificaciones
const CACHE = "midia-v18";
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(["./", "./index.html"])).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  // Primero la red (para recibir cambios); si no hay conexión, la copia guardada
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match("./index.html"))));
});

// El servidor solo "despierta" a la app; aquí se decide qué aviso enseñar
self.addEventListener("push", e => e.waitUntil(showDue()));
async function showDue(){
  const now = Date.now();
  let list = [], shown = [];
  const c = await caches.open("midia-data");
  const sURL = new URL("__schedule", self.registration.scope).href, hURL = new URL("__shown", self.registration.scope).href;
  try { const r = await c.match(sURL); if (r) list = await r.json(); } catch(e){}
  try { const r = await c.match(hURL); if (r) shown = await r.json(); } catch(e){}
  const due = list.filter(x => x.at <= now + 90000 && x.at > now - 6*3600e3 && !shown.includes(x.key));
  if (!due.length){
    return self.registration.showNotification("My Día", { body: "Tienes un aviso. Abre My Día para verlo.", tag: "midia-generico" });
  }
  for (const x of due.slice(0, 4)) await self.registration.showNotification(x.title || "My Día", { body: x.body, tag: x.key, requireInteraction: true, renotify: true, silent: false });
  shown = [...shown, ...due.map(x => x.key)].slice(-400);
  await c.put(hURL, new Response(JSON.stringify(shown), { headers: { "Content-Type": "application/json" } }));
}
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow("./")));
});
