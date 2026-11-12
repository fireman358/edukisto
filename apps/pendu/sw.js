/* ==========================================================================
   sw.js — service worker du jeu PENDU
   Réseau d'abord (on sert toujours la version déployée), cache en secours
   pour le mode hors ligne. Les URL versionnées (?v=…) sont normalisées pour
   retrouver les entrées du cache.
   ========================================================================== */
const VERSION = "1.3.0";
const CACHE = "pendu-" + VERSION;

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/style.css",
  "./assets/game.js",
  "./assets/scene.js",
  "./assets/gore.js",
  "./assets/annexes.js",
  "./assets/lexique.js",
  "./assets/favicon.png",
  "./assets/img/icon-192.png",
  "./assets/img/icon-512.png",
];

/** Clé de cache stable : on ignore le paramètre de version ?v=… */
function cacheKey(request) {
  const url = new URL(request.url);
  url.searchParams.delete("v");
  return url.toString();
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const key = cacheKey(req);

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(key, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(key).then((hit) => {
          if (hit) return hit;
          if (req.mode === "navigate") return caches.match("./index.html");
          return new Response("", { status: 504, statusText: "Hors ligne" });
        })
      )
  );
});
