/* Persistance locale (localStorage) : préférences, scores, séries. */
(function () {
  'use strict';

  const QC = (window.QC = window.QC || {});

  const CLES = {
    reglages: 'qui-suis-je:reglages:v1',
    stats: 'qui-suis-je:stats:v1'
  };

  // Anciennes clés de la première version : migration silencieuse pour ne pas
  // perdre les réglages et les scores déjà enregistrés.
  const ANCIENNES_CLES = {
    reglages: 'qui-est-ce:reglages:v1',
    stats: 'qui-est-ce:stats:v1'
  };

  const REGLAGES_DEFAUT = {
    version: 2,
    themeId: 'classique',
    son: true,
    timerActif: true,
    dureeTour: 60,
    manches: 3,
    eliminationAuto: false,
    methodeSecret: 'choix',
    difficulte: 'moyen',
    bluff: false,
    modeMystere: 'libre',
    budgetQuestions: 8,
    dureeChrono: 90
  };

  const STATS_DEFAUT = {
    version: 1,
    total: { parties: 0, victoires: 0, defaites: 0 },
    hotseat: { manches: 0, matchs: 0, pointsJ1: 0, pointsJ2: 0 },
    duel: {
      matchs: 0,
      manches: 0,
      victoires: 0,
      defaites: 0,
      parDifficulte: {
        facile: { matchs: 0, victoires: 0, defaites: 0 },
        moyen: { matchs: 0, victoires: 0, defaites: 0 },
        difficile: { matchs: 0, victoires: 0, defaites: 0 }
      }
    },
    mystere: {
      manches: 0,
      victoires: 0,
      defaites: 0,
      serieActuelle: 0,
      meilleureSerie: 0,
      scoreSerie: 0,
      meilleurScore: 0,
      parMode: {
        libre: { manches: 0, victoires: 0, defaites: 0 },
        questions: { manches: 0, victoires: 0, defaites: 0 },
        vies: { manches: 0, victoires: 0, defaites: 0 },
        chrono: { manches: 0, victoires: 0, defaites: 0 }
      }
    }
  };

  let memoire = {};
  let disponible = true;

  try {
    const test = '__qc_test__';
    window.localStorage.setItem(test, '1');
    window.localStorage.removeItem(test);
  } catch (erreur) {
    disponible = false;
    console.warn('localStorage indisponible : les scores ne seront pas mémorisés.', erreur);
  }

  function migrerAnciennesCles() {
    if (!disponible) return;
    for (const type of Object.keys(CLES)) {
      const ancienne = ANCIENNES_CLES[type];
      const nouvelle = CLES[type];
      if (!ancienne || !nouvelle) continue;
      try {
        if (!window.localStorage.getItem(nouvelle)) {
          const valeur = window.localStorage.getItem(ancienne);
          if (valeur) window.localStorage.setItem(nouvelle, valeur);
        }
        window.localStorage.removeItem(ancienne);
      } catch (erreur) {
        console.warn('Migration des données locales impossible.', erreur);
      }
    }
  }

  migrerAnciennesCles();

  function clone(valeur) {
    return JSON.parse(JSON.stringify(valeur));
  }

  function lire(cle) {
    if (!disponible) return memoire[cle] ? clone(memoire[cle]) : null;
    try {
      const brut = window.localStorage.getItem(cle);
      return brut ? JSON.parse(brut) : null;
    } catch (erreur) {
      console.warn(`Données locales illisibles pour ${cle}.`, erreur);
      return null;
    }
  }

  function ecrire(cle, valeur) {
    if (!disponible) {
      memoire[cle] = clone(valeur);
      return true;
    }
    try {
      window.localStorage.setItem(cle, JSON.stringify(valeur));
      return true;
    } catch (erreur) {
      console.warn('Impossible d’enregistrer les données locales (stockage plein ?).', erreur);
      return false;
    }
  }

  /** Fusion profonde tolérante : les nouvelles clés par défaut sont ajoutées. */
  function fusionProfonde(base, ajout) {
    if (Array.isArray(base)) return Array.isArray(ajout) ? clone(ajout) : clone(base);
    if (base && typeof base === 'object') {
      const resultat = clone(base);
      if (!ajout || typeof ajout !== 'object') return resultat;
      for (const [cle, valeur] of Object.entries(ajout)) {
        if (valeur === undefined) continue;
        if (cle in resultat && resultat[cle] && typeof resultat[cle] === 'object' && !Array.isArray(resultat[cle])) {
          resultat[cle] = fusionProfonde(resultat[cle], valeur);
        } else {
          resultat[cle] = valeur;
        }
      }
      return resultat;
    }
    return ajout === undefined ? base : ajout;
  }

  function nettoyerNombre(valeur, defaut, minimum, maximum) {
    const nombre = Number(valeur);
    if (!Number.isFinite(nombre)) return defaut;
    return Math.min(maximum, Math.max(minimum, Math.round(nombre)));
  }

  function normaliserReglages(brut) {
    const ancienFormat = !brut || typeof brut !== 'object' || typeof brut.version === 'undefined';
    const reglages = fusionProfonde(REGLAGES_DEFAUT, brut || {});
    // Les versions précédentes n'avaient pas de champ version et démarraient
    // sur Animaux. On bascule une seule fois vers le plateau classique.
    if (ancienFormat && reglages.themeId === 'animaux') reglages.themeId = 'classique';
    reglages.version = 2;
    reglages.themeId = typeof reglages.themeId === 'string' ? reglages.themeId : REGLAGES_DEFAUT.themeId;
    reglages.son = Boolean(reglages.son);
    reglages.timerActif = Boolean(reglages.timerActif);
    reglages.eliminationAuto = Boolean(reglages.eliminationAuto);
    reglages.bluff = Boolean(reglages.bluff);
    reglages.dureeTour = nettoyerNombre(reglages.dureeTour, 60, 15, 180);
    reglages.manches = [1, 3, 5].includes(Number(reglages.manches)) ? Number(reglages.manches) : 3;
    reglages.budgetQuestions = [10, 8, 6].includes(Number(reglages.budgetQuestions))
      ? Number(reglages.budgetQuestions)
      : 8;
    reglages.dureeChrono = [60, 90, 120].includes(Number(reglages.dureeChrono))
      ? Number(reglages.dureeChrono)
      : 90;
    if (!['facile', 'moyen', 'difficile'].includes(reglages.difficulte)) reglages.difficulte = 'moyen';
    if (!['libre', 'questions', 'vies', 'chrono'].includes(reglages.modeMystere)) reglages.modeMystere = 'libre';
    if (!['choix', 'hasard', 'code'].includes(reglages.methodeSecret)) reglages.methodeSecret = 'choix';
    return reglages;
  }

  function normaliserStats(brut) {
    const stats = fusionProfonde(STATS_DEFAUT, brut || {});
    stats.version = 1;
    if (stats.duel && stats.duel.parDifficulte) {
      for (const difficulte of ['facile', 'moyen', 'difficile']) {
        stats.duel.parDifficulte[difficulte] = fusionProfonde(
          STATS_DEFAUT.duel.parDifficulte[difficulte],
          stats.duel.parDifficulte[difficulte] || {}
        );
      }
    }
    if (stats.mystere && stats.mystere.parMode) {
      for (const mode of ['libre', 'questions', 'vies', 'chrono']) {
        stats.mystere.parMode[mode] = fusionProfonde(
          STATS_DEFAUT.mystere.parMode[mode],
          stats.mystere.parMode[mode] || {}
        );
      }
    }
    return stats;
  }

  const Storage = (QC.Storage = {
    CLES,
    REGLAGES_DEFAUT,
    STATS_DEFAUT,

    chargerReglages() {
      return normaliserReglages(lire(CLES.reglages));
    },

    sauverReglages(reglages) {
      return ecrire(CLES.reglages, normaliserReglages(reglages));
    },

    chargerStats() {
      return normaliserStats(lire(CLES.stats));
    },

    sauverStats(stats) {
      return ecrire(CLES.stats, normaliserStats(stats));
    },

    mettreAJourStats(mutateur) {
      const stats = this.chargerStats();
      if (typeof mutateur === 'function') mutateur(stats);
      this.sauverStats(stats);
      return stats;
    },

    reinitialiserStats() {
      this.sauverStats(clone(STATS_DEFAUT));
      return clone(STATS_DEFAUT);
    },

    disponible() {
      return disponible;
    },

    fusionProfonde
  });
})();
