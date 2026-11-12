/* ===== Service worker Keskônmange =====
   Stratégie : réseau d'abord, cache en secours.
   Le cache-first précédent servait éternellement l'ancienne version de l'app.
   Change VERSION à chaque déploiement (ou injecte la date du build). */

const VERSION = "3";
const CACHE = "keskonmange-v" + VERSION;

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./sync.js",
  "./manifest.json",
  "./logo.jpg",
  "./favicon-32.png",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ASSETS.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Cloud cal-sync, Google, etc. : on ne met jamais en cache, on laisse passer.
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok) {
          const copie = res.clone();
          caches.open(CACHE).then(c => c.put(req, copie)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
  );
});
