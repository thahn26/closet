// 오프라인 지원: 앱 파일은 네트워크 우선, 실패하면 캐시.
// 누끼·사진 분석 도구(CDN 파일, 수십 MB)는 한 번 받으면 캐시에서 꺼내 쓴다. 날씨는 건드리지 않음.
const CACHE = 'closet-v3';
const TOOLS = 'closet-tools-v1';
const ASSETS = [
  './', './index.html', './style.css', './manifest.webmanifest',
  './data/catalog.js', './data/swipe.js', './js/swipe.js',
  './js/store.js', './js/ui.js', './js/color.js', './js/weather.js', './js/stylist.js', './js/mannequin.js',
  './js/cutout.js', './js/vision.js', './js/closet.js', './js/today.js', './js/fitting.js', './js/style.js', './js/me.js', './js/app.js',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
];
const TOOL_HOSTS = ['cdn.jsdelivr.net', 'staticimgly.com', 'storage.googleapis.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== TOOLS).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (TOOL_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.open(TOOLS).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(req, { cache: 'no-cache' }).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});
