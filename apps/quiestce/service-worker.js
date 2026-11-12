/* Service worker « Qui suis-je ? » — cache de l'application et des thèmes. */
'use strict';

const VERSION = 'qui-suis-je-v1.3.1';
const CACHE_APP = `${VERSION}-app`;
const CACHE_RUNTIME = `${VERSION}-runtime`;

const FICHIERS_APPLICATION = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/utils.js',
  './js/storage.js',
  './js/themes.js',
  './js/ai.js',
  './js/engine.js',
  './js/app.js',
  './js/pwa.js',
  './data/themes.bundle.js',
  './data/themes/index.json',
  './data/themes/classique.json',
  './data/themes/animaux.json',
  './data/themes/star-wars.json',
  './data/themes/nourriture.json',
  './data/themes/harry-potter.json',
  './data/themes/marvel.json',
  './data/themes/dc-comics.json',
  './data/themes/seigneur-des-anneaux.json',
  './assets/favicon.svg',
  './assets/icone-192.png',
  './assets/icone-512.png',
  './assets/icone-maskable-512.png',
  './assets/apple-touch-icon.png',
  './assets/portraits/index.json'
];

self.addEventListener('install', (evenement) => {
  evenement.waitUntil(
    caches
      .open(CACHE_APP)
      .then(async (cache) => {
        await cache.addAll(FICHIERS_APPLICATION);

        // Les 192 portraits sont pré-cachetés à partir de l'index généré.
        // Chaque ajout est indépendant : un asset absent ne bloque pas
        // l'installation de l'application.
        try {
          const reponse = await cache.match('./assets/portraits/index.json');
          if (!reponse) return;
          const index = await reponse.json();
          const fichiers = (index.fichiers || []).map((fichier) =>
            `./${String(fichier).replace(/^\.?\//, '')}`
          );
          await Promise.allSettled(fichiers.map((fichier) => cache.add(fichier)));
        } catch (erreur) {
          console.warn('[SW] Index de portraits indisponible :', erreur);
        }
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evenement) => {
  evenement.waitUntil(
    caches
      .keys()
      .then((noms) =>
        Promise.all(
          noms
            .filter((nom) => nom !== CACHE_APP && nom !== CACHE_RUNTIME)
            .map((nom) => caches.delete(nom))
        )
      )
      .then(() => self.clients.claim())
  );
});

function estNavigation(requete) {
  return requete.mode === 'navigate' || (requete.method === 'GET' && requete.headers.get('accept')?.includes('text/html'));
}

function estRessourceStatique(url) {
  return /\.(css|js|json|png|svg|webp|jpg|jpeg|woff2?)$/.test(url.pathname);
}

self.addEventListener('fetch', (evenement) => {
  const requete = evenement.request;
  if (requete.method !== 'GET') return;

  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return;

  // Navigation : réseau d'abord, puis coquille en cache pour fonctionner hors-ligne.
  if (estNavigation(requete)) {
    evenement.respondWith(
      fetch(requete)
        .then((reponse) => {
          const copie = reponse.clone();
          caches.open(CACHE_APP).then((cache) => cache.put('./index.html', copie));
          return reponse;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_APP);
          return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
        })
    );
    return;
  }

  if (!estRessourceStatique(url)) return;

  // Ressources : cache immédiat + revalidation en arrière-plan.
  evenement.respondWith(
    caches.match(requete, { ignoreSearch: false }).then((reponseCache) => {
      const reseau = fetch(requete)
        .then((reponse) => {
          if (reponse && reponse.ok) {
            const copie = reponse.clone();
            caches.open(CACHE_RUNTIME).then((cache) => cache.put(requete, copie));
          }
          return reponse;
        })
        .catch(() => null);

      if (reponseCache) {
        evenement.waitUntil(reseau);
        return reponseCache;
      }

      return reseau.then((reponse) => {
        if (reponse) return reponse;
        return new Response('Ressource indisponible hors-ligne.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      });
    })
  );
});

self.addEventListener('message', (evenement) => {
  if (evenement.data && evenement.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
