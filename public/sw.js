// Gamifly service worker: network-first for pages, cache-first for hashed build assets,
// stale-while-revalidate for everything else (avatar models, textures, icons) → works offline after first visit.
const CACHE = 'gamifly-v2'
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './favicon.svg']))) })
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})
const put = (req, r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)) } return r }
self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put('./index.html', copy)); return r }).catch(() => caches.match('./index.html')))
    return
  }
  const sameOrigin = url.origin === self.location.origin
  const fonts = url.host.includes('fonts.g')
  if (!sameOrigin && !fonts) return
  const immutable = fonts || url.pathname.includes('/assets/')
  if (immutable) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => put(req, r))))
    return
  }
  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((r) => put(req, r)).catch(() => hit)
    return hit || net
  }))
})
