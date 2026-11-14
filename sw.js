/* 我的英文單字本：離線快取
   - 第一次打開時把所有檔案存到手機裡，之後沒網路也能用。
   - 有網路時：首頁先抓最新版（3 秒內沒回應就用手機裡的），其他檔案先用手機裡的、背景再更新。 */
const CACHE = "vocab-v13";
const FILES = ["./", "./index.html", "./words.js", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function fromNetwork(req, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(reject, ms);
    fetch(req).then(r => { clearTimeout(t); resolve(r); }, e => { clearTimeout(t); reject(e); });
  });
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const isPage = req.mode === "navigate" || req.url.endsWith("/") || req.url.endsWith("index.html");
  if (isPage) {
    // 首頁：網路優先，離線或太慢就用快取
    e.respondWith(
      fromNetwork(req, 3000).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)); return r; })
        .catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }
  // 其他檔案：先用快取，背景更新
  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; }).catch(() => cached);
      return cached || net;
    })
  );
});
