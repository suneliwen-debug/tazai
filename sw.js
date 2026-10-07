// 网络优先：有网就拿最新版（最多等 3 秒），没网才用手机里的缓存
// 聊天记录和 API key 只存在手机本地，不经过这里
const CACHE = 'tazai-v51';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192-v3.png', 'icons/icon-512-v3.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
const timeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
self.addEventListener('fetch', e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== 'GET') return;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (isFont) { // 字体：缓存优先，不卡画面
    e.respondWith(caches.open(CACHE).then(async c => (await c.match(req)) || fetch(req).then(r => { c.put(req, r.clone()); return r; })));
    return;
  }
  if (u.origin !== location.origin) return; // Gemini、图片等一律走网络
  if (u.pathname.endsWith('/version.txt')) return; // 检查更新永远直接问网络
  const fresh = req.mode === 'navigate' ? u.pathname + '?_=' + Date.now() : req;
  e.respondWith(timeout(fetch(fresh, { cache: 'no-store' }), 3000).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req.mode === 'navigate' ? './' : req, copy)); }
    return r;
  }).catch(async () => (await caches.match(req.mode === 'navigate' ? './' : req, { ignoreSearch: true })) || Response.error()));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => { for (const c of cs) { if ('focus' in c) return c.focus(); } return self.clients.openWindow('./'); }));
});
