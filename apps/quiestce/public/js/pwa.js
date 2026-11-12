/* Enregistrement du service worker et cycle de vie PWA. */
(function () {
  'use strict';

  if (!('serviceWorker' in navigator)) {
    console.info('Service worker indisponible : le jeu reste fonctionnel en ligne.');
    return;
  }

  if (window.location.protocol === 'file:') {
    console.info(
      'Ouverture directe en file:// : le jeu fonctionne, mais l’installation PWA nécessite un serveur local (demarrer.cmd ou serve.mjs).'
    );
    return;
  }

  window.addEventListener('load', async () => {
    try {
      const enregistrement = await navigator.serviceWorker.register('./service-worker.js', {
        scope: './'
      });
      console.info('Service worker enregistré. Le plateau est disponible hors-ligne.', enregistrement.scope);

      enregistrement.addEventListener('updatefound', () => {
        const nouveau = enregistrement.installing;
        if (!nouveau) return;
        nouveau.addEventListener('statechange', () => {
          if (nouveau.state === 'installed' && navigator.serviceWorker.controller) {
            console.info('Une nouvelle version du plateau est prête. Rechargez pour l’utiliser.');
          }
        });
      });

      // Vérifie les mises à jour au retour sur l'onglet, sans interrompre la partie.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          enregistrement.update().catch(() => {});
        }
      });
    } catch (erreur) {
      console.warn('Service worker non enregistré : le mode hors-ligne sera limité.', erreur);
    }
  });
})();
