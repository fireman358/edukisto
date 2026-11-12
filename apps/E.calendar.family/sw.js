/* Service Worker Edukisto Home — cache hors-ligne
   MISE À JOUR : incrémenter VERSION ci-dessous à chaque déploiement
   → le SW détecte le changement, purge l'ancien cache, recharge tout. */
const VERSION = "v2026-10-31.3";
const CACHE = "edukisto-home-" + VERSION;
const FICHIERS = [
  "./", "./index.html",
  "./css/style.css",
  "./js/app.js", "./js/storage.js", "./js/sync.js", "./js/meteo.js", "./js/sons.js",
  "./donnees/donnees-initiales.js", "./donnees/recettes.js",
  "./manifest.json",
  "./favicon-32.png", "./icon-512.png", "./version.txt"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS.map(f => f + "?v=" + VERSION))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    /* supprime TOUS les caches d'autres versions */
    caches.keys().then(cles => Promise.all(cles.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Network-first pour l'app : à chaque ouverture on re-vérifie le serveur,
   le cache ne sert que si le réseau échoue (hors-ligne). */
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.origin !== location.origin) return; // APIs (radios, Supabase, météo) : direct réseau
  e.respondWith(
    fetch(e.request).then(rep => {
      const copie = rep.clone();
      caches.open(CACHE).then(c => c.put(e.request, copie));
      return rep;
    }).catch(() => caches.match(e.request).then(r => r || caches.match("./index.html")))
  );
});

/* Message de l'app : forcer la mise à jour immédiate */
self.addEventListener("message", e => {
  if (e.data === "forcer-maj") {
    self.skipWaiting();
    self.clients.matchAll().then(clients => clients.forEach(c => c.navigate(c.url)));
  }
});
