/* ============================================================================
   QUI SUIS-JE ? — contrôleur d'interface et navigation
   Trois modes : hot-seat, duel contre l'IA, mystère solo.
   ========================================================================== */
(function () {
  'use strict';

  const QC = (window.QC = window.QC || {});
  const U = QC.U;
  const Storage = QC.Storage;
  const Themes = QC.Themes;
  const Engine = QC.Engine;

  const appEl = document.getElementById('app');
  const modaleEl = document.getElementById('calque-modale');
  const toastsEl = document.getElementById('zone-toasts');
  const confettisEl = document.getElementById('zone-confettis');

  const ICONES = {
    aide: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 0 1 5.1.7c0 1.8-2.6 2.1-2.6 3.8"/><path d="M12 17.4h.01"/>',
    appareil: '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8M12 18v3"/>',
    arrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    check: '<path d="m5 12.5 4.2 4.2L19 6.8"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    cpu: '<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 0 1 5.1.7c0 1.8-2.6 2.1-2.6 3.8M12 17.4h.01"/>',
    home: '<path d="m4 11 8-7 8 7"/><path d="M6 10v9h12v-9M10 19v-5h4v5"/>',
    install: '<path d="M12 3v11M8 10l4 4 4-4"/><path d="M5 17v3h14v-3"/>',
    journal: '<path d="M5 4.5h11a3 3 0 0 1 3 3V21H8a3 3 0 0 1-3-3V4.5Z"/><path d="M5 17.5A2.5 2.5 0 0 1 7.5 15H19M9 8h6"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 0 1 5.1.7c0 1.8-2.6 2.1-2.6 3.8M12 17.4h.01"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.9-3M4 5v4h4M4 13a8 8 0 0 0 14.9 3M20 19v-4h-4"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 4.5 4.5"/>',
    spark: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 16 .7 2.1L22 19l-2.3.9L19 22l-.7-2.1L16 19l2.3-.9L19 16Z"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 5H4v2a4 4 0 0 0 4 4M16 5h4v2a4 4 0 0 1-4 4M12 13v4M8.5 21h7M10 17h4"/>',
    users: '<path d="M16 20v-1.7a4.3 4.3 0 0 0-4.3-4.3H6.3A4.3 4.3 0 0 0 2 18.3V20"/><circle cx="9" cy="7" r="3.4"/><path d="M22 20v-1.7a4.3 4.3 0 0 0-3.2-4.2M16.4 3.8a3.4 3.4 0 0 1 0 6.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    cartes: '<rect x="4" y="5" width="11" height="15" rx="2"/><path d="M8 2.5h9A3 3 0 0 1 20 5.5v11"/><path d="M7.8 10h3.4M7.8 13h2.5"/>',
    flamme: '<path d="M12 22c4 0 7-2.7 7-6.5 0-4.5-4.2-6.3-4.2-10.5-2 .8-3.2 2.5-3.2 4.2-1-.6-1.6-1.7-1.9-3C7.4 8 5 10.8 5 15.2 5 19.2 8 22 12 22Z"/>',
    coeur: '<path d="M20.4 5.6a5 5 0 0 0-7.1 0L12 6.9l-1.3-1.3a5 5 0 0 0-7.1 7.1L12 21l8.4-8.3a5 5 0 0 0 0-7.1Z"/>',
    sablier: '<path d="M6 3h12M6 21h12M7 3c0 4 2.5 5.2 5 7.2C9.5 12.2 7 13.7 7 18M17 3c0 4-2.5 5.2-5 7.2 2.5 2 5 3.5 5 7.8"/>'
  };

  function icone(nom, classe) {
    const chemin = ICONES[nom] || ICONES.question;
    return `<svg class="icone-svg ${classe || ''}" viewBox="0 0 24 24" aria-hidden="true">${chemin}</svg>`;
  }

  const MODES = {
    hotseat: {
      nom: 'Deux joueurs',
      titre: 'Le duel à deux',
      icone: 'users',
      description:
        'Choisissez chacun un secret sur le même PC, puis interrogez-vous à tour de rôle. Le plateau reste le même, les secrets restent secrets.',
      tags: ['Anti-spoil', 'Plateau partagé', 'Tour par tour'],
      couleur: 'var(--accent)'
    },
    duel: {
      nom: 'Contre le PC',
      titre: 'Face au PC',
      icone: 'cpu',
      description:
        'Le PC choisit un personnage et répond à vos questions. Pendant ce temps, il traque votre secret à la manière d’une recherche dichotomique.',
      tags: ['Dichotomie', '3 niveaux', 'Bluff'],
      couleur: 'var(--accent-2)'
    },
    mystere: {
      nom: 'Mystère solo',
      titre: 'L’enquête solo',
      icone: 'search',
      description:
        'Un seul secret, une seule enquête. Posez les questions, éliminez les portraits et découvrez qui se cache derrière le plateau.',
      tags: ['4 sous-modes', 'Série', 'Records'],
      couleur: '#b895ff'
    }
  };

  const SOUS_MODES = {
    libre: {
      nom: 'Libre',
      icone: '♾️',
      description: 'Questions illimitées, aucune pression. Prenez le temps d’observer.'
    },
    questions: {
      nom: 'Compteur',
      icone: '🔢',
      description: 'Un nombre de questions limité avant de devoir annoncer le personnage.'
    },
    vies: {
      nom: 'Trois vies',
      icone: '❤️',
      description: 'Trois annonces possibles. Chaque erreur coûte une vie.'
    },
    chrono: {
      nom: 'Chrono',
      icone: '⏱️',
      description: 'Le plateau complet, un temps limité. Chaque seconde compte.'
    }
  };

  const DIFFICULTES = {
    facile: { nom: 'Facile', description: 'Le PC pose des questions au hasard.' },
    moyen: { nom: 'Moyen', description: 'Une question au hasard, une question dichotomique.' },
    difficile: { nom: 'Difficile', description: 'Dichotomie pure : chaque question coupe les candidats en deux.' }
  };

  const state = {
    ecran: 'chargement',
    theme: null,
    reglages: Storage.chargerReglages(),
    stats: Storage.chargerStats(),
    config: null,
    partie: null,
    ui: {
      modale: null,
      secret: null,
      devineChoix: null,
      eliminationRapide: false,
      suggestionsCache: null,
      animationsElimination: new Set(),
      pcReflexion: false,
      focusPrecedent: null,
      confettiFaits: new Set(),
      plateauxAnimes: new Set(),
      installPrompt: null
    },
    timer: {
      actif: false,
      enPause: false,
      type: null,
      deadline: 0,
      total: 0,
      restant: 0,
      interval: null,
      expirationEnCours: false
    }
  };

  QC.App = { state, rendre };

  // ───────────────────────────────────────────────────────────────────────────
  // Helpers d'affichage
  // ───────────────────────────────────────────────────────────────────────────

  function modele() {
    return state.theme;
  }

  function personnage(id) {
    return state.theme ? state.theme.personnageParId.get(id) : null;
  }

  function htmlEchappe(valeur) {
    return U.echapper(valeur);
  }

  function htmlAttribut(valeur) {
    return U.attributHtml(valeur);
  }

  function codeDe(id, colonnes) {
    if (!state.theme) return '';
    const index = state.theme.indexParId.get(id);
    return index === undefined ? '' : U.codePosition(index, colonnes || 6);
  }

  function stylePersonnage(pers, avecDelai, index) {
    if (!pers) return '';
    const couleur = state.theme.couleurPersonnage(pers);
    const delai = avecDelai ? `--delai:${Math.min((index || 0) * 16, 300)}ms;` : '';
    return `--teinte:${couleur.teinte};--teinte-fond:${couleur.fond};--teinte-lueur:${couleur.lueur};${delai}`;
  }

  function cheminPortrait(pers) {
    if (!pers || !state.theme) return '';
    return `assets/portraits/${state.theme.id}/${pers.id}.jpg`;
  }

  /**
   * Illustration locale du personnage, avec l'emoji conservé en secours si
   * l'asset venait à manquer. Le portrait est décoratif : le nom est toujours
   * présent dans le libellé du contrôle parent.
   */
  function htmlPortrait(pers, options) {
    const opts = options || {};
    if (!pers) return '';
    const source = cheminPortrait(pers);
    return `
      <span class="portrait-art${opts.classe ? ` ${opts.classe}` : ''}" aria-hidden="true">
        <span class="portrait-art__fallback">${pers.emoji}</span>
        <img
          class="portrait-art__image"
          src="${htmlAttribut(source)}"
          alt=""
          loading="${opts.eager ? 'eager' : 'lazy'}"
          decoding="async"
          draggable="false"
          onerror="this.hidden=true"
        >
      </span>
    `;
  }

  function libelleMode(mode) {
    return MODES[mode] ? MODES[mode].nom : 'Jeu';
  }

  function libelleSousMode(sousMode) {
    return SOUS_MODES[sousMode] ? SOUS_MODES[sousMode].nom : sousMode;
  }

  function objectifManches(nombre) {
    const n = Number(nombre) || 1;
    return n === 1 ? 'manche sèche' : `premier à ${n}`;
  }

  function ageDe(partie) {
    return Math.round((Date.now() - (partie.debut || Date.now())) / 1000);
  }

  function pluriel(nombre, singulier, plurielMot) {
    return U.pluriel(nombre, singulier, plurielMot);
  }

  function appliquerPalette() {
    if (!state.theme || !state.theme.palette) return;
    const palette = state.theme.palette;
    const racine = document.documentElement;
    racine.style.setProperty('--accent', palette.accent || '#f7b955');
    racine.style.setProperty('--accent-2', palette.accent2 || '#54d6a1');
    racine.style.setProperty('--lueur', palette.lueur || palette.accent || '#f7b955');
    racine.style.setProperty('--fond-theme', palette.fond || '#0a1915');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', palette.fond || '#0b1118');
    document.title = `Qui suis-je ? — ${state.theme.nom}`;
  }

  function enTeteSimple(options) {
    const opts = options || {};
    return `
      <header class="bandeau">
        <button class="marque" data-action="${opts.actionMarque || 'accueil'}" aria-label="Retour à l’accueil">
          <span class="marque__cube">?</span>
          <span class="marque__texte">
            <strong>Qui suis-je&nbsp;?</strong>
            <small>le duel des portraits</small>
          </span>
        </button>
        <div class="bandeau__actions">
          ${state.theme ? `<span class="pastille-theme"><span class="pastille-theme__emoji">${state.theme.emoji}</span>${htmlEchappe(state.theme.nom)}</span>` : ''}
          ${opts.afficherInstaller === false ? '' : `<button class="btn btn--secondaire btn--petit" data-action="installer" aria-label="Installer l’application">${icone('install')}<span class="btn--texte-large">Installer</span></button>`}
          <button class="btn btn--fantome btn--petit" data-action="ouvrir-aide" aria-label="Aide et règles">${icone('help')}</button>
        </div>
      </header>
    `;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Toasts
  // ───────────────────────────────────────────────────────────────────────────

  function toast(message, type, duree) {
    const styles = {
      info: { icone: 'spark', classe: '' },
      succes: { icone: 'check', classe: 'toast--succes' },
      erreur: { icone: 'x', classe: 'toast--erreur' }
    };
    const style = styles[type] || styles.info;
    const element = document.createElement('div');
    element.className = `toast ${style.classe}`;
    element.innerHTML = `<span class="toast__icone">${icone(style.icone)}</span><span>${htmlEchappe(message)}</span>`;
    toastsEl.appendChild(element);

    while (toastsEl.children.length > 3) {
      toastsEl.firstElementChild.remove();
    }

    requestAnimationFrame(() => element.classList.add('est-visible'));
    window.setTimeout(() => {
      element.classList.remove('est-visible');
      window.setTimeout(() => element.remove(), 280);
    }, duree || 3300);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Confettis et sceau de réponse
  // ───────────────────────────────────────────────────────────────────────────

  function lancerConfettis() {
    if (!confettisEl || U.prefereReduction()) return;
    confettisEl.innerHTML = '';
    const couleurs = [
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#f7b955',
      getComputedStyle(document.documentElement).getPropertyValue('--accent-2').trim() || '#54d6a1',
      '#ffffff',
      '#ffb3c7'
    ];
    for (let i = 0; i < 64; i += 1) {
      const piece = document.createElement('span');
      piece.className = 'confetti';
      piece.style.left = `${U.entier(2, 98)}%`;
      piece.style.background = couleurs[i % couleurs.length];
      piece.style.animationDelay = `${(Math.random() * 0.6).toFixed(2)}s`;
      piece.style.animationDuration = `${(2.3 + Math.random() * 1.4).toFixed(2)}s`;
      piece.style.width = `${U.entier(5, 10)}px`;
      piece.style.height = `${U.entier(9, 18)}px`;
      piece.style.setProperty('--derive', `${U.entier(-140, 140)}px`);
      piece.style.setProperty('--rotation', `${U.entier(360, 1080)}deg`);
      confettisEl.appendChild(piece);
    }
    window.setTimeout(() => {
      if (confettisEl) confettisEl.innerHTML = '';
    }, 4400);
  }

  function afficherSceau(reponse) {
    const sceau = document.getElementById('sceau-reponse');
    if (!sceau) return;
    sceau.textContent = reponse ? 'OUI' : 'NON';
    sceau.classList.toggle('sceau-reponse--non', !reponse);
    sceau.classList.remove('est-visible');
    void sceau.offsetWidth;
    sceau.classList.add('est-visible');
    window.setTimeout(() => sceau.classList.remove('est-visible'), 1350);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Chronomètres
  // ───────────────────────────────────────────────────────────────────────────

  function arreterTimer() {
    if (state.timer.interval) {
      window.clearInterval(state.timer.interval);
    }
    state.timer.interval = null;
    state.timer.actif = false;
    state.timer.enPause = false;
    state.timer.type = null;
    state.timer.expirationEnCours = false;
  }

  function afficherTimer() {
    const boite = document.getElementById('timer-jeu');
    const valeur = document.getElementById('timer-valeur');
    const barre = document.getElementById('timer-barre-interne');
    if (!boite || !valeur) return;

    const secondes = Math.max(0, state.timer.restant / 1000);
    valeur.textContent = U.formaterTemps(secondes);
    if (barre) {
      const ratio = state.timer.total > 0 ? Math.max(0, Math.min(1, state.timer.restant / state.timer.total)) : 0;
      barre.style.transform = `scaleX(${ratio})`;
    }
    boite.classList.toggle('est-urgent', state.timer.actif && !state.timer.enPause && secondes <= 10);
    boite.setAttribute('aria-label', `Temps restant : ${U.formaterTemps(secondes)}`);
  }

  function boucleTimer() {
    if (!state.timer.actif || state.timer.enPause) return;
    state.timer.restant = Math.max(0, state.timer.deadline - Date.now());
    afficherTimer();
    if (state.timer.restant <= 0 && !state.timer.expirationEnCours) {
      state.timer.expirationEnCours = true;
      const type = state.timer.type;
      arreterTimer();
      if (type === 'chrono') {
        expirerChronoMystere();
      } else {
        expirerTour();
      }
    }
  }

  function demarrerTimer(type, dureeSecondes) {
    arreterTimer();
    if (!Number.isFinite(dureeSecondes) || dureeSecondes <= 0) return;
    state.timer.actif = true;
    state.timer.enPause = false;
    state.timer.type = type;
    state.timer.total = dureeSecondes * 1000;
    state.timer.restant = state.timer.total;
    state.timer.deadline = Date.now() + state.timer.total;
    state.timer.interval = window.setInterval(boucleTimer, 200);
    afficherTimer();
  }

  function demarrerTourSiPossible() {
    const partie = state.partie;
    if (!partie) return;
    if (partie.mode === 'mystere') {
      if (partie.config.sousMode === 'chrono' && partie.phase === 'game') {
        const restant = Math.max(0, (partie.limiteChrono - Date.now()) / 1000);
        if (restant > 0) demarrerTimer('chrono', restant);
      }
      return;
    }
    if (partie.phase !== 'game') return;
    if (!partie.config.timerActif) return;
    const duree = Number(partie.config.dureeTour) || 60;
    demarrerTimer('tour', duree);
  }

  function pauseTimer() {
    if (!state.timer.actif || state.timer.enPause || state.timer.type !== 'tour') return;
    state.timer.restant = Math.max(0, state.timer.deadline - Date.now());
    state.timer.enPause = true;
    if (state.timer.interval) {
      window.clearInterval(state.timer.interval);
      state.timer.interval = null;
    }
    afficherTimer();
  }

  function reprendreTimer() {
    if (!state.timer.actif || !state.timer.enPause) return;
    if (state.ui.modale) return;
    if (!state.partie || state.partie.phase !== 'game') return;
    state.timer.enPause = false;
    state.timer.deadline = Date.now() + Math.max(0, state.timer.restant);
    state.timer.interval = window.setInterval(boucleTimer, 200);
    afficherTimer();
  }

  function expirerTour() {
    const partie = state.partie;
    if (!partie) return;
    if (partie.mode === 'hotseat' && partie.phase === 'game') {
      Engine.finTourHotseat(partie, 'temps');
      toast('Temps écoulé : au joueur suivant.', 'info');
      synchroniserPartie({ deplacerHaut: true });
      return;
    }
    if (partie.mode === 'duel' && partie.phase === 'game') {
      const resultat = Engine.timeoutDuel(partie, state.theme);
      toast('Temps écoulé : le PC prend la main.', 'info');
      state.ui.pcReflexion = true;
      rendre();
      preparerTourPC(resultat);
    }
  }

  function expirerChronoMystere() {
    const partie = state.partie;
    if (!partie || partie.mode !== 'mystere' || partie.phase !== 'game') return;
    Engine.expirerChronoMystere(partie, state.theme);
    toast('Le temps est écoulé.', 'erreur');
    allerResultat();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Statistiques et enregistrement des résultats
  // ───────────────────────────────────────────────────────────────────────────

  function enregistrerResultats() {
    const partie = state.partie;
    if (!partie || !partie.resultat || partie._statsManche) return;

    const stats = Storage.chargerStats();

    if (partie.mode === 'hotseat') {
      const resultat = partie.resultat;
      stats.hotseat.manches += 1;
      if (resultat.gagnantIndex === 0) stats.hotseat.pointsJ1 += 1;
      else stats.hotseat.pointsJ2 += 1;
      if (resultat.matchTermine) {
        stats.hotseat.matchs += 1;
        stats.total.parties += 1;
      }
    }

    if (partie.mode === 'duel') {
      const resultat = partie.resultat;
      stats.duel.manches += 1;
      if (resultat.matchTermine) {
        stats.duel.matchs += 1;
        const difficulte = partie.config.difficulte || 'moyen';
        const bloc = stats.duel.parDifficulte[difficulte] || { matchs: 0, victoires: 0, defaites: 0 };
        bloc.matchs += 1;
        if (resultat.gagnant === 'joueur') {
          stats.duel.victoires += 1;
          stats.total.victoires += 1;
          bloc.victoires += 1;
        } else {
          stats.duel.defaites += 1;
          stats.total.defaites += 1;
          bloc.defaites += 1;
        }
        stats.duel.parDifficulte[difficulte] = bloc;
        stats.total.parties += 1;
      }
    }

    if (partie.mode === 'mystere') {
      const resultat = partie.resultat;
      const sousMode = resultat.sousMode || partie.config.sousMode;
      const bloc = stats.mystere.parMode[sousMode] || { manches: 0, victoires: 0, defaites: 0 };
      stats.mystere.manches += 1;
      stats.total.parties += 1;
      bloc.manches += 1;

      if (resultat.gagne) {
        stats.mystere.victoires += 1;
        stats.total.victoires += 1;
        bloc.victoires += 1;
        stats.mystere.serieActuelle += 1;
        stats.mystere.scoreSerie += resultat.score;
        stats.mystere.meilleureSerie = Math.max(stats.mystere.meilleureSerie, stats.mystere.serieActuelle);
        stats.mystere.meilleurScore = Math.max(stats.mystere.meilleurScore, stats.mystere.scoreSerie);
      } else {
        stats.mystere.defaites += 1;
        stats.total.defaites += 1;
        bloc.defaites += 1;
        stats.mystere.meilleureSerie = Math.max(stats.mystere.meilleureSerie, stats.mystere.serieActuelle);
        stats.mystere.meilleurScore = Math.max(stats.mystere.meilleurScore, stats.mystere.scoreSerie);
        stats.mystere.serieActuelle = 0;
        stats.mystere.scoreSerie = 0;
      }
      stats.mystere.parMode[sousMode] = bloc;
    }

    Storage.sauverStats(stats);
    state.stats = stats;
    partie._statsManche = true;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Navigation et rendu général
  // ───────────────────────────────────────────────────────────────────────────

  function rendre(options) {
    const opts = options || {};
    appliquerPalette();
    let html = '';
    switch (state.ecran) {
      case 'accueil':
        html = vueAccueil();
        break;
      case 'configuration':
        html = vueConfiguration();
        break;
      case 'secrets':
        html = vueSecrets();
        break;
      case 'passage':
        html = vuePassage();
        break;
      case 'jeu':
        html = vueJeu();
        break;
      case 'resultat':
        html = vueResultat();
        break;
      default:
        html = vueAccueil();
    }
    appEl.innerHTML = html;
    document.body.dataset.ecran = state.ecran;
    rendreModale();
    syncConfigurationUI();
    afficherTimer();
    if (state.ecran === 'resultat') {
      window.setTimeout(gererConfettisResultat, 80);
    }
    if (opts.deplacerHaut) {
      const remonter = () => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      };
      remonter();
      window.requestAnimationFrame(() => {
        remonter();
        window.requestAnimationFrame(remonter);
      });
      window.setTimeout(remonter, 80);
    }
    if (opts.defilerConfig && document.getElementById('form-config')) {
      document.getElementById('form-config').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function synchroniserPartie(options) {
    const opts = options || {};
    const partie = state.partie;
    if (!partie) {
      state.ecran = 'accueil';
      arreterTimer();
      rendre(opts);
      return;
    }

    if (partie.phase === 'result') {
      arreterTimer();
      enregistrerResultats();
      state.ecran = 'resultat';
      fermerModale({ silencieux: true, sansReprise: true });
    } else if (partie.phase === 'passage') {
      arreterTimer();
      state.ecran = 'passage';
    } else if (partie.phase === 'secrets' || partie.phase === 'secret') {
      arreterTimer();
      state.ecran = 'secrets';
    } else {
      state.ecran = 'jeu';
    }

    rendre(opts);
  }

  function allerResultat() {
    arreterTimer();
    enregistrerResultats();
    state.ecran = 'resultat';
    fermerModale({ silencieux: true, sansReprise: true });
    rendre({ deplacerHaut: true });
  }

  function creerSuggestion(partie) {
    const cleCache = `${partie.id}|${partie.mode}|${partie.round}|${partie.tourNumero}|${partie.questionCount}|${partie.active == null ? '' : partie.active}`;
    if (state.ui.suggestionsCache && state.ui.suggestionsCache.cle === cleCache) {
      return state.ui.suggestionsCache.valeurs;
    }
    const pool = U.melanger(state.theme.criteres);
    const choix = [];
    const categories = new Set();
    for (const critere of pool) {
      if (choix.length >= 4) break;
      if (categories.has(critere.categorie)) continue;
      choix.push(critere);
      categories.add(critere.categorie);
    }
    for (const critere of pool) {
      if (choix.length >= 4) break;
      if (!choix.includes(critere)) choix.push(critere);
    }
    state.ui.suggestionsCache = { cle: cleCache, valeurs: choix };
    return choix;
  }

  function reinitialiserSuggestions() {
    state.ui.suggestionsCache = null;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Écran d'accueil
  // ───────────────────────────────────────────────────────────────────────────

  function vueAccueil() {
    const theme = state.theme;
    const persos = theme.personnages;
    const indexCentre = 5 % persos.length;
    const indexGauche = 12 % persos.length;
    const indexDroite = 2 % persos.length;
    const cartesScene = [
      { pers: persos[indexGauche], classe: 'gauche' },
      { pers: persos[indexCentre], classe: 'centre' },
      { pers: persos[indexDroite], classe: 'droite' }
    ];
    const stats = state.stats;
    const totalPortraits = Themes.modeles.reduce((total, modeleTheme) => total + modeleTheme.personnages.length, 0);

    const htmlCartes = cartesScene
      .map(({ pers, classe }) => {
        const indices = theme.indexParId.get(pers.id);
        return `
          <article class="carte-hero carte-hero--${classe}" style="${stylePersonnage(pers)}">
            <div class="carte-hero__haut">
              <span>Portrait secret</span>
              <span class="carte-hero__code">${U.codePosition(indices, 6)}</span>
            </div>
            <div class="carte-hero__medaillon">
              <span class="carte-hero__emoji">${htmlPortrait(pers, { eager: true })}</span>
            </div>
            <div class="carte-hero__nom">${htmlEchappe(pers.nom)}</div>
            <div class="carte-hero__sous-titre">${htmlEchappe(theme.nom)}</div>
          </article>
        `;
      })
      .join('');

    const themes = Themes.modeles
      .map((modeleTheme) => {
        const active = modeleTheme.id === theme.id;
        const apercu = modeleTheme.personnages
          .slice(0, 3)
          .map((pers) => `<span aria-hidden="true">${pers.emoji}</span>`)
          .join('');
        return `
          <button
            class="theme-carte${active ? ' est-active' : ''}"
            style="--theme-accent:${modeleTheme.palette.accent}"
            data-action="choisir-theme"
            data-theme="${modeleTheme.id}"
            aria-pressed="${active}"
          >
            <span class="theme-carte__entete">
              <span class="theme-carte__emoji">${modeleTheme.emoji}</span>
              <span class="theme-carte__coche" aria-hidden="true">✓</span>
            </span>
            <h3>${htmlEchappe(modeleTheme.nom)}</h3>
            <span class="theme-carte__sous-titre">${htmlEchappe(modeleTheme.sousTitre || '')}</span>
            <span class="theme-carte__apercu">${apercu}</span>
            <span class="theme-carte__compte">${modeleTheme.personnages.length} portraits</span>
          </button>
        `;
      })
      .join('');

    const cartesModes = Object.entries(MODES)
      .map(([id, mode], index) => {
        const numero = String(index + 1).padStart(2, '0');
        return `
          <button class="mode-carte mode-carte--${id}" style="--mode-couleur:${mode.couleur}" data-action="ouvrir-config" data-mode="${id}">
            <span class="mode-carte__numero">
              <span>Mode ${numero}</span>
              <span>${icone(mode.icone)}</span>
            </span>
            <h3>${htmlEchappe(mode.titre)}</h3>
            <p>${htmlEchappe(mode.description)}</p>
            <span class="mode-carte__tags">
              ${mode.tags.map((tag) => `<span>${htmlEchappe(tag)}</span>`).join('')}
            </span>
          </button>
        `;
      })
      .join('');

    const estInstallee = U.estStandalone();

    return `
      <div class="ecran-accueil">
        <header class="bandeau">
          <div class="marque">
            <span class="marque__cube">?</span>
            <span class="marque__texte">
              <strong>Qui suis-je&nbsp;?</strong>
              <small>le duel des portraits</small>
            </span>
          </div>
          <div class="bandeau__actions">
            <button class="btn btn--secondaire btn--petit" data-action="ouvrir-stats" aria-label="Mes scores">
              ${icone('trophy')}<span class="btn--texte-large">Mes scores</span>
            </button>
            <button class="btn btn--secondaire btn--petit" data-action="installer" aria-label="Installer l’application">
              ${icone('install')}<span class="btn--texte-large">${estInstallee ? 'Installée' : 'Installer'}</span>
            </button>
            <button class="btn btn--fantome btn--petit" data-action="ouvrir-aide" aria-label="Aide et règles">${icone('help')}</button>
          </div>
        </header>

        <main class="page" id="contenu" tabindex="-1">
          <section class="hero">
            <div class="hero__texte">
              <div class="hero__badge">
                <span>✦</span>
                <span>3 modes · ${Themes.modeles.length} univers · ${totalPortraits} portraits</span>
              </div>
              <h1>
                <span class="ligne">Qui suis-</span>
                <span class="ligne ligne--accent">je&nbsp;?</span>
                <span class="ligne ligne--fine">Le duel des portraits</span>
              </h1>
              <p class="hero__description">
                Un plateau de <strong>${state.theme.personnages.length} personnages</strong>, des questions qui se répondent par oui ou non,
                et un secret à démasquer. Jouez à deux sur le même écran ou défiez une IA qui cherche vraiment.
              </p>
              <div class="hero__actions">
                <button class="btn btn--primaire btn--large" data-action="ouvrir-config" data-mode="duel">
                  ${icone('cpu')}<span>Défier le PC</span>${icone('arrowRight')}
                </button>
                <button class="btn btn--secondaire btn--large" data-action="defiler-modes">
                  Les trois modes
                </button>
              </div>
              <ul class="hero__promesses">
                <li>100 % local</li>
                <li>Sans inscription</li>
                <li>Installable comme appli</li>
              </ul>
            </div>

            <div class="scene" aria-label="Aperçu du plateau">
              <div class="scene__halo" aria-hidden="true"></div>
              <div class="scene__socle" aria-hidden="true"></div>
              <div class="scene__etiquette">2.5D · ${htmlEchappe(theme.nom)}</div>
              ${htmlCartes}
              <div class="scene__medaillon-question" aria-hidden="true">?</div>
              <p class="scene__note">« Un détail suffit à faire basculer toute une déduction. »</p>
            </div>
          </section>

          <section id="section-modes">
            <div class="entete-section">
              <div>
                <p class="surtitre">Trois enquêtes</p>
                <h2>Choisis ta façon de jouer</h2>
              </div>
              <p>Le même plateau, trois tensions différentes. Les secrets changent, la logique reste.</p>
            </div>
            <div class="grille-modes">${cartesModes}</div>
          </section>

          <section id="section-themes">
            <div class="entete-section">
              <div>
                <p class="surtitre">${Themes.modeles.length} univers</p>
                <h2>Un thème, un nouveau plateau</h2>
              </div>
              <p>Chaque univers possède ses personnages, ses attributs et sa propre lumière. Le thème choisi est mémorisé.</p>
            </div>
            <div class="grille-themes">${themes}</div>
          </section>

          <section class="bande-stats" aria-label="Vos statistiques">
            <div class="bande-stats__intro">
              <strong>Votre carnet d’enquête</strong>
              <p>Scores et séries conservés sur cet appareil, sans compte.</p>
            </div>
            <div class="bande-stats__case">
              <span class="bande-stats__valeur">${stats.total.parties}</span>
              <span>parties terminées</span>
            </div>
            <div class="bande-stats__case">
              <span class="bande-stats__valeur">${stats.mystere.meilleureSerie}</span>
              <span>meilleure série solo</span>
            </div>
            <div class="bande-stats__case">
              <span class="bande-stats__valeur">${stats.duel.victoires}</span>
              <span>duels gagnés contre le PC</span>
            </div>
          </section>

          <section class="bloc-installation">
            <div class="bloc-installation__texte">
              <p class="surtitre">Application web</p>
              <h2>${estInstallee ? 'Le plateau est déjà installé.' : 'Emportez le plateau partout.'}</h2>
              <p>
                ${estInstallee
                  ? 'L’application fonctionne désormais comme une app native : plein écran, hors-ligne et sans navigateur visible.'
                  : 'Installez Qui suis-je ? sur votre écran d’accueil. Une fois lancé, le jeu continue de fonctionner hors connexion.'}
              </p>
            </div>
            <div class="bloc-installation__actions">
              <button class="btn btn--primaire" data-action="installer">${icone('install')} ${estInstallee ? 'Vérifier le mode hors-ligne' : 'Installer l’application'}</button>
              <button class="btn btn--fantome btn--petit" data-action="ouvrir-installation">Comment faire ?</button>
            </div>
          </section>
        </main>

        <footer class="footer">
          <p>Qui suis-je ? — jeu de déduction local · v1.3.1 · 2.5D</p>
          <div class="footer__liens">
            <button data-action="ouvrir-aide">Règles</button>
            <button data-action="ouvrir-stats">Scores</button>
            <button data-action="ouvrir-installation">Installation</button>
          </div>
        </footer>
      </div>
    `;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Configuration
  // ───────────────────────────────────────────────────────────────────────────

  function preparerConfiguration(mode) {
    state.modeActif = mode;
    const r = state.reglages;
    state.config = {
      nomJ1: '',
      nomJ2: '',
      nomJoueur: '',
      manches: r.manches,
      timerActif: r.timerActif,
      dureeTour: r.dureeTour,
      eliminationAuto: r.eliminationAuto,
      methodeSecret: r.methodeSecret,
      difficulte: r.difficulte,
      bluff: r.bluff,
      modeMystere: r.modeMystere,
      budgetQuestions: r.budgetQuestions,
      dureeChrono: r.dureeChrono
    };
    state.ecran = 'configuration';
    rendre({ deplacerHaut: true });
  }

  function htmlSegment(nom, valeurs, valeurActuelle, classes) {
    return `
      <div class="segment ${classes || ''}">
        ${valeurs
          .map((valeur, index) => {
            const id = `${nom}-${index}`;
            const actif = String(valeur.valeur) === String(valeurActuelle);
            return `
              <input type="radio" id="${id}" name="${nom}" value="${htmlAttribut(valeur.valeur)}" ${actif ? 'checked' : ''}>
              <label for="${id}">${htmlEchappe(valeur.label)}</label>
            `;
          })
          .join('')}
      </div>
    `;
  }

  function htmlBascule(nom, titre, aide, actif) {
    return `
      <div class="ligne-bascule">
        <span class="ligne-bascule__texte">
          <strong>${htmlEchappe(titre)}</strong>
          <small>${htmlEchappe(aide)}</small>
        </span>
        <label class="bascule" aria-label="${htmlAttribut(titre)}">
          <input type="checkbox" name="${nom}" ${actif ? 'checked' : ''}>
          <span></span>
        </label>
      </div>
    `;
  }

  function htmlChoixCartes(nom, entrees, valeurActuelle, classes) {
    return `
      <div class="choix-cartes ${classes || ''}">
        ${entrees
          .map((entree) => {
            const actif = String(entree.valeur) === String(valeurActuelle);
            return `
              <label class="choix-carte">
                <input type="radio" name="${nom}" value="${htmlAttribut(entree.valeur)}" ${actif ? 'checked' : ''}>
                <span class="choix-carte__check" aria-hidden="true">✓</span>
                <span class="choix-carte__titre"><span>${entree.icone || '◆'}</span>${htmlEchappe(entree.titre)}</span>
                <small>${htmlEchappe(entree.description)}</small>
              </label>
            `;
          })
          .join('')}
      </div>
    `;
  }

  function htmlChampsJoueurs(config) {
    return `
      <div class="groupe-champ">
        <span class="groupe-champ__label">Les deux détectives <span class="groupe-champ__aide">Les prénoms restent sur cet appareil.</span></span>
        <div class="deux-champs">
          <input class="champ-texte" type="text" name="nomJ1" maxlength="24" value="${htmlAttribut(config.nomJ1)}" placeholder="Joueur 1" aria-label="Prénom du joueur 1">
          <input class="champ-texte" type="text" name="nomJ2" maxlength="24" value="${htmlAttribut(config.nomJ2)}" placeholder="Joueur 2" aria-label="Prénom du joueur 2">
        </div>
      </div>
    `;
  }

  function htmlChampsChronometre(config) {
    return `
      <div class="groupe-champ">
        ${htmlBascule('timerActif', 'Chronomètre par tour', 'Un compte à rebours de 60 secondes par défaut. Le tour passe automatiquement à zéro.', config.timerActif)}
        <div data-conditionnel="timer">
          ${htmlSegment(
            'dureeTour',
            [
              { valeur: 30, label: '30 s' },
              { valeur: 60, label: '60 s' },
              { valeur: 90, label: '90 s' }
            ],
            config.dureeTour
          )}
        </div>
      </div>
    `;
  }

  function htmlChampsManches(config) {
    return `
      <div class="groupe-champ">
        <span class="groupe-champ__label">Format du duel <span class="groupe-champ__aide">Objectif de victoires.</span></span>
        ${htmlSegment(
          'manches',
          [
            { valeur: 1, label: 'Manche sèche' },
            { valeur: 3, label: 'Premier à 3' },
            { valeur: 5, label: 'Premier à 5' }
          ],
          config.manches
        )}
      </div>
    `;
  }

  function htmlChampsElimination(config) {
    return `
      <div class="groupe-champ">
        ${htmlBascule('eliminationAuto', 'Élimination assistée', 'L’app écarte automatiquement les portraits qui ne correspondent plus. Vous pouvez toujours cliquer sur les cartes.', config.eliminationAuto)}
      </div>
    `;
  }

  function vueFormulaireHotseat(config) {
    return `
      ${htmlChampsJoueurs(config)}
      <div class="groupe-champ">
        <span class="groupe-champ__label">Choix du secret <span class="groupe-champ__aide">Chaque joueur choisit à son tour, écran masqué.</span></span>
        ${htmlChoixCartes(
          'methodeSecret',
          [
            { valeur: 'choix', titre: 'Choisir', description: 'Parcourir le plateau et désigner son personnage.', icone: '👆' },
            { valeur: 'hasard', titre: 'Au hasard', description: 'Le PC tire un portrait, révélé uniquement sur demande.', icone: '🎲' },
            { valeur: 'code', titre: 'Par code', description: 'Saisir une case A1–F4 sans afficher le portrait.', icone: '⌨️' }
          ],
          config.methodeSecret
        )}
      </div>
      ${htmlChampsManches(config)}
      ${htmlChampsChronometre(config)}
      ${htmlChampsElimination(config)}
    `;
  }

  function vueFormulaireDuel(config) {
    return `
      <div class="groupe-champ">
        <span class="groupe-champ__label">Votre nom de détective</span>
        <input class="champ-texte" type="text" name="nomJoueur" maxlength="24" value="${htmlAttribut(config.nomJoueur)}" placeholder="Détective" aria-label="Votre nom">
      </div>
      <div class="groupe-champ">
        <span class="groupe-champ__label">Niveau du PC <span class="groupe-champ__aide">La difficulté change la façon de poser ses questions.</span></span>
        ${htmlChoixCartes(
          'difficulte',
          [
            { valeur: 'facile', titre: 'Facile', description: DIFFICULTES.facile.description, icone: '🌱' },
            { valeur: 'moyen', titre: 'Moyen', description: DIFFICULTES.moyen.description, icone: '⚙️' },
            { valeur: 'difficile', titre: 'Difficile', description: DIFFICULTES.difficile.description, icone: '🧠' }
          ],
          config.difficulte
        )}
      </div>
      <div class="groupe-champ" data-conditionnel="bluff">
        ${htmlBascule('bluff', 'Variante bluff', 'En difficile uniquement : le PC peut mentir une seule fois dans toute la partie. Il choisit le moment qui divise le plus vos hypothèses.', config.bluff)}
      </div>
      ${htmlChampsManches(config)}
      ${htmlChampsChronometre(config)}
      ${htmlChampsElimination(config)}
    `;
  }

  function vueFormulaireMystere(config) {
    const statsSolo = state.stats.mystere;
    return `
      <div class="groupe-champ">
        <span class="groupe-champ__label">Sous-mode d’enquête <span class="groupe-champ__aide">La série continue tant que vous gagnez.</span></span>
        ${htmlChoixCartes(
          'modeMystere',
          [
            { valeur: 'libre', titre: 'Libre', description: SOUS_MODES.libre.description, icone: '♾️' },
            { valeur: 'questions', titre: 'Compteur', description: SOUS_MODES.questions.description, icone: '🔢' },
            { valeur: 'vies', titre: 'Trois vies', description: SOUS_MODES.vies.description, icone: '❤️' },
            { valeur: 'chrono', titre: 'Chrono', description: SOUS_MODES.chrono.description, icone: '⏱️' }
          ],
          config.modeMystere,
          'choix-cartes--quatre'
        )}
      </div>
      <div class="groupe-champ" data-conditionnel="budget">
        <span class="groupe-champ__label">Nombre de questions <span class="groupe-champ__aide">Ensuite, il faudra annoncer.</span></span>
        ${htmlSegment(
          'budgetQuestions',
          [
            { valeur: 10, label: '10 questions' },
            { valeur: 8, label: '8 questions' },
            { valeur: 6, label: '6 questions' }
          ],
          config.budgetQuestions
        )}
      </div>
      <div class="groupe-champ" data-conditionnel="chrono">
        <span class="groupe-champ__label">Temps d’enquête</span>
        ${htmlSegment(
          'dureeChrono',
          [
            { valeur: 60, label: '60 s' },
            { valeur: 90, label: '90 s' },
            { valeur: 120, label: '120 s' }
          ],
          config.dureeChrono
        )}
      </div>
      ${htmlChampsElimination(config)}
      <div class="ligne-bascule">
        <span class="ligne-bascule__texte">
          <strong>Série en cours</strong>
          <small>${statsSolo.serieActuelle > 0 ? `${statsSolo.serieActuelle} victoire(s) d’affilée · ${statsSolo.scoreSerie} points` : 'Aucune série active. Une nouvelle série commencera.'} · Record : ${statsSolo.meilleureSerie}</small>
        </span>
        <span class="puce puce--accent">${statsSolo.meilleurScore} pts</span>
      </div>
    `;
  }

  function vueConfiguration() {
    const mode = state.modeActif || 'hotseat';
    const modeInfo = MODES[mode];
    const config = state.config;
    const theme = state.theme;
    const pers = theme.personnages[3 % theme.personnages.length];
    const couleur = stylePersonnage(pers);

    const contenus = {
      hotseat: vueFormulaireHotseat,
      duel: vueFormulaireDuel,
      mystere: vueFormulaireMystere
    };

    const regles = {
      hotseat: [
        'Chaque joueur choisit son secret à l’abri des regards.',
        'À tour de rôle, posez une question générée depuis les attributs.',
        'Éliminez les portraits, puis annoncez le secret adverse. Une erreur est immédiatement éliminatoire.'
      ],
      duel: [
        'Le PC tire un personnage secret et répond honnêtement à vos questions.',
        'Le PC cherche votre secret par dichotomie : ses questions coupent ses hypothèses en deux.',
        'En difficile, activez le bluff pour un unique mensonge stratégique.'
      ],
      mystere: [
        'Le PC choisit un secret, vous ne posez que des questions oui/non.',
        'Chaque réponse peut éliminer plusieurs portraits d’un seul coup.',
        'Les victoires s’enchaînent en série ; la meilleure série est conservée.'
      ]
    };

    const bouton = mode === 'mystere' ? 'Lancer l’enquête' : 'Lancer la partie';
    const aideBouton =
      mode === 'mystere'
        ? 'Le PC ne pose aucune question en solo.'
        : mode === 'duel'
          ? 'Vous pouvez activer ou non l’élimination assistée.'
          : 'Les secrets restent cachés sur le même écran.';

    return `
      <div class="ecran-configuration">
        ${enTeteSimple({ actionMarque: 'retour-accueil' })}
        <main class="page" id="contenu" tabindex="-1">
          <button class="btn btn--fantome btn--petit entete-page__retour" data-action="retour-accueil">
            ${icone('arrowLeft')} Retour à l’accueil
          </button>
          <div class="entete-page">
            <div>
              <p class="surtitre">${htmlEchappe(modeInfo.nom)} · ${htmlEchappe(theme.nom)}</p>
              <h1>${htmlEchappe(modeInfo.titre)}</h1>
              <p>${htmlEchappe(modeInfo.description)}</p>
            </div>
            <div class="entete-page__sceau" aria-hidden="true">${icone(modeInfo.icone)}</div>
          </div>

          <div class="mise-en-page">
            <form id="form-config" class="panneau panneau--formulaire" data-form="config" novalidate>
              <div class="formulaire">
                ${contenus[mode](config)}
                <div class="actions-formulaire">
                  <span class="actions-formulaire__note">${htmlEchappe(aideBouton)}</span>
                  <button class="btn btn--primaire btn--large" type="submit">
                    ${icone(modeInfo.icone)} ${bouton}
                  </button>
                </div>
              </div>
            </form>

            <aside class="apercu">
              <div class="apercu__scene">
                <div class="apercu__carte" style="${couleur}">
                  <div class="apercu__emoji">${htmlPortrait(pers)}</div>
                  <div class="apercu__nom">${htmlEchappe(pers.nom)}</div>
                </div>
                <span class="apercu__legende">${htmlEchappe(theme.nom)} · ${U.codePosition(theme.indexParId.get(pers.id), 6)}</span>
              </div>

              <div class="panneau apercu__details">
                <h3>${icone(modeInfo.icone)} Le déroulé <span class="puce">${objectifManches(config.manches)}</span></h3>
                <ul>
                  ${regles[mode].map((regle) => `<li>${htmlEchappe(regle)}</li>`).join('')}
                </ul>
                <div class="separateur"></div>
                <span class="groupe-champ__label">Univers <span class="groupe-champ__aide">Le thème est mémorisé.</span></span>
                <div class="selecteur-theme-mini">
                  ${Themes.modeles
                    .map(
                      (modeleTheme) => `
                        <button type="button"
                          style="--theme-accent:${modeleTheme.palette.accent}"
                          data-action="choisir-theme"
                          data-theme="${modeleTheme.id}"
                          aria-label="${htmlAttribut(modeleTheme.nom)}"
                          aria-pressed="${modeleTheme.id === theme.id}"
                          title="${htmlAttribut(modeleTheme.nom)}"
                        >${modeleTheme.emoji}</button>
                      `
                    )
                    .join('')}
                </div>
                <div class="separateur"></div>
                <p class="actions-formulaire__note">
                  ${icone('lock')} Aucun serveur, aucune donnée envoyée. Vos scores restent dans le navigateur.
                </p>
              </div>
            </aside>
          </div>
        </main>
        <footer class="footer">
          <p>Qui suis-je ? · ${htmlEchappe(theme.nom)}</p>
          <div class="footer__liens">
            <button data-action="ouvrir-aide">Règles</button>
            <button data-action="ouvrir-stats">Scores</button>
          </div>
        </footer>
      </div>
    `;
  }

  function capturerConfiguration() {
    const form = document.getElementById('form-config');
    if (!form || !state.config) return;
    const elements = form.elements;
    const valeur = (nom) => (elements[nom] && elements[nom].value !== undefined ? elements[nom].value : '');
    const coche = (nom) => Boolean(elements[nom] && elements[nom].checked);

    state.config.nomJ1 = String(valeur('nomJ1') || '').slice(0, 24);
    state.config.nomJ2 = String(valeur('nomJ2') || '').slice(0, 24);
    state.config.nomJoueur = String(valeur('nomJoueur') || '').slice(0, 24);
    state.config.manches = Number(valeur('manches')) || 3;
    state.config.timerActif = coche('timerActif');
    state.config.dureeTour = Number(valeur('dureeTour')) || 60;
    state.config.eliminationAuto = coche('eliminationAuto');
    state.config.methodeSecret = valeur('methodeSecret') || 'choix';
    state.config.difficulte = valeur('difficulte') || 'moyen';
    state.config.bluff = coche('bluff');
    state.config.modeMystere = valeur('modeMystere') || 'libre';
    state.config.budgetQuestions = Number(valeur('budgetQuestions')) || 8;
    state.config.dureeChrono = Number(valeur('dureeChrono')) || 90;
  }

  function persisterOptionsDepuisConfiguration() {
    if (!state.config) return;
    const r = state.reglages;
    r.manches = state.config.manches;
    r.timerActif = state.config.timerActif;
    r.dureeTour = state.config.dureeTour;
    r.eliminationAuto = state.config.eliminationAuto;
    r.methodeSecret = state.config.methodeSecret;
    r.difficulte = state.config.difficulte;
    r.bluff = state.config.bluff;
    r.modeMystere = state.config.modeMystere;
    r.budgetQuestions = state.config.budgetQuestions;
    r.dureeChrono = state.config.dureeChrono;
    r.themeId = state.theme ? state.theme.id : r.themeId;
    Storage.sauverReglages(r);
    state.reglages = r;
  }

  function syncConfigurationUI() {
    const form = document.getElementById('form-config');
    if (!form) return;
    const cocheTimer = form.querySelector('input[name="timerActif"]');
    const diff = form.querySelector('input[name="difficulte"]:checked');
    const sousMode = form.querySelector('input[name="modeMystere"]:checked');

    const blocTimer = form.querySelector('[data-conditionnel="timer"]');
    if (blocTimer) blocTimer.hidden = !(cocheTimer && cocheTimer.checked);

    const blocBluff = form.querySelector('[data-conditionnel="bluff"]');
    if (blocBluff) blocBluff.hidden = !(diff && diff.value === 'difficile');

    const blocBudget = form.querySelector('[data-conditionnel="budget"]');
    if (blocBudget) blocBudget.hidden = !(sousMode && sousMode.value === 'questions');

    const blocChrono = form.querySelector('[data-conditionnel="chrono"]');
    if (blocChrono) blocChrono.hidden = !(sousMode && sousMode.value === 'chrono');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Écrans de choix du secret (anti-spoil)
  // ───────────────────────────────────────────────────────────────────────────

  function initialiserSecretUI() {
    const methode = state.partie && state.partie.config ? state.partie.config.methodeSecret || 'choix' : 'choix';
    state.ui.secret = {
      methode,
      choixId: null,
      tirageId: null,
      codeId: null,
      codeSaisi: '',
      erreurCode: ''
    };
  }

  function personnageSecretCourant() {
    if (!state.partie) return null;
    if (state.partie.mode === 'hotseat') {
      const index = state.partie.etapeSecret ? state.partie.etapeSecret.joueurIndex : 0;
      return state.partie.joueurs[index] || null;
    }
    return { nom: state.partie.nomJoueur || 'Détective' };
  }

  function htmlBoutonReveler(cible, nomId, libelle) {
    return `
      <button type="button" class="bouton-reveler" data-hold-cible="${cible}" ${nomId ? `data-hold-nom="${nomId}"` : ''}>
        ${icone('eye')} ${libelle || 'Maintenir pour révéler'}
      </button>
    `;
  }

  function htmlCarteTiree(pers, idCarte, idNom) {
    return `
      <div class="carte-tiree est-masquee" id="${idCarte}" style="${stylePersonnage(pers)}">
        <div class="carte-tiree__emoji">${htmlPortrait(pers, { eager: true })}</div>
        <div class="carte-tiree__nom" id="${idNom}" data-nom="${htmlAttribut(pers.nom)}">••••••</div>
        <div class="carte-tiree__code">Portrait secret · ${codeDe(pers.id)}</div>
      </div>
    `;
  }

  function renderSecretGrille(selection, action) {
    return `
      <div class="secret-grille">
        ${state.theme.personnages
          .map((pers) => {
            const choisi = selection === pers.id;
            const couleur = state.theme.couleurPersonnage(pers);
            return `
              <button
                type="button"
                class="mini-portrait${choisi ? ' est-choisi' : ''}"
                style="--mini-fond:${couleur.fond};--teinte-lueur:${couleur.lueur}"
                data-action="${action}"
                data-id="${pers.id}"
                aria-pressed="${choisi}"
                title="${htmlAttribut(pers.nom)}"
              >
                <span class="mini-portrait__code">${codeDe(pers.id)}</span>
                <span class="mini-portrait__emoji">${htmlPortrait(pers)}</span>
                <span class="mini-portrait__nom">${htmlEchappe(pers.nom)}</span>
              </button>
            `;
          })
          .join('')}
      </div>
    `;
  }

  function vueSecrets() {
    const partie = state.partie;
    if (!partie) {
      state.ecran = 'accueil';
      return vueAccueil();
    }

    if (partie.mode === 'hotseat' && partie.phase === 'secrets' && partie.etapeSecret) {
      if (partie.etapeSecret.sousEtape === 'pass') {
        return vuePassageSecret(partie);
      }
      return vueChoixSecret(partie, 'hotseat');
    }

    if (partie.mode === 'duel' && partie.phase === 'secret') {
      return vueChoixSecret(partie, 'duel');
    }

    // Filet de sécurité : l'état a changé entre deux rendus.
    setTimeout(() => synchroniserPartie(), 0);
    return `<div class="chargement"><p>Préparation…</p></div>`;
  }

  function vuePassageSecret(partie) {
    const index = partie.etapeSecret.joueurIndex;
    const joueur = partie.joueurs[index];
    const autre = partie.joueurs[index === 0 ? 1 : 0];
    return `
      <div class="ecran-secret">
        ${enTeteSimple({ actionMarque: 'quitter-partie' })}
        <main class="ecran-secret__contenu" id="contenu" tabindex="-1">
          <section class="secret-panneau secret-panneau--verrou">
            <div class="oeil-verrou" aria-hidden="true">🙈</div>
            <p class="surtitre">Étape confidentielle · Joueur ${index + 1}</p>
            <h1>Passe le PC à ${htmlEchappe(joueur.nom)}</h1>
            <p>
              ${htmlEchappe(autre.nom)}, regarde ailleurs. ${htmlEchappe(joueur.nom)} va choisir son personnage secret,
              puis l’écran sera de nouveau masqué.
            </p>
            <button class="btn btn--primaire btn--large" data-action="secret-pret">
              Je suis seul(e) devant l’écran ${icone('arrowRight')}
            </button>
            <p class="secret-pied__note" style="margin-top:18px">
              Manche ${partie.round} · ${htmlEchappe(partie.joueurs[0].nom)} et ${htmlEchappe(partie.joueurs[1].nom)}.
              Le plateau de déduction de chacun reste séparé.
            </p>
          </section>
        </main>
      </div>
    `;
  }

  function vueChoixSecret(partie, contexte) {
    if (!state.ui.secret) initialiserSecretUI();
    const uiSecret = state.ui.secret;
    const hotseat = contexte === 'hotseat';
    const indexJoueur = hotseat ? partie.etapeSecret.joueurIndex : 0;
    const joueur = hotseat ? partie.joueurs[indexJoueur] : { nom: partie.nomJoueur || 'Détective' };
    const methode = uiSecret.methode;
    const choix = uiSecret.choixId ? personnage(uiSecret.choixId) : null;
    const tirage = uiSecret.tirageId ? personnage(uiSecret.tirageId) : null;
    const codePers = uiSecret.codeId ? personnage(uiSecret.codeId) : null;
    const selectionId = methode === 'choix' ? uiSecret.choixId : methode === 'hasard' ? uiSecret.tirageId : uiSecret.codeId;
    const selection = selectionId ? personnage(selectionId) : null;

    const etapes = hotseat
      ? `<span class="${indexJoueur === 0 ? 'est-active' : ''}">J1 · ${htmlEchappe(partie.joueurs[0].nom)}</span><span class="${indexJoueur === 1 ? 'est-active' : ''}">J2 · ${htmlEchappe(partie.joueurs[1].nom)}</span>`
      : `<span class="est-active">Votre secret</span><span>Le PC tire le sien</span>`;

    const onglets = `
      <div class="onglets-secret" role="tablist" aria-label="Méthode de choix du secret">
        <button type="button" class="onglet-secret" role="tab" aria-selected="${methode === 'choix'}" data-action="secret-methode" data-methode="choix">👆 Choisir</button>
        <button type="button" class="onglet-secret" role="tab" aria-selected="${methode === 'hasard'}" data-action="secret-methode" data-methode="hasard">🎲 Au hasard</button>
        <button type="button" class="onglet-secret" role="tab" aria-selected="${methode === 'code'}" data-action="secret-methode" data-methode="code">⌨️ Par code</button>
      </div>
    `;

    let methodeHtml = '';
    if (methode === 'choix') {
      methodeHtml = `
        <div class="secret-methode">
          <p class="texte-doux" style="margin-bottom:14px">
            Parcours le plateau et désigne le portrait que tu veux garder. Personne ne doit regarder par-dessus ton épaule.
          </p>
          ${renderSecretGrille(uiSecret.choixId, 'secret-choisir')}
          ${choix ? `
            <div class="secret-selection">
              <div class="secret-selection__identite">
                <span class="secret-selection__emoji">${htmlPortrait(choix)}</span>
                <div>
                  <div class="secret-selection__nom">${htmlEchappe(choix.nom)}</div>
                  <div class="secret-selection__aide">${codeDe(choix.id)} · ${htmlEchappe(state.theme.nom)}</div>
                </div>
              </div>
              <button class="btn btn--primaire" data-action="secret-confirmer" data-id="${choix.id}">
                ${icone('lock')} Garder ce secret
              </button>
            </div>
          ` : ''}
        </div>
      `;
    } else if (methode === 'hasard') {
      methodeHtml = `
        <div class="secret-methode secret-methode--hasard">
          <p class="texte-doux" style="max-width:470px;margin-bottom:4px">
            Laisse le PC tirer un portrait au sort. Il ne sera dévoilé que tant que tu maintiens le bouton.
          </p>
          ${!tirage ? `
            <button class="btn btn--primaire btn--large" data-action="secret-tirer">
              🎲 Tirer mon personnage secret
            </button>
          ` : `
            ${htmlCarteTiree(tirage, 'carte-secrete', 'carte-secrete-nom')}
            ${htmlBoutonReveler('carte-secrete', 'carte-secrete-nom', 'Maintenir pour mémoriser')}
            <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:14px">
              <button class="btn btn--fantome btn--petit" data-action="secret-tirer">${icone('refresh')} Retirer</button>
              <button class="btn btn--primaire" data-action="secret-confirmer" data-id="${tirage.id}">
                ${icone('lock')} Garder ce secret
              </button>
            </div>
          `}
        </div>
      `;
    } else {
      methodeHtml = `
        <div class="secret-methode secret-methode--code">
          <div class="aide-code">
            <strong>Le code d’une case.</strong> Chaque portrait correspond à une case du plateau, de <strong>A1</strong> à <strong>F4</strong>.
            Saisis le code sans que le personnage soit affiché à l’écran. Tu peux vérifier discrètement en maintenant le bouton.
            <details style="margin-top:10px">
              <summary style="cursor:pointer;color:var(--accent)">Consulter la grille des codes</summary>
              <div class="secret-grille" style="margin-top:10px;max-height:250px">
                ${state.theme.personnages
                  .map((pers) => `
                    <span class="mini-portrait" style="cursor:default">
                      <span class="mini-portrait__code">${codeDe(pers.id)}</span>
                      <span class="mini-portrait__emoji">${htmlPortrait(pers)}</span>
                      <span class="mini-portrait__nom">${htmlEchappe(pers.nom)}</span>
                    </span>
                  `)
                  .join('')}
              </div>
            </details>
          </div>
          ${!codePers ? `
            <form data-form="code-secret">
              <label class="groupe-champ__label" for="champ-code">Code de la case</label>
              <div style="display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap">
                <input class="champ-texte champ-code" id="champ-code" name="code" maxlength="3" autocomplete="off" spellcheck="false" value="${htmlAttribut(uiSecret.codeSaisi)}" placeholder="C3" aria-describedby="erreur-code">
                <button class="btn btn--secondaire" type="submit">Valider le code</button>
              </div>
              <div class="erreur-code" id="erreur-code" role="alert">${htmlEchappe(uiSecret.erreurCode)}</div>
            </form>
          ` : `
            <div class="secret-selection">
              <div class="secret-selection__identite">
                <span class="secret-selection__emoji">🔒</span>
                <div>
                  <div class="secret-selection__nom">Case ${codeDe(codePers.id)} enregistrée</div>
                  <div class="secret-selection__aide">Le portrait n’est pas affiché.</div>
                </div>
              </div>
              ${htmlBoutonReveler('carte-code-secrete', 'carte-code-secrete-nom', 'Vérifier discrètement')}
            </div>
            <div class="carte-tiree est-masquee" id="carte-code-secrete" style="${stylePersonnage(codePers)};width:150px;margin-top:15px">
              <div class="carte-tiree__emoji">${htmlPortrait(codePers)}</div>
              <div class="carte-tiree__nom" id="carte-code-secrete-nom" data-nom="${htmlAttribut(codePers.nom)}">••••••</div>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:15px">
              <button type="button" class="btn btn--fantome btn--petit" data-action="secret-effacer-code">${icone('refresh')} Changer de code</button>
              <button type="button" class="btn btn--primaire" data-action="secret-confirmer" data-id="${codePers.id}">
                ${icone('lock')} Garder ce secret
              </button>
            </div>
          `}
        </div>
      `;
    }

    return `
      <div class="ecran-secret">
        ${enTeteSimple({ actionMarque: 'quitter-partie' })}
        <main class="ecran-secret__contenu" id="contenu" tabindex="-1">
          <section class="secret-panneau">
            <div class="secret-panneau__entete">
              <div>
                <p class="surtitre">${hotseat ? `Manche ${partie.round} · secret de ${htmlEchappe(joueur.nom)}` : 'Votre personnage secret'}</p>
                <h1>${hotseat ? `Choisis ton secret, ${htmlEchappe(joueur.nom)}` : 'Choisissez votre secret'}</h1>
                <p>
                  ${hotseat
                    ? `Ce choix est personnel. ${htmlEchappe(partie.joueurs[indexJoueur === 0 ? 1 : 0].nom)} ne doit pas voir cette étape.`
                    : 'Le PC tire ensuite son propre personnage. Il ne connaît pas le vôtre au moment de répondre.'}
                </p>
              </div>
              <div class="etapes-secret">${etapes}</div>
            </div>
            ${onglets}
            ${methodeHtml}
            <div class="secret-pied">
              <p class="secret-pied__note">
                ${methode === 'code'
                  ? 'Le code final ne révèle pas le personnage. Une fois validé, passe le PC à l’autre joueur.'
                  : 'Une fois le secret mémorisé, l’écran suivant masque immédiatement le plateau.'}
              </p>
              <div class="secret-pied__actions">
                ${hotseat ? '<button class="btn btn--fantome btn--petit" data-action="quitter-partie">Quitter la partie</button>' : ''}
              </div>
            </div>
          </section>
        </main>
      </div>
    `;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Écran de jeu
  // ───────────────────────────────────────────────────────────────────────────

  function htmlTimer(partie) {
    const chrono = partie.mode === 'mystere' && partie.config.sousMode === 'chrono';
    const tourActif = partie.mode !== 'mystere' && partie.config.timerActif;
    if (!chrono && !tourActif) return '';
    return `
      <div class="timer${chrono ? ' timer--chrono' : ''}" id="timer-jeu" role="timer" aria-label="Temps restant">
        <span class="timer__icone">${icone(chrono ? 'sablier' : 'clock')}</span>
        <span class="timer__valeur" id="timer-valeur">${chrono ? U.formaterTemps(partie.config.dureeChrono) : U.formaterTemps(partie.config.dureeTour)}</span>
        <span class="timer__barre"><span id="timer-barre-interne"></span></span>
      </div>
    `;
  }

  function htmlEnteteJeu(partie) {
    const modeInfo = MODES[partie.mode];
    const libelleScore =
      partie.mode === 'hotseat'
        ? `${htmlEchappe(partie.joueurs[0].nom)} ${partie.scores[0]} — ${partie.scores[1]} ${htmlEchappe(partie.joueurs[1].nom)}`
        : partie.mode === 'duel'
          ? `Vous ${partie.scores.joueur} — ${partie.scores.pc} PC`
          : `Série ${state.stats.mystere.serieActuelle} · Record ${state.stats.mystere.meilleureSerie}`;

    return `
      <header class="bandeau bandeau--jeu">
        <div class="jeu__barre-gauche">
          <div class="jeu__mode">
            <span class="jeu__mode-emoji">${state.theme.emoji}</span>
            <span class="jeu__mode-texte">
              <strong>${htmlEchappe(modeInfo.titre)}</strong>
              <span>${htmlEchappe(state.theme.nom)} · ${partie.mode === 'mystere' ? libelleSousMode(partie.config.sousMode) : `Manche ${partie.round}`}</span>
            </span>
          </div>
        </div>
        <div class="jeu__barre-centre">
          <span class="hud-pastille"><span class="hud-pastille__pastille"></span>${libelleScore}</span>
          <span class="hud-pastille">${icone('question')}<strong>${partie.questionCount}</strong> question${partie.questionCount > 1 ? 's' : ''}</span>
          ${partie.mode !== 'mystere' ? `<span class="hud-pastille">${objectifManches(partie.config.manches)}</span>` : ''}
        </div>
        <div class="jeu__barre-droite">
          ${htmlTimer(partie)}
          <button class="btn btn--secondaire btn--petit" data-action="journal-ouvrir" aria-label="Ouvrir le journal de la partie">
            ${icone('journal')}<span class="btn--texte-large">Journal</span>
          </button>
          <button class="btn btn--fantome btn--petit" data-action="ouvrir-aide" aria-label="Aide et règles">${icone('help')}</button>
          <button class="btn btn--fantome btn--petit" data-action="quitter-partie" aria-label="Quitter la partie">${icone('close')}</button>
        </div>
      </header>
    `;
  }

  function htmlCartePortrait(pers, index, plateau, rapide) {
    const eliminee = plateau.has(pers.id);
    const code = U.codePosition(index, 6);
    const animation = state.ui.animationsElimination.has(pers.id) ? ' est-recemment-eliminee' : '';
    const actionPrincipale = rapide ? 'carte-eliminer' : 'carte-inspecter';
    const libelle = rapide
      ? eliminee
        ? `Réintégrer ${pers.nom}`
        : `Éliminer ${pers.nom}`
      : `Voir la fiche de ${pers.nom}`;
    return `
      <article class="carte-portrait${eliminee ? ' est-eliminee' : ''}${animation}" style="${stylePersonnage(pers, true, index)}">
        <button
          class="carte-portrait__principal"
          data-action="${actionPrincipale}"
          data-id="${pers.id}"
          aria-label="${htmlAttribut(libelle)}"
          aria-pressed="${eliminee}"
          title="${htmlAttribut(pers.nom)}"
        >
          <span class="carte-portrait__surface">
            <span class="carte-portrait__code">${code}</span>
            <span class="carte-portrait__emoji">${htmlPortrait(pers)}</span>
            <span class="carte-portrait__nom">${htmlEchappe(pers.nom)}</span>
          </span>
        </button>
        <button
          class="carte-portrait__action carte-portrait__action--eliminer"
          data-action="carte-eliminer"
          data-id="${pers.id}"
          aria-label="${htmlAttribut(eliminee ? `Réintégrer ${pers.nom}` : `Éliminer ${pers.nom}`)}"
          title="${htmlAttribut(eliminee ? 'Réintégrer' : 'Éliminer')}"
        >${eliminee ? '↺' : '✕'}</button>
        <button
          class="carte-portrait__action carte-portrait__action--fiche"
          data-action="carte-inspecter"
          data-id="${pers.id}"
          aria-label="${htmlAttribut(`Voir les attributs de ${pers.nom}`)}"
          title="Voir la fiche"
        >${icone('eye')}</button>
      </article>
    `;
  }

  function htmlPlateau(partie) {
    const plateau = Engine.plateauActif(partie);
    const rapide = state.ui.eliminationRapide;
    const restants = state.theme.tousLesIds.length - plateau.size;
    const clePlateau = `${partie.id}:${partie.mode}:${partie.round}`;
    const animer = !state.ui.plateauxAnimes.has(clePlateau);
    if (animer) state.ui.plateauxAnimes.add(clePlateau);
    return `
      <section class="plateau-panneau">
        <div class="plateau-entete">
          <div class="plateau-entete__titre">
            <h2>${partie.mode === 'hotseat' ? `Plateau de ${htmlEchappe(partie.joueurs[partie.active].nom)}` : 'Votre plateau de déduction'}</h2>
            <p>Clique une carte pour ouvrir sa fiche. La croix écarte le portrait.</p>
          </div>
          <div class="plateau-entete__outils">
            <button class="interrupteur-outil${rapide ? ' est-actif' : ''}" data-action="mode-elimination" aria-pressed="${rapide}">
              ${icone('target')} Élimination rapide
            </button>
            <button class="interrupteur-outil" data-action="restaurer-plateau">
              ${icone('refresh')} Restaurer
            </button>
          </div>
        </div>
        <div class="plateau-scene">
          <div class="plateau${animer ? ' est-nouveau' : ''}">
            ${state.theme.personnages.map((pers, index) => htmlCartePortrait(pers, index, plateau, rapide)).join('')}
          </div>
          <div class="sceau-reponse" id="sceau-reponse" aria-hidden="true"></div>
        </div>
        <div class="plateau-pied">
          <div class="plateau-pied__legende">
            <span><span class="legende-point"></span> portrait actif</span>
            <span><span class="legende-point legende-point--gris"></span> portrait écarté</span>
            <span>${U.codePosition(0, 6)} → ${U.codePosition(state.theme.tousLesIds.length - 1, 6)}</span>
          </div>
          <span class="plateau-pied__compte"><strong>${restants}</strong> / ${state.theme.tousLesIds.length} candidats</span>
        </div>
      </section>
    `;
  }

  function htmlSecretJoueur(partie) {
    if (partie.mode === 'hotseat') {
      const joueur = partie.joueurs[partie.active];
      const pers = personnage(joueur.secretId);
      if (!pers) return '';
      return `
        <div class="carte-panneau">
          <div class="carte-panneau__entete">
            <span class="carte-panneau__titre"><span>${icone('lock')}</span> Ton secret</span>
            <span class="puce">${partyCode(joueur.secretId)}</span>
          </div>
          <div class="secret-joueur">
            <span class="secret-joueur__emoji est-masque" id="secret-actif" style="${stylePersonnage(pers)}">${htmlPortrait(pers)}</span>
            <span class="secret-joueur__texte">
              <span class="secret-joueur__label">Personnage secret</span>
              <span class="secret-joueur__nom" id="secret-actif-nom" data-nom="${htmlAttribut(pers.nom)}">••••••</span>
            </span>
            <button class="bouton-oeil" data-hold-cible="secret-actif" data-hold-nom="secret-actif-nom" aria-label="Maintenir pour voir ton personnage secret">${icone('eye')}</button>
          </div>
          <p class="secret-joueur__aide">Maintiens l’œil pour vérifier discrètement. Le secret n’est jamais affiché en permanence.</p>
        </div>
      `;
    }

    if (partie.mode === 'duel') {
      const pers = personnage(partie.secretJoueur);
      if (!pers) return '';
      return `
        <div class="carte-panneau">
          <div class="carte-panneau__entete">
            <span class="carte-panneau__titre"><span>${icone('lock')}</span> Votre secret</span>
            <span class="puce">${partyCode(pers.id)}</span>
          </div>
          <div class="secret-joueur">
            <span class="secret-joueur__emoji" style="${stylePersonnage(pers)}">${htmlPortrait(pers)}</span>
            <span class="secret-joueur__texte">
              <span class="secret-joueur__label">Le PC ne le connaît pas</span>
              <span class="secret-joueur__nom">${htmlEchappe(pers.nom)}</span>
            </span>
          </div>
          <p class="secret-joueur__aide">Votre personnage est utilisé pour répondre aux questions du PC. Le PC ne peut pas le lire.</p>
        </div>
      `;
    }

    return `
      <div class="carte-panneau">
        <div class="carte-panneau__entete">
          <span class="carte-panneau__titre"><span>${icone('eye')}</span> Le secret du PC</span>
          <span class="puce puce--accent">masqué</span>
        </div>
        <div class="secret-joueur">
          <span class="secret-joueur__emoji est-masque" style="--teinte:280">❓</span>
          <span class="secret-joueur__texte">
            <span class="secret-joueur__label">Enquête en cours</span>
            <span class="secret-joueur__nom">Un des ${state.theme.tousLesIds.length} portraits</span>
          </span>
        </div>
        <p class="secret-joueur__aide">Le PC ne pose aucune question en mode mystère. À toi de faire parler les attributs.</p>
      </div>
    `;
  }

  function partyCode(idSecret) {
    if (!idSecret) return '—';
    return `Secret ${codeDe(idSecret)}`;
  }

  function htmlTour(partie) {
    let jeton = '?';
    let titre = '';
    let sousTitre = '';
    if (partie.mode === 'hotseat') {
      const joueur = partie.joueurs[partie.active];
      jeton = `J${partie.active + 1}`;
      titre = `Au tour de ${joueur.nom}`;
      sousTitre = `Manche ${partie.round} · ${objectifManches(partie.config.manches)}`;
    } else if (partie.mode === 'duel') {
      jeton = 'VS';
      titre = state.ui.pcReflexion ? 'Le PC réfléchit…' : 'À vous de jouer';
      sousTitre = `Manche ${partie.round} · ${DIFFICULTES[partie.config.difficulte].nom}${partie.config.bluff ? ' · bluff actif' : ''}`;
    } else {
      jeton = '🔍';
      titre = 'Votre enquête';
      sousTitre = `${libelleSousMode(partie.config.sousMode)} · manche ${partie.round}`;
    }

    const restants = Engine.candidatsRestants(partie, state.theme);
    const questionAffichee = partie.mode === 'mystere' ? partie.questionCount : partie.questionCount;
    const libelleCandidats = restants > 1 ? 'candidats restants' : 'candidat restant';
    const libelleQuestions = questionAffichee > 1 ? 'questions posées' : 'question posée';

    return `
      <div class="carte-panneau">
        <div class="tour-actuel">
          <div class="tour-actuel__jeton">${jeton}</div>
          <div class="tour-actuel__texte">
            <strong>${htmlEchappe(titre)}</strong>
            <span>${htmlEchappe(sousTitre)}</span>
          </div>
        </div>
        <div class="separateur"></div>
        <div class="compteurs">
          <div class="compteur">
            <span class="compteur__valeur">${restants}</span>
            <span class="compteur__label">${libelleCandidats}</span>
          </div>
          <div class="compteur">
            <span class="compteur__valeur">${questionAffichee}</span>
            <span class="compteur__label">${libelleQuestions}</span>
          </div>
        </div>
        ${htmlDetailsTour(partie)}
      </div>
    `;
  }

  function htmlDetailsTour(partie) {
    if (partie.mode === 'hotseat') {
      const autre = partie.joueurs[partie.active === 0 ? 1 : 0];
      return `
        <div class="separateur"></div>
        <p class="objectif-texte">
          <strong>${htmlEchappe(autre.nom)}</strong> a éliminé ${autre.plateau.size} portrait${autre.plateau.size > 1 ? 's' : ''} sur son propre plateau.
          ${partie.config.eliminationAuto ? 'L’élimination assistée est active.' : 'Éliminez les cartes manuellement après chaque réponse.'}
        </p>
      `;
    }
    if (partie.mode === 'duel') {
      const restantsPC = partie.pcCandidats.length;
      const pourcentage = Math.round((1 - restantsPC / state.theme.tousLesIds.length) * 100);
      return `
        <div class="separateur"></div>
        <div class="pc-jauge">
          <div class="pc-jauge__entete"><span>Intuition du PC</span><strong>${restantsPC} / ${state.theme.tousLesIds.length}</strong></div>
          <div class="jauge"><span style="width:${pourcentage}%"></span></div>
        </div>
        <p class="note-tour">Le PC élimine ses hypothèses à chaque réponse. S’il n’en garde qu’une, il annonce.</p>
      `;
    }
    if (partie.config.sousMode === 'vies') {
      return `
        <div class="separateur"></div>
        <div class="pc-jauge__entete"><span>Vies restantes</span><strong>${partie.viesRestantes} / 3</strong></div>
        <div class="vies" aria-label="${partie.viesRestantes} vies restantes">
          ${[0, 1, 2].map((index) => `<span class="vie${index >= partie.viesRestantes ? ' est-perdue' : ''}">●</span>`).join('')}
        </div>
      `;
    }
    if (partie.config.sousMode === 'questions') {
      const restantes = Math.max(0, partie.budget - partie.questionCount);
      return `
        <div class="separateur"></div>
        <div class="pc-jauge__entete"><span>Questions restantes</span><strong>${restantes} / ${partie.budget}</strong></div>
        <div class="jauge"><span style="width:${(restantes / partie.budget) * 100}%"></span></div>
      `;
    }
    if (partie.config.sousMode === 'chrono') {
      return `
        <div class="separateur"></div>
        <p class="note-tour">Chrono actif : trouve le personnage avant la fin du temps. Une mauvaise annonce termine la manche.</p>
      `;
    }
    return `
      <div class="separateur"></div>
      <p class="note-tour">Questions illimitées. Prends le temps de croiser les attributs.</p>
    `;
  }

  function htmlDerniereReponse(partie) {
    const derniere = partie.derniereQuestion;
    if (!derniere) return '';
    return `
      <div class="derniere-reponse">
        <span class="derniere-reponse__sceau${derniere.reponse ? '' : ' derniere-reponse__sceau--non'}">${derniere.reponse ? 'OUI' : 'NON'}</span>
        <span class="derniere-reponse__texte">
          <span class="derniere-reponse__question">${htmlEchappe(derniere.question)}</span>
          <span class="derniere-reponse__detail">
            ${partie.config.eliminationAuto
              ? `${derniere.elimines || 0} portrait${(derniere.elimines || 0) > 1 ? 's' : ''} écarté${(derniere.elimines || 0) > 1 ? 's' : ''}.`
              : 'Élimine maintenant les portraits qui ne correspondent pas.'}
          </span>
        </span>
      </div>
    `;
  }

  function htmlSuggestions(partie) {
    if (!state.partie) return '';
    const suggestions = creerSuggestion(partie);
    return `
      <div class="suggestions">
        ${suggestions
          .map(
            (critere) => `
              <button class="suggestion-question" data-action="question-choisir" data-cle="${htmlAttribut(critere.cle)}">
                <span class="suggestion-question__icone">${critere.icone}</span>
                <span class="suggestion-question__texte">${htmlEchappe(critere.question)}</span>
              </button>
            `
          )
          .join('')}
      </div>
    `;
  }

  function htmlBoutonQuestion(disabled, libelle) {
    return `
      <button class="btn btn--secondaire btn--bloc" data-action="question-ouvrir" ${disabled ? 'disabled' : ''}>
        ${icone('search')} ${libelle || 'Toutes les questions'}
      </button>
    `;
  }

  function htmlActionHotseat(partie) {
    const joueur = partie.joueurs[partie.active];
    const adversaire = partie.joueurs[partie.active === 0 ? 1 : 0];
    const aQuestion = Boolean(partie.questionCeTour);

    if (aQuestion && !partie.questionCeTour.reponse) {
      return `
        <div class="carte-panneau question-panneau">
          <div class="carte-panneau__entete">
            <span class="carte-panneau__titre"><span>${icone('question')}</span> Question en attente</span>
            <span class="puce">${htmlEchappe(adversaire.nom)}</span>
          </div>
          <p class="question-annonce" style="margin:12px 0 16px">${htmlEchappe(partie.questionCeTour.question)}</p>
          <p class="question-panneau__aide">La question a été posée. Tu peux consulter les fiches avant de recevoir la réponse, puis reprendre.</p>
          <button class="btn btn--primaire btn--bloc" data-action="repondre-question-attente">${icone('check')} Recevoir la réponse</button>
          <p class="note-tour">Le chronomètre du tour continue de tourner.</p>
        </div>
      `;
    }

    if (aQuestion) {
      return `
        <div class="carte-panneau question-panneau">
          <div class="carte-panneau__entete">
            <span class="carte-panneau__titre"><span>${icone('question')}</span> Réponse reçue</span>
            <span class="puce">${htmlEchappe(adversaire.nom)}</span>
          </div>
          ${htmlDerniereReponse(partie)}
          ${!partie.config.eliminationAuto ? `
            <button class="btn btn--secondaire btn--bloc" data-action="auto-eliminer">${icone('target')} Éliminer selon la réponse</button>
          ` : ''}
          <div class="actions-tour">
            <button class="btn btn--primaire btn--bloc" data-action="fin-tour-hotseat">Fin du tour ${icone('arrowRight')}</button>
            <button class="btn btn--fantome btn--bloc" data-action="deviner-ouvrir">${icone('trophy')} Deviner qui</button>
          </div>
          <p class="note-tour">Vérifie ton plateau puis passe la main. Une annonce erronée met fin à la manche.</p>
        </div>
      `;
    }

    return `
      <div class="carte-panneau question-panneau">
        <div class="carte-panneau__entete">
          <span class="carte-panneau__titre"><span>${icone('question')}</span> Poser une question</span>
          <span class="puce">${htmlEchappe(joueur.nom)}</span>
        </div>
        <h3 class="question-panneau__titre">À toi de questionner</h3>
        <p class="question-panneau__aide">Choisis un attribut. La question sera posée à <strong>${htmlEchappe(adversaire.nom)}</strong>, qui répondra honnêtement.</p>
        ${htmlSuggestions(partie)}
        ${htmlBoutonQuestion(false, 'Toutes les questions')}
        <div class="actions-tour">
          <button class="btn btn--fantome btn--bloc" data-action="deviner-ouvrir">${icone('trophy')} Deviner qui</button>
          <button class="btn btn--fantome btn--bloc" data-action="fin-tour-hotseat">Passer sans questionner</button>
        </div>
        <p class="note-tour">Une question maximum par tour. Tu peux consulter le journal à tout moment.</p>
      </div>
    `;
  }

  function htmlActionDuel(partie) {
    if (state.ui.pcReflexion) {
      return `
        <div class="carte-panneau question-panneau">
          <div class="carte-panneau__entete">
            <span class="carte-panneau__titre"><span>${icone('cpu')}</span> Le PC réfléchit</span>
          </div>
          <h3 class="question-panneau__titre">Analyse des candidats…</h3>
          <p class="question-panneau__aide">Il compare les attributs restants et prépare sa prochaine question.</p>
          <div class="chargement__barre"><span></span></div>
        </div>
      `;
    }

    if (partie.questionPoseeCeTour) {
      return `
        <div class="carte-panneau question-panneau">
          <div class="carte-panneau__entete">
            <span class="carte-panneau__titre"><span>${icone('question')}</span> Réponse reçue</span>
            <span class="puce">Le PC</span>
          </div>
          ${htmlDerniereReponse(partie)}
          ${!partie.config.eliminationAuto ? `
            <button class="btn btn--secondaire btn--bloc" data-action="auto-eliminer">${icone('target')} Éliminer selon la réponse</button>
          ` : ''}
          <div class="actions-tour">
            <button class="btn btn--primaire btn--bloc" data-action="fin-tour-duel">Au PC de jouer ${icone('cpu')}</button>
            <button class="btn btn--fantome btn--bloc" data-action="deviner-ouvrir">${icone('trophy')} Deviner le secret</button>
          </div>
          <p class="note-tour">Tu peux encore annoncer avant de laisser la main au PC. Une erreur lui offre la manche.</p>
        </div>
      `;
    }

    return `
      <div class="carte-panneau question-panneau">
        <div class="carte-panneau__entete">
          <span class="carte-panneau__titre"><span>${icone('question')}</span> Interroger le PC</span>
          <span class="puce">${htmlEchappe(DIFFICULTES[partie.config.difficulte].nom)}</span>
        </div>
        <h3 class="question-panneau__titre">À vous de questionner</h3>
        <p class="question-panneau__aide">Le PC connaît son secret et répond oui ou non. Il ne voit jamais le vôtre.</p>
        ${htmlSuggestions(partie)}
        ${htmlBoutonQuestion(false, 'Toutes les questions')}
        <div class="actions-tour">
          <button class="btn btn--fantome btn--bloc" data-action="deviner-ouvrir">${icone('trophy')} Deviner le secret</button>
          <button class="btn btn--fantome btn--bloc" data-action="fin-tour-duel">Laisser le PC interroger</button>
        </div>
        ${partie.config.bluff ? `<p class="note-tour">Variante bluff active : le PC peut mentir une fois dans la partie, au moment le plus déstabilisant.</p>` : ''}
      </div>
    `;
  }

  function htmlActionMystere(partie) {
    const peutQuestionner = Engine.peutPoserQuestionMystere(partie);
    if (!peutQuestionner) {
      return `
        <div class="carte-panneau question-panneau">
          <div class="carte-panneau__entete">
            <span class="carte-panneau__titre"><span>${icone('trophy')}</span> Il faut trancher</span>
          </div>
          <h3 class="question-panneau__titre">Plus de questions disponibles</h3>
          <p class="question-panneau__aide">Le budget est épuisé. Tu dois annoncer le personnage du PC. Une mauvaise réponse clôt l’enquête.</p>
          <div class="actions-tour">
            <button class="btn btn--primaire btn--large btn--bloc" data-action="deviner-ouvrir">${icone('trophy')} Annoncer le personnage</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="carte-panneau question-panneau">
        <div class="carte-panneau__entete">
          <span class="carte-panneau__titre"><span>${icone('search')}</span> Question d’enquête</span>
          <span class="puce">${htmlEchappe(libelleSousMode(partie.config.sousMode))}</span>
        </div>
        <h3 class="question-panneau__titre">Fais parler le PC</h3>
        <p class="question-panneau__aide">Chaque question est générée depuis les attributs du thème. Le PC répond par oui ou non.</p>
        ${htmlDerniereReponse(partie)}
        ${!partie.config.eliminationAuto && partie.derniereQuestion ? `
          <button class="btn btn--secondaire btn--bloc" data-action="auto-eliminer" style="margin-bottom:7px">${icone('target')} Éliminer selon la réponse</button>
        ` : ''}
        ${htmlSuggestions(partie)}
        ${htmlBoutonQuestion(false, 'Toutes les questions')}
        <div class="actions-tour">
          <button class="btn btn--primaire btn--bloc" data-action="deviner-ouvrir">${icone('trophy')} Je pense avoir trouvé</button>
        </div>
        ${!partie.config.eliminationAuto ? `<p class="note-tour">Élimination manuelle : clique les portraits qui ne peuvent plus être le secret.</p>` : ''}
      </div>
    `;
  }

  function htmlBarreMobile(partie) {
    let info = '';
    let actions = '';
    const bloque = state.ui.pcReflexion;
    if (partie.mode === 'hotseat') {
      const joueur = partie.joueurs[partie.active];
      const enAttente = Boolean(partie.questionCeTour && !partie.questionCeTour.reponse);
      info = `<strong>${htmlEchappe(joueur.nom)}</strong><span>${enAttente ? 'Question posée · réponse en attente' : partie.questionCeTour ? 'Réponse reçue · finis ton tour' : 'Choisis une question ou devine'}</span>`;
      if (enAttente) {
        actions = `<button class="btn btn--primaire" data-action="repondre-question-attente">Répondre</button>
           <button class="btn btn--secondaire" data-action="deviner-ouvrir">Deviner</button>`;
      } else if (partie.questionCeTour) {
        actions = `<button class="btn btn--primaire" data-action="fin-tour-hotseat">Fin du tour</button>
           <button class="btn btn--secondaire" data-action="deviner-ouvrir">Deviner</button>`;
      } else {
        actions = `<button class="btn btn--primaire" data-action="question-ouvrir" ${bloque ? 'disabled' : ''}>Question</button>
           <button class="btn btn--secondaire" data-action="deviner-ouvrir">Deviner</button>`;
      }
    } else if (partie.mode === 'duel') {
      info = `<strong>${bloque ? 'Le PC réfléchit…' : 'À vous de jouer'}</strong><span>${partie.questionPoseeCeTour ? 'Vous pouvez deviner ou laisser la main' : 'Une question, puis le PC interroge'}</span>`;
      actions = partie.questionPoseeCeTour
        ? `<button class="btn btn--primaire" data-action="fin-tour-duel" ${bloque ? 'disabled' : ''}>Au PC</button>
           <button class="btn btn--secondaire" data-action="deviner-ouvrir" ${bloque ? 'disabled' : ''}>Deviner</button>`
        : `<button class="btn btn--primaire" data-action="question-ouvrir" ${bloque ? 'disabled' : ''}>Question</button>
           <button class="btn btn--secondaire" data-action="deviner-ouvrir" ${bloque ? 'disabled' : ''}>Deviner</button>`;
    } else {
      const peut = Engine.peutPoserQuestionMystere(partie);
      info = `<strong>${peut ? 'À vous de questionner' : 'Annonce obligatoire'}</strong><span>${partie.questionCount} question${partie.questionCount > 1 ? 's' : ''} · ${Engine.candidatsRestants(partie, state.theme)} candidats</span>`;
      actions = peut
        ? `<button class="btn btn--primaire" data-action="question-ouvrir">Question</button>
           <button class="btn btn--secondaire" data-action="deviner-ouvrir">Deviner</button>`
        : `<button class="btn btn--primaire" data-action="deviner-ouvrir">${icone('trophy')} Annoncer</button>`;
    }
    return `
      <div class="barre-mobile">
        <div class="barre-mobile__info">${info}</div>
        <div class="barre-mobile__actions">${actions}</div>
      </div>
    `;
  }

  function vueJeu() {
    const partie = state.partie;
    if (!partie) {
      state.ecran = 'accueil';
      return vueAccueil();
    }
    let action = '';
    if (partie.mode === 'hotseat') action = htmlActionHotseat(partie);
    else if (partie.mode === 'duel') action = htmlActionDuel(partie);
    else action = htmlActionMystere(partie);

    return `
      <div class="jeu">
        <h1 class="visuellement-cache">Partie de Qui suis-je ? — ${htmlEchappe(MODES[partie.mode].titre)}</h1>
        ${htmlEnteteJeu(partie)}
        <main class="jeu__corps" id="contenu" tabindex="-1">
          <div class="zone-plateau">${htmlPlateau(partie)}</div>
          <aside class="jeu__lateral">
            ${htmlTour(partie)}
            ${htmlSecretJoueur(partie)}
            ${action}
          </aside>
        </main>
        ${htmlBarreMobile(partie)}
      </div>
    `;
  }

  function vuePassage() {
    const partie = state.partie;
    if (!partie || partie.phase !== 'passage') {
      setTimeout(() => synchroniserPartie(), 0);
      return `<div class="chargement"><p>Passation…</p></div>`;
    }
    const index = partie.passageVers == null ? autreIndex(partie.active) : partie.passageVers;
    const joueur = partie.joueurs[index];
    const motif = partie.motifPassage === 'temps' ? 'Le temps du tour est écoulé.' : 'Le tour est terminé.';
    return `
      <div class="ecran-secret">
        ${enTeteSimple({ actionMarque: 'quitter-partie' })}
        <main class="ecran-secret__contenu" id="contenu" tabindex="-1">
          <div class="passage-tour">
            <div class="passage-tour__jeton">J${index + 1}</div>
            <p class="surtitre">${motif}</p>
            <h2>Passe le PC à ${htmlEchappe(joueur.nom)}</h2>
            <p>
              Le plateau de ${htmlEchappe(joueur.nom)} va s’afficher. ${htmlEchappe(partie.joueurs[partie.active].nom)},
              ne regarde pas les cartes et ne révèle pas ton secret.
            </p>
            <button class="btn btn--primaire btn--large" data-action="passage-pret">
              Je suis prêt(e) ${icone('arrowRight')}
            </button>
          </div>
        </main>
      </div>
    `;
  }

  function autreIndex(index) {
    return index === 0 ? 1 : 0;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Résultats
  // ───────────────────────────────────────────────────────────────────────────

  function htmlRevelation(label, id) {
    const pers = personnage(id);
    if (!pers) return '';
    return `
      <div class="revelation-carte">
        <span class="revelation-carte__emoji" style="${stylePersonnage(pers)}">${htmlPortrait(pers)}</span>
        <span>
          <span class="revelation-carte__label">${htmlEchappe(label)}</span>
          <span class="revelation-carte__nom">${htmlEchappe(pers.nom)}</span>
        </span>
      </div>
    `;
  }

  function gererConfettisResultat() {
    const partie = state.partie;
    if (!partie || !partie.resultat) return;
    const cle = `${partie.id}-${partie.round}-resultat`;
    if (state.ui.confettiFaits.has(cle)) return;
    state.ui.confettiFaits.add(cle);
    const resultat = partie.resultat;
    const gagne =
      partie.mode === 'hotseat'
        ? true
        : partie.mode === 'duel'
          ? resultat.gagnant === 'joueur'
          : Boolean(resultat.gagne);
    if (gagne) lancerConfettis();
  }

  function vueResultat() {
    const partie = state.partie;
    if (!partie || !partie.resultat) {
      state.ecran = 'accueil';
      return vueAccueil();
    }
    const resultat = partie.resultat;
    const theme = state.theme;
    let perdu = false;
    let titre = '';
    let sceau = '✦';
    let sousTitre = resultat.raison;
    let scoreHtml = '';
    let revelations = '';
    let boutons = '';
    let noteBluff = '';

    if (partie.mode === 'hotseat') {
      const gagnant = resultat.gagnantIndex;
      titre = resultat.matchTermine
        ? `Victoire de ${resultat.gagnantNom}`
        : `Manche ${resultat.manche} pour ${resultat.gagnantNom}`;
      sceau = resultat.matchTermine ? icone('trophy') : '✦';
      scoreHtml = `
        <div class="score-final">
          <span class="score-final__nom">${htmlEchappe(resultat.secrets[0].joueur)}</span>
          <span class="score-final__chiffre${gagnant === 0 ? ' score-final__chiffre--gagnant' : ''}">${partie.scores[0]}</span>
          <span class="score-final__milieu">—</span>
          <span class="score-final__chiffre${gagnant === 1 ? ' score-final__chiffre--gagnant' : ''}">${partie.scores[1]}</span>
          <span class="score-final__nom">${htmlEchappe(resultat.secrets[1].joueur)}</span>
        </div>
      `;
      revelations = `
        <div class="resultat-revelations">
          ${htmlRevelation(`Secret de ${resultat.secrets[0].joueur}`, resultat.secrets[0].secretId)}
          ${htmlRevelation(`Secret de ${resultat.secrets[1].joueur}`, resultat.secrets[1].secretId)}
        </div>
      `;
      if (resultat.matchTermine) {
        boutons = `
          <button class="btn btn--primaire btn--large" data-action="rejouer">${icone('refresh')} Revanche</button>
          <button class="btn btn--secondaire" data-action="journal-ouvrir">${icone('journal')} Journal complet</button>
          <button class="btn btn--fantome" data-action="resultat-accueil">${icone('home')} Accueil</button>
        `;
      } else {
        boutons = `
          <button class="btn btn--primaire btn--large" data-action="manche-suivante">Manche suivante ${icone('arrowRight')}</button>
          <button class="btn btn--secondaire" data-action="journal-ouvrir">${icone('journal')} Journal</button>
          <button class="btn btn--fantome" data-action="resultat-accueil">Quitter</button>
        `;
      }
    }

    if (partie.mode === 'duel') {
      const gagne = resultat.gagnant === 'joueur';
      perdu = !gagne;
      titre = resultat.matchTermine
        ? gagne
          ? 'Victoire !'
          : 'Défaite'
        : gagne
          ? 'Manche gagnée'
          : 'Manche perdue';
      sceau = gagne ? icone('trophy') : '☠';
      scoreHtml = `
        <div class="score-final">
          <span class="score-final__nom">Vous</span>
          <span class="score-final__chiffre${gagne ? ' score-final__chiffre--gagnant' : ''}">${partie.scores.joueur}</span>
          <span class="score-final__milieu">—</span>
          <span class="score-final__chiffre${!gagne ? ' score-final__chiffre--gagnant' : ''}">${partie.scores.pc}</span>
          <span class="score-final__nom">Le PC</span>
        </div>
      `;
      revelations = `
        <div class="resultat-revelations">
          ${htmlRevelation('Votre personnage', resultat.secrets.joueur.id)}
          ${htmlRevelation('Le secret du PC', resultat.secrets.pc.id)}
        </div>
      `;
      if (resultat.matchTermine) {
        noteBluff =
          partie.config.bluff
            ? resultat.mensonge && resultat.mensonge.utilise
              ? `<div class="resultat-mensonge">Le PC a utilisé son <strong>unique bluff</strong> à la question ${resultat.mensonge.question} (manche ${resultat.mensonge.manche}).</div>`
              : `<div class="resultat-mensonge">Le PC n’a <strong>jamais utilisé</strong> son bluff durant cette partie.</div>`
            : '';
        boutons = `
          <button class="btn btn--primaire btn--large" data-action="rejouer">${icone('refresh')} Revanche</button>
          <button class="btn btn--secondaire" data-action="journal-ouvrir">${icone('journal')} Journal complet</button>
          <button class="btn btn--fantome" data-action="resultat-accueil">${icone('home')} Accueil</button>
        `;
      } else {
        boutons = `
          <button class="btn btn--primaire btn--large" data-action="manche-suivante">Manche suivante ${icone('arrowRight')}</button>
          <button class="btn btn--secondaire" data-action="journal-ouvrir">${icone('journal')} Journal</button>
          <button class="btn btn--fantome" data-action="resultat-accueil">Abandonner le duel</button>
        `;
      }
    }

    if (partie.mode === 'mystere') {
      const gagne = Boolean(resultat.gagne);
      perdu = !gagne;
      titre = gagne ? 'Trouvé !' : 'Enquête terminée';
      sceau = gagne ? icone('trophy') : icone('search');
      const statsSolo = state.stats.mystere;
      scoreHtml = `
        <div class="score-final">
          <span class="score-final__nom">${gagne ? 'Points gagnés' : 'Série terminée'}</span>
          <span class="score-final__chiffre${gagne ? ' score-final__chiffre--gagnant' : ''}">${gagne ? `+${resultat.score}` : '0'}</span>
          <span class="score-final__milieu">·</span>
          <span class="score-final__chiffre">${statsSolo.serieActuelle}</span>
          <span class="score-final__nom">série actuelle</span>
        </div>
      `;
      revelations = `
        <div class="resultat-revelations resultat-revelations--une">
          ${htmlRevelation('Le personnage du PC', resultat.secretId)}
        </div>
      `;
      boutons = gagne
        ? `
          <button class="btn btn--primaire btn--large" data-action="manche-suivante">Manche suivante ${icone('arrowRight')}</button>
          <button class="btn btn--secondaire" data-action="journal-ouvrir">${icone('journal')} Journal</button>
          <button class="btn btn--fantome" data-action="resultat-accueil">${icone('home')} Accueil</button>
        `
        : `
          <button class="btn btn--primaire btn--large" data-action="rejouer">${icone('refresh')} Nouvelle série</button>
          <button class="btn btn--secondaire" data-action="journal-ouvrir">${icone('journal')} Journal</button>
          <button class="btn btn--fantome" data-action="resultat-accueil">${icone('home')} Accueil</button>
        `;
    }

    const detailsSerie =
      partie.mode === 'mystere'
        ? `<div class="resultat-serie">
             <span>Questions : <strong>${resultat.questions}</strong></span>
             <span>·</span>
             <span>Durée : <strong>${U.formaterDuree(resultat.duree)}</strong></span>
             <span>·</span>
             <span>Meilleure série : <strong>${state.stats.mystere.meilleureSerie}</strong></span>
             <span>·</span>
             <span>Meilleur score : <strong>${state.stats.mystere.meilleurScore}</strong></span>
           </div>`
        : '';

    return `
      <div class="ecran-resultat">
        ${enTeteSimple({ actionMarque: 'resultat-accueil' })}
        <main class="resultat-contenu" id="contenu" tabindex="-1">
          <section class="resultat-banniere${perdu ? ' resultat-banniere--perdu' : ''}">
            <div class="resultat-banniere__sceau">${sceau}</div>
            <p class="surtitre" style="justify-content:center">${htmlEchappe(theme.nom)} · ${partie.mode === 'mystere' ? libelleSousMode(resultat.sousMode) : `Manche ${resultat.manche}`}</p>
            <h1>${htmlEchappe(titre)}</h1>
            <p class="resultat-banniere__raison">${htmlEchappe(sousTitre)}</p>
            ${scoreHtml}
            ${revelations}
            ${noteBluff}
            ${detailsSerie}
            <div class="resultat-actions">${boutons}</div>
          </section>
          <p class="resultat-serie" style="margin-top:16px">
            Le journal de la partie reste accessible. Les scores sont enregistrés uniquement sur cet appareil.
          </p>
        </main>
      </div>
    `;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Modales
  // ───────────────────────────────────────────────────────────────────────────

  function sauverFocus() {
    if (document.activeElement && document.activeElement !== document.body) {
      state.ui.focusPrecedent = document.activeElement;
    }
  }

  function restaurerFocus() {
    const element = state.ui.focusPrecedent;
    state.ui.focusPrecedent = null;
    if (element && document.contains(element) && typeof element.focus === 'function') {
      window.setTimeout(() => element.focus({ preventScroll: true }), 0);
    }
  }

  function ouvrirModale(type, donnees) {
    const etaitOuverte = Boolean(state.ui.modale);
    if (!etaitOuverte) {
      sauverFocus();
      pauseTimer();
    }
    state.ui.modale = { type, ...(donnees || {}) };
    document.body.classList.add('est-fige');
    rendreModale();
  }

  function remplacerModale(type, donnees) {
    const etaitOuverte = Boolean(state.ui.modale);
    if (!etaitOuverte) {
      sauverFocus();
      pauseTimer();
    }
    state.ui.modale = { type, ...(donnees || {}) };
    document.body.classList.add('est-fige');
    rendreModale();
  }

  function fermerModale(options) {
    const opts = options || {};
    if (!state.ui.modale) return;
    const etaitNonClosable = Boolean(state.ui.modale.nonClosable);
    state.ui.modale = null;
    modaleEl.hidden = true;
    modaleEl.innerHTML = '';
    document.body.classList.remove('est-fige');
    appEl.inert = false;
    if (!opts.sansReprise) reprendreTimer();
    if (!opts.silencieux) restaurerFocus();
    return etaitNonClosable;
  }

  function rendreModale() {
    if (!state.ui.modale) {
      modaleEl.hidden = true;
      modaleEl.innerHTML = '';
      document.body.classList.remove('est-fige');
      appEl.inert = false;
      return;
    }

    const conf = configurationModale(state.ui.modale);
    if (!conf) {
      fermerModale();
      return;
    }
    modaleEl.hidden = false;
    modaleEl.innerHTML = `
      ${conf.fermable
        ? '<button class="modale__fond" data-action="fermer-modale" tabindex="-1" aria-label="Fermer la fenêtre"></button>'
        : '<div class="modale__fond" aria-hidden="true"></div>'}
      <div class="modale ${conf.classe || ''}" role="dialog" aria-modal="true" aria-labelledby="titre-modale">
        <header class="modale__entete">
          <div>
            <h2 id="titre-modale">${htmlEchappe(conf.titre)}</h2>
            ${conf.sousTitre ? `<p>${htmlEchappe(conf.sousTitre)}</p>` : ''}
          </div>
          ${conf.fermable ? `<button class="modale__fermer" data-action="fermer-modale" aria-label="Fermer">${icone('close')}</button>` : ''}
        </header>
        <div class="modale__corps">${conf.corps}</div>
        ${conf.pied ? `<footer class="modale__pied ${conf.piedClasse || ''}">${conf.pied}</footer>` : ''}
      </div>
    `;
    document.body.classList.add('est-fige');
    appEl.inert = true;
    const cible = modaleEl.querySelector('[data-autofocus]') || modaleEl.querySelector('.modale__fermer') || modaleEl.querySelector('button');
    if (cible) {
      window.setTimeout(() => {
        if (document.contains(cible)) cible.focus({ preventScroll: true });
      }, 30);
    }
  }

  function configurationModale(modale) {
    if (modale.type === 'questions') return modaleQuestions();
    if (modale.type === 'reponse-hotseat') return modaleReponseHotseat(modale);
    if (modale.type === 'reponse-pc') return modaleReponsePC(modale);
    if (modale.type === 'question-pc') return modaleQuestionPC();
    if (modale.type === 'annonce-pc') return modaleAnnoncePC();
    if (modale.type === 'deviner') return modaleDeviner();
    if (modale.type === 'fiche') return modaleFiche(modale);
    if (modale.type === 'journal') return modaleJournal();
    if (modale.type === 'aide') return modaleAide();
    if (modale.type === 'stats') return modaleStats();
    if (modale.type === 'quitter') return modaleQuitter();
    if (modale.type === 'installation') return modaleInstallation();
    if (modale.type === 'reset-stats') return modaleResetStats();
    return null;
  }

  function modaleQuestions() {
    const partie = state.partie;
    if (!partie) return null;
    return {
      fermable: true,
      classe: 'modale--large',
      titre: 'Choisir une question',
      sousTitre: 'Les questions sont générées à partir des attributs, jamais en texte libre.',
      corps: `
        <div class="groupes-questions">
          ${state.theme.criteresParCategorie
            .map(
              (categorie) => `
                <section>
                  <h3 class="groupe-questions__titre"><span>${categorie.icone}</span> ${htmlEchappe(categorie.nom)}</h3>
                  <div class="grille-questions">
                    ${categorie.criteres
                      .map(
                        (critere) => `
                          <button class="bouton-question" data-action="question-choisir" data-cle="${htmlAttribut(critere.cle)}">
                            <span class="bouton-question__icone">${critere.icone}</span>
                            <span>${htmlEchappe(critere.question)}</span>
                          </button>
                        `
                      )
                      .join('')}
                  </div>
                </section>
              `
            )
            .join('')}
        </div>
      `,
      pied: `<span class="modale__note">${partie.mode === 'hotseat' ? 'Une question par tour.' : 'Chaque question consomme un tour.'}</span><button class="btn btn--fantome btn--petit" data-action="fermer-modale">Annuler</button>`,
      piedClasse: 'modale__pied--entre'
    };
  }

  function modaleReponseHotseat() {
    const partie = state.partie;
    if (!partie || !partie.questionCeTour) return null;
    const adversaire = partie.joueurs[partie.active === 0 ? 1 : 0];
    return {
      fermable: true,
      classe: 'modale--etroite',
      titre: 'Réponse de l’adversaire',
      sousTitre: `${adversaire.nom} répond honnêtement à la question.`,
      corps: `
        <p class="question-annonce">${htmlEchappe(partie.questionCeTour.question)}</p>
        <div class="reponse-boutons">
          <button class="reponse-btn reponse-btn--oui" data-action="repondre-hotseat" data-reponse="oui">
            <span class="reponse-btn__symbole">✓</span>
            Oui
            <small>Le personnage possède cet attribut</small>
          </button>
          <button class="reponse-btn reponse-btn--non" data-action="repondre-hotseat" data-reponse="non">
            <span class="reponse-btn__symbole">✕</span>
            Non
            <small>Il ne le possède pas</small>
          </button>
        </div>
        <p class="modale__note" style="text-align:center;margin:16px 0 0">
          En cas de doute, ferme cette fenêtre et consulte la fiche d’un personnage. La question restera en attente.
        </p>
      `
    };
  }

  function modaleReponsePC(modale) {
    return {
      fermable: true,
      classe: 'modale--etroite',
      titre: 'Le PC répond',
      sousTitre: 'La réponse est appliquée à votre plateau de déduction.',
      corps: `
        <p class="question-annonce">${htmlEchappe(modale.question)}</p>
        <div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:2px 0 5px">
          <span class="resultat-banniere__sceau" style="margin:0;width:76px;height:76px;min-width:0;font-size:1.28rem;${modale.reponse ? '' : 'background:#54616e;border-color:rgba(255,255,255,.2);box-shadow:0 7px 0 #2a323b;color:#fff'}">
            ${modale.reponse ? 'OUI' : 'NON'}
          </span>
          <p class="objectif-texte" style="text-align:center">
            ${!modale.eliminationAuto
              ? 'Élimination manuelle : écarte les portraits qui ne correspondent plus, puis continue ton tour.'
              : modale.elimines > 0
                ? `${modale.elimines} portrait${modale.elimines > 1 ? 's' : ''} ${modale.elimines > 1 ? 'ont' : 'a'} été écarté${modale.elimines > 1 ? 's' : ''}.`
                : 'Aucun portrait supplémentaire n’a pu être écarté automatiquement.'}
          </p>
        </div>
      `,
      pied: `<span class="modale__note">Tu peux maintenant éliminer, deviner ou laisser le PC interroger.</span><button class="btn btn--primaire btn--petit" data-action="fermer-modale" data-autofocus>Continuer</button>`,
      piedClasse: 'modale__pied--entre'
    };
  }

  function modaleQuestionPC() {
    const partie = state.partie;
    if (!partie || !partie.questionPC) return null;
    return {
      fermable: false,
      classe: 'modale--etroite',
      titre: 'Le PC vous interroge',
      sousTitre: 'Répondez honnêtement : sa déduction en dépend.',
      corps: `
        <div class="dialogue-pc">
          <div class="dialogue-pc__avatar">${icone('cpu')}</div>
          <div class="dialogue-pc__texte">
            <strong>Le PC analyse ses hypothèses</strong>
            <span>${partie.pcCandidats.length} profil${partie.pcCandidats.length > 1 ? 's' : ''} encore possible${partie.pcCandidats.length > 1 ? 's' : ''} de votre côté.</span>
          </div>
        </div>
        <p class="question-annonce">${htmlEchappe(partie.questionPC.question)}</p>
        <div class="reponse-boutons">
          <button class="reponse-btn reponse-btn--oui" data-action="question-pc-repondre" data-reponse="oui" data-autofocus>
            <span class="reponse-btn__symbole">✓</span>
            Oui
            <small>Votre personnage possède cet attribut</small>
          </button>
          <button class="reponse-btn reponse-btn--non" data-action="question-pc-repondre" data-reponse="non">
            <span class="reponse-btn__symbole">✕</span>
            Non
            <small>Il ne le possède pas</small>
          </button>
        </div>
      `
    };
  }

  function modaleAnnoncePC() {
    const partie = state.partie;
    if (!partie || !partie.annoncePC) return null;
    const pers = personnage(partie.annoncePC);
    if (!pers) return null;
    return {
      fermable: false,
      classe: 'modale--etroite',
      titre: 'Le PC annonce',
      sousTitre: 'Il ne lui reste qu’un seul candidat.',
      corps: `
        <div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding:8px 0 2px">
          <div class="carte-tiree" style="${stylePersonnage(pers)};width:185px;transform:rotate(-1deg);margin-bottom:18px">
            <div class="carte-tiree__emoji">${htmlPortrait(pers, { eager: true })}</div>
            <div class="carte-tiree__nom" style="color:#fff">${htmlEchappe(pers.nom)}</div>
          </div>
          <p class="objectif-texte" style="max-width:390px">
            « Votre personnage secret est <strong>${htmlEchappe(pers.nom)}</strong>. »
            ${partie.pcCandidats.length === 1 ? 'La déduction est complète.' : 'Il tente sa dernière chance.'}
          </p>
        </div>
      `,
      pied: `<span class="modale__note">La manche se termine à l’annonce du PC.</span><button class="btn btn--primaire btn--petit" data-action="pc-annonce-continuer" data-autofocus>Voir le résultat</button>`,
      piedClasse: 'modale__pied--entre'
    };
  }

  function modaleDeviner() {
    const partie = state.partie;
    if (!partie) return null;
    let avertissement = 'Une erreur peut mettre fin à la manche.';
    if (partie.mode === 'hotseat') avertissement = 'Attention : une mauvaise annonce est une défaite immédiate.';
    if (partie.mode === 'duel') avertissement = 'Attention : une mauvaise annonce offre la manche au PC.';
    if (partie.mode === 'mystere' && partie.config.sousMode === 'vies') {
      avertissement = `Une erreur coûte une vie. Il t’en reste ${partie.viesRestantes}.`;
    }
    if (partie.mode === 'mystere' && partie.config.sousMode !== 'vies') {
      avertissement = 'Une mauvaise annonce termine l’enquête.';
    }
    const choix = state.ui.devineChoix ? personnage(state.ui.devineChoix) : null;
    const plateau = Engine.plateauActif(partie);
    return {
      fermable: true,
      classe: 'modale--large',
      titre: 'Deviner qui',
      sousTitre: avertissement,
      corps: `
        <div class="grille-devine">
          ${state.theme.personnages
            .map((pers) => {
              const eliminee = plateau.has(pers.id);
              const selectionnee = state.ui.devineChoix === pers.id;
              return `
                <button class="devine-carte${selectionnee ? ' est-choisie' : ''}${eliminee ? ' est-eliminee' : ''}" data-action="devine-choisir" data-id="${pers.id}" aria-pressed="${selectionnee}">
                  <span class="devine-carte__emoji">${htmlPortrait(pers)}</span>
                  <span class="devine-carte__nom">${htmlEchappe(pers.nom)}</span>
                </button>
              `;
            })
            .join('')}
        </div>
        ${choix ? `
          <div class="devine-selection">
            <span class="devine-selection__emoji">${htmlPortrait(choix)}</span>
            <span>Tu vas annoncer <strong>${htmlEchappe(choix.nom)}</strong>.</span>
          </div>
        ` : `<p class="modale__note" style="text-align:center;margin:16px 0 0">Sélectionne un portrait, puis confirme ton annonce.</p>`}
      `,
      pied: `
        <span class="modale__note">Les portraits grisés sont déjà écartés de ton plateau.</span>
        <button class="btn btn--fantome btn--petit" data-action="fermer-modale">Annuler</button>
        <button class="btn btn--primaire" data-action="deviner-confirmer" ${choix ? '' : 'disabled'}>${icone('trophy')} Annoncer</button>
      `,
      piedClasse: 'modale__pied--entre'
    };
  }

  function modaleFiche(modale) {
    const partie = state.partie;
    const pers = personnage(modale.id);
    if (!pers || !partie) return null;
    const plateau = Engine.plateauActif(partie);
    const eliminee = plateau.has(pers.id);
    const details = state.theme.detailsPersonnage(pers);
    return {
      fermable: true,
      classe: 'modale--large',
      titre: 'Fiche du personnage',
      sousTitre: 'Tous les attributs sont objectifs. Ils servent aussi d’arbitrage en cas de dispute.',
      corps: `
        <div class="fiche-personnage">
          <div class="fiche-personnage__portrait" style="${stylePersonnage(pers)}">
            <span class="fiche-personnage__code">${codeDe(pers.id)}</span>
            ${htmlPortrait(pers, { eager: true })}
          </div>
          <div>
            <div class="fiche-personnage__entete">
              <h3>${htmlEchappe(pers.nom)}</h3>
              <p>${htmlEchappe(state.theme.nom)} · ${eliminee ? 'Portrait écarté' : 'Portrait actif'}</p>
            </div>
            <ul class="liste-attributs">
              ${details
                .map(
                  (detail) => `
                    <li class="attribut-fiche">
                      <span class="attribut-fiche__icone">${detail.icone}</span>
                      <span class="attribut-fiche__texte">
                        <span class="attribut-fiche__nom">${htmlEchappe(detail.nom)}</span>
                        <span class="attribut-fiche__valeur${detail.estBooleen ? (detail.positif ? ' attribut-fiche__valeur--oui' : ' attribut-fiche__valeur--non') : ''}">${htmlEchappe(detail.valeur)}</span>
                      </span>
                    </li>
                  `
                )
                .join('')}
            </ul>
          </div>
        </div>
      `,
      pied: `
        <span class="modale__note">${eliminee ? 'Ce portrait est actuellement écarté.' : 'Ce portrait est encore candidat.'}</span>
        <button class="btn btn--secondaire btn--petit" data-action="fermer-modale">Fermer</button>
        <button class="btn ${eliminee ? 'btn--secondaire' : 'btn--danger'} btn--petit" data-action="fiche-basculer" data-id="${pers.id}">
          ${eliminee ? 'Réintégrer' : 'Éliminer ce portrait'}
        </button>
      `,
      piedClasse: 'modale__pied--entre'
    };
  }

  function modaleJournal() {
    const partie = state.partie;
    if (!partie) return null;
    const groupes = new Map();
    for (const entree of partie.journal) {
      const cle = entree.manche || 1;
      if (!groupes.has(cle)) groupes.set(cle, []);
      groupes.get(cle).push(entree);
    }

    const htmlEntree = (entree) => {
      if (entree.type === 'info') {
        return `<div class="journal-ligne journal-ligne--info"><span class="journal-ligne__numero">${entree.numero}</span><span>${htmlEchappe(entree.question)}</span></div>`;
      }
      const badge =
        entree.reponse === null || entree.reponse === undefined
          ? ''
          : `<span class="journal-ligne__reponse journal-ligne__reponse--${entree.reponse ? 'oui' : 'non'}">${entree.reponse ? 'Oui' : 'Non'}</span>`;
      return `
        <div class="journal-ligne${entree.type === 'annonce' ? ' journal-ligne--annonce' : ''}">
          <span class="journal-ligne__numero">${entree.numero}</span>
          <div class="journal-ligne__corps">
            <div class="journal-ligne__auteur">
              <strong>${htmlEchappe(entree.auteurNom || '—')}</strong>
              ${entree.cibleNom ? `<span>→ ${htmlEchappe(entree.cibleNom)}</span>` : ''}
              ${badge}
            </div>
            <p class="journal-ligne__question">${htmlEchappe(entree.question)}</p>
          </div>
        </div>
      `;
    };

    const contenu =
      partie.journal.length === 0
        ? `<p class="journal-vide">Le journal est encore vide. Pose ta première question pour l’ouvrir.</p>`
        : Array.from(groupes.entries())
            .map(
              ([manche, entrees]) => `
                <section class="journal-groupe">
                  <h3 class="journal-groupe__titre">Manche ${manche}</h3>
                  <div class="journal-liste">${entrees.map(htmlEntree).join('')}</div>
                </section>
              `
            )
            .join('');

    return {
      fermable: true,
      classe: 'modale--large',
      titre: 'Journal de la partie',
      sousTitre: 'Toutes les questions et réponses, dans l’ordre. Consultable à tout moment.',
      corps: `
        <div class="journal-resume">
          <span class="puce">${icone('question')} ${partie.questionCount} question${partie.questionCount > 1 ? 's' : ''}</span>
          <span class="puce">${partie.journal.filter((entree) => entree.type === 'annonce').length} annonce${partie.journal.filter((entree) => entree.type === 'annonce').length > 1 ? 's' : ''}</span>
          <span class="puce">${htmlEchappe(state.theme.nom)}</span>
        </div>
        ${contenu}
      `,
      pied: `<span class="modale__note">Le journal ne révèle jamais un secret non annoncé.</span><button class="btn btn--secondaire btn--petit" data-action="fermer-modale">Fermer</button>`,
      piedClasse: 'modale__pied--entre'
    };
  }

  function modaleAide() {
    return {
      fermable: true,
      classe: 'modale--large',
      titre: 'Règles et aide',
      sousTitre: 'Tout ce qu’il faut savoir avant de retourner au plateau.',
      corps: `
        <div class="aide-grille">
          <section class="aide-bloc">
            <h3>${icone('search')} Le principe</h3>
            <p>Chaque personnage possède des attributs objectifs. Une question ne porte que sur un attribut : on répond toujours par oui ou non. Le but est d’isoler un seul portrait, puis de l’annoncer.</p>
          </section>
          <section class="aide-bloc">
            <h3>${icone('users')} Deux joueurs</h3>
            <p>Chacun choisit un secret à l’abri des regards (choix, hasard ou code). Le plateau de déduction est séparé par joueur. À tour de rôle, posez une question, éliminez, puis passez la main. Une mauvaise annonce perd la manche.</p>
          </section>
          <section class="aide-bloc">
            <h3>${icone('cpu')} Duel contre le PC</h3>
            <p>Vous interrogez le PC sur son secret. Il vous interroge sur le vôtre. Le PC conserve les candidats compatibles et choisit la question qui coupe le plus ses hypothèses en deux. En difficile, il peut bluffer une seule fois.</p>
          </section>
          <section class="aide-bloc">
            <h3>${icone('eye')} Mystère solo</h3>
            <p>Le PC répond à toutes vos questions mais n’en pose aucune. Les sous-modes ajoutent une contrainte : questions limitées, vies, chrono. Les victoires consécutives forment une série persistante.</p>
          </section>
          <section class="aide-bloc">
            <h3>${icone('journal')} Le plateau et le journal</h3>
            <p>Clique une carte pour afficher sa fiche complète : c’est l’arbitrage officiel en cas de désaccord. La croix écarte un portrait. Le journal garde la trace de toutes les questions et réponses.</p>
          </section>
          <section class="aide-bloc">
            <h3>${icone('install')} Installation et hors-ligne</h3>
            <p>Utilisez « Installer » depuis un serveur local (<code>localhost</code>) ou un hébergement statique. L’application et les ${Themes.modeles.length} thèmes sont alors mis en cache et fonctionnent sans réseau. En ouverture directe du fichier, le jeu fonctionne, mais l’installation PWA n’est pas disponible.</p>
          </section>
        </div>
        <div class="aide-bloc" style="margin-top:12px">
          <h3>${icone('spark')} Astuces</h3>
          <ul>
            <li>Une question sur un attribut rare peut éliminer beaucoup de portraits d’un coup.</li>
            <li>Le compteur de candidats vous indique combien de portraits restent réellement en course.</li>
            <li>Le bouton « Élimination rapide » transforme le clic sur une vignette en élimination directe.</li>
            <li>La touche <span class="touche">Échap</span> ferme les fenêtres qui peuvent l’être.</li>
          </ul>
        </div>
      `,
      pied: `<button class="btn btn--secondaire btn--petit" data-action="ouvrir-stats">${icone('trophy')} Mes scores</button><button class="btn btn--primaire btn--petit" data-action="fermer-modale" data-autofocus>Compris</button>`,
      piedClasse: 'modale__pied--entre'
    };
  }

  function modaleStats() {
    const stats = state.stats;
    return {
      fermable: true,
      classe: 'modale--large',
      titre: 'Votre carnet d’enquête',
      sousTitre: 'Scores et séries stockés uniquement dans ce navigateur.',
      corps: `
        <div class="bande-stats" style="margin-top:0">
          <div class="bande-stats__intro">
            <strong>${stats.total.parties} partie${stats.total.parties > 1 ? 's' : ''} terminée${stats.total.parties > 1 ? 's' : ''}</strong>
            <p>${stats.total.victoires} victoire${stats.total.victoires > 1 ? 's' : ''} · ${stats.total.defaites} défaite${stats.total.defaites > 1 ? 's' : ''}</p>
          </div>
          <div class="bande-stats__case">
            <span class="bande-stats__valeur">${stats.mystere.meilleureSerie}</span>
            <span>meilleure série</span>
          </div>
          <div class="bande-stats__case">
            <span class="bande-stats__valeur">${stats.mystere.meilleurScore}</span>
            <span>meilleur score solo</span>
          </div>
          <div class="bande-stats__case">
            <span class="bande-stats__valeur">${stats.duel.victoires}</span>
            <span>duels gagnés</span>
          </div>
        </div>
        <div class="aide-grille" style="margin-top:16px">
          <section class="aide-bloc">
            <h3>Duel contre le PC</h3>
            <ul>
              <li><strong>${stats.duel.matchs}</strong> match(s) · ${stats.duel.victoires} victoire(s) · ${stats.duel.defaites} défaite(s)</li>
              <li>Facile : ${stats.duel.parDifficulte.facile.victoires} / ${stats.duel.parDifficulte.facile.matchs}</li>
              <li>Moyen : ${stats.duel.parDifficulte.moyen.victoires} / ${stats.duel.parDifficulte.moyen.matchs}</li>
              <li>Difficile : ${stats.duel.parDifficulte.difficile.victoires} / ${stats.duel.parDifficulte.difficile.matchs}</li>
            </ul>
          </section>
          <section class="aide-bloc">
            <h3>Mode mystère</h3>
            <ul>
              <li>${stats.mystere.victoires} enquête(s) résolue(s) sur ${stats.mystere.manches}</li>
              <li>Série actuelle : ${stats.mystere.serieActuelle} · score de série : ${stats.mystere.scoreSerie}</li>
              <li>Libre : ${stats.mystere.parMode.libre.victoires} / ${stats.mystere.parMode.libre.manches}</li>
              <li>Compteur : ${stats.mystere.parMode.questions.victoires} / ${stats.mystere.parMode.questions.manches}</li>
              <li>Vies : ${stats.mystere.parMode.vies.victoires} / ${stats.mystere.parMode.vies.manches}</li>
              <li>Chrono : ${stats.mystere.parMode.chrono.victoires} / ${stats.mystere.parMode.chrono.manches}</li>
            </ul>
          </section>
          <section class="aide-bloc">
            <h3>Deux joueurs</h3>
            <ul>
              <li>${stats.hotseat.matchs} match(s) terminé(s)</li>
              <li>${stats.hotseat.manches} manche(s) jouée(s)</li>
              <li>Points J1 : ${stats.hotseat.pointsJ1} · Points J2 : ${stats.hotseat.pointsJ2}</li>
            </ul>
          </section>
          <section class="aide-bloc">
            <h3>Stockage</h3>
            <p>${Storage.disponible() ? 'localStorage est disponible. Les scores survivent au rechargement.' : 'Le stockage local est indisponible : les scores ne seront pas conservés après fermeture.'}</p>
          </section>
        </div>
      `,
      pied: `<button class="btn btn--danger btn--petit" data-action="demander-reset-stats">Réinitialiser les scores</button><button class="btn btn--primaire btn--petit" data-action="fermer-modale">Fermer</button>`,
      piedClasse: 'modale__pied--entre'
    };
  }

  function modaleQuitter() {
    return {
      fermable: true,
      classe: 'modale--etroite',
      titre: 'Quitter la partie ?',
      sousTitre: 'La manche en cours sera perdue.',
      corps: `
        <p class="confirmation-texte">
          Toute progression non terminée sera abandonnée. Les scores déjà validés restent enregistrés sur cet appareil.
        </p>
      `,
      pied: `<button class="btn btn--secondaire btn--petit" data-action="fermer-modale" data-autofocus>Reprendre</button><button class="btn btn--danger btn--petit" data-action="confirmer-quitter">Quitter</button>`
    };
  }

  function modaleInstallation() {
    const ios = U.estIOS();
    const installee = U.estStandalone();
    return {
      fermable: true,
      classe: 'modale--etroite',
      titre: installee ? 'Application installée' : 'Installer l’application',
      sousTitre: 'Une page, un service worker, aucun serveur applicatif.',
      corps: ios
        ? `
          <div class="aide-bloc">
            <h3>Sur iPhone / iPad</h3>
            <ol style="padding-left:18px;color:var(--texte-doux);font-size:.8rem;line-height:1.7">
              <li>Ouvre le jeu dans <strong>Safari</strong>.</li>
              <li>Appuie sur le bouton <strong>Partager</strong>.</li>
              <li>Choisis <strong>Sur l’écran d’accueil</strong>, puis <strong>Ajouter</strong>.</li>
            </ol>
          </div>
        `
        : `
          <div class="aide-bloc">
            <h3>Chrome, Edge ou Chromium</h3>
            <p>Clique sur l’icône d’installation dans la barre d’adresse, ou ouvre le menu du navigateur puis choisis <strong>Installer Qui suis-je ?</strong>.</p>
            <p>L’installation n’est proposée que depuis <code>http://localhost</code>, <code>https://</code> ou un hébergement statique. L’ouverture directe du fichier <code>index.html</code> fait fonctionner le jeu, mais pas le mode PWA.</p>
          </div>
        `,
      pied: `
        <span class="modale__note">Le jeu complet est mis en cache pour une utilisation hors-ligne.</span>
        ${state.ui.installPrompt && !installee ? '<button class="btn btn--primaire btn--petit" data-action="installer">Installer</button>' : ''}
        <button class="btn btn--secondaire btn--petit" data-action="fermer-modale">Fermer</button>
      `,
      piedClasse: 'modale__pied--entre'
    };
  }

  function modaleResetStats() {
    return {
      fermable: true,
      classe: 'modale--etroite',
      titre: 'Réinitialiser les scores ?',
      sousTitre: 'Cette action est définitive.',
      corps: `<p class="confirmation-texte">Tous les scores, séries, records et statistiques locales seront effacés. Le thème choisi et les options ne sont pas concernés.</p>`,
      pied: `<button class="btn btn--secondaire btn--petit" data-action="fermer-modale" data-autofocus>Annuler</button><button class="btn btn--danger btn--petit" data-action="confirmer-reset-stats">Tout effacer</button>`
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Actions de jeu
  // ───────────────────────────────────────────────────────────────────────────

  function lancerPartieDepuisConfiguration() {
    capturerConfiguration();
    const config = state.config;
    const mode = state.modeActif;
    if (!config || !mode) return;

    const r = state.reglages;
    r.themeId = state.theme.id;
    r.manches = config.manches;
    r.timerActif = config.timerActif;
    r.dureeTour = config.dureeTour;
    r.eliminationAuto = config.eliminationAuto;
    r.methodeSecret = config.methodeSecret;
    r.difficulte = config.difficulte;
    r.bluff = config.bluff;
    r.modeMystere = config.modeMystere;
    r.budgetQuestions = config.budgetQuestions;
    r.dureeChrono = config.dureeChrono;
    Storage.sauverReglages(r);
    state.reglages = r;

    arreterTimer();
    state.ui.modale = null;
    modaleEl.hidden = true;
    modaleEl.innerHTML = '';
    document.body.classList.remove('est-fige');
    state.ui.eliminationRapide = false;
    state.ui.devineChoix = null;
    state.ui.suggestionsCache = null;
    state.ui.pcReflexion = false;
    state.ui.secret = null;
    state.ui.animationsElimination.clear();
    state.ui.confettiFaits.clear();

    if (mode === 'hotseat') {
      const joueurs = [config.nomJ1.trim() || 'Joueur 1', config.nomJ2.trim() || 'Joueur 2'];
      const configHotseat = {
        manches: Number(config.manches) || 3,
        timerActif: Boolean(config.timerActif),
        dureeTour: Number(config.dureeTour) || 60,
        eliminationAuto: Boolean(config.eliminationAuto),
        methodeSecret: config.methodeSecret
      };
      state.partie = Engine.creerHotseat({ joueurs, config: configHotseat }, state.theme);
      state.ecran = 'secrets';
      initialiserSecretUI();
      rendre({ deplacerHaut: true });
      return;
    }

    if (mode === 'duel') {
      const configDuel = {
        difficulte: config.difficulte,
        bluff: Boolean(config.bluff && config.difficulte === 'difficile'),
        manches: Number(config.manches) || 3,
        timerActif: Boolean(config.timerActif),
        dureeTour: Number(config.dureeTour) || 60,
        eliminationAuto: Boolean(config.eliminationAuto),
        methodeSecret: config.methodeSecret
      };
      state.partie = Engine.creerDuel(
        { nomJoueur: config.nomJoueur.trim() || 'Détective', config: configDuel },
        state.theme
      );
      state.ecran = 'secrets';
      initialiserSecretUI();
      rendre({ deplacerHaut: true });
      return;
    }

    const configMystere = {
      sousMode: config.modeMystere,
      budget: Number(config.budgetQuestions) || 8,
      dureeChrono: Number(config.dureeChrono) || 90,
      eliminationAuto: Boolean(config.eliminationAuto),
      timerActif: Boolean(config.timerActif),
      dureeTour: Number(config.dureeTour) || 60
    };
    state.partie = Engine.creerMystere({ config: configMystere }, state.theme);
    state.ecran = 'jeu';
    rendre({ deplacerHaut: true });
    demarrerTourSiPossible();
    toast(`Enquête ${libelleSousMode(configMystere.sousMode)} lancée.`, 'info');
  }

  function questionPossible() {
    const partie = state.partie;
    if (!partie || partie.phase !== 'game' || state.ui.pcReflexion) return false;
    if (partie.mode === 'hotseat') return !partie.questionCeTour;
    if (partie.mode === 'duel') return !partie.questionPoseeCeTour;
    if (partie.mode === 'mystere') return Engine.peutPoserQuestionMystere(partie);
    return false;
  }

  function ouvrirChoixQuestion() {
    if (!questionPossible()) {
      toast('Tu ne peux pas poser d’autre question pour le moment.', 'info');
      return;
    }
    ouvrirModale('questions');
  }

  function poserQuestion(cle) {
    const partie = state.partie;
    if (!partie || !questionPossible()) {
      toast('Cette question n’est pas disponible maintenant.', 'info');
      return;
    }

    if (partie.mode === 'hotseat') {
      const critere = Engine.questionHotseat(partie, state.theme, cle);
      if (!critere) {
        toast('Cette question ne peut pas être posée.', 'erreur');
        return;
      }
      remplacerModale('reponse-hotseat', { cle, question: critere.question });
      return;
    }

    if (partie.mode === 'duel') {
      const resultat = Engine.questionDuel(partie, state.theme, cle);
      if (!resultat) {
        toast('Cette question ne peut pas être posée.', 'erreur');
        return;
      }
      remplacerModale('reponse-pc', {
        question: resultat.critere.question,
        reponse: resultat.reponse,
        elimines: resultat.elimines,
        eliminationAuto: partie.config.eliminationAuto
      });
      return;
    }

    const resultat = Engine.questionMystere(partie, state.theme, cle);
    if (!resultat) {
      toast('Cette question ne peut pas être posée.', 'erreur');
      return;
    }
    fermerModale({ silencieux: true });
    state.ui.suggestionsCache = null;
    rendre();
    afficherSceau(resultat.reponse);
    if (resultat.budgetAtteint) {
      toast('Budget de questions épuisé : tu dois maintenant deviner.', 'erreur', 4200);
    } else {
      toast(
        resultat.elimines > 0
          ? `${resultat.reponse ? 'Oui' : 'Non'} — ${resultat.elimines} portrait${resultat.elimines > 1 ? 's' : ''} écarté${resultat.elimines > 1 ? 's' : ''}.`
          : `${resultat.reponse ? 'Oui' : 'Non'} — aucun nouveau portrait écarté.`,
        resultat.reponse ? 'succes' : 'info',
        2200
      );
    }
  }

  function repondreHotseat(reponse) {
    const partie = state.partie;
    if (!partie) return;
    const resultat = Engine.reponseHotseat(partie, state.theme, reponse);
    if (!resultat) {
      toast('La réponse n’a pas pu être enregistrée.', 'erreur');
      return;
    }
    fermerModale({ silencieux: true });
    rendre();
    afficherSceau(reponse);
    if (partie.config.eliminationAuto && resultat.elimines > 0) {
      toast(`${resultat.elimines} portrait${resultat.elimines > 1 ? 's' : ''} écarté${resultat.elimines > 1 ? 's' : ''}.`, 'succes', 2200);
    } else {
      toast('Réponse enregistrée. Élimine les portraits puis termine ton tour.', 'info', 2600);
    }
  }

  function finTourHotseat() {
    const partie = state.partie;
    if (!partie || partie.phase !== 'game') return;
    Engine.finTourHotseat(partie);
    arreterTimer();
    state.ecran = 'passage';
    rendre({ deplacerHaut: true });
  }

  function preparerTourPC(resultat) {
    if (state.ui.pcDelai) {
      window.clearTimeout(state.ui.pcDelai);
      state.ui.pcDelai = null;
    }
    state.ui.pcDelai = window.setTimeout(() => {
      state.ui.pcDelai = null;
      const partie = state.partie;
      if (!partie || (partie.phase !== 'pcTurn' && partie.phase !== 'pcAnnonce')) {
        state.ui.pcReflexion = false;
        return;
      }
      state.ui.pcReflexion = false;
      rendre();
      if (partie.phase === 'pcAnnonce') {
        ouvrirModale('annonce-pc');
      } else {
        ouvrirModale('question-pc');
      }
    }, 720);
  }

  function finTourDuel() {
    const partie = state.partie;
    if (!partie || partie.phase !== 'game') return;
    const resultat = Engine.finTourJoueurDuel(partie, state.theme);
    if (!resultat) return;
    arreterTimer();
    state.ui.pcReflexion = true;
    rendre();
    preparerTourPC(resultat);
  }

  function repondreQuestionPC(reponse) {
    const partie = state.partie;
    if (!partie || partie.phase !== 'pcTurn') return;
    const resultat = Engine.repondreQuestionPC(partie, state.theme, reponse);
    if (!resultat) return;
    fermerModale({ silencieux: true, sansReprise: true });
    if (partie.phase === 'pcAnnonce') {
      state.ui.pcReflexion = true;
      rendre();
      preparerTourPC({ annonce: true });
      return;
    }
    state.ui.pcReflexion = false;
    state.ui.suggestionsCache = null;
    rendre();
    demarrerTourSiPossible();
    toast('Au tour du joueur. Choisis ta prochaine question.', 'info', 2400);
  }

  function continuerAnnoncePC() {
    const partie = state.partie;
    if (!partie) return;
    const resultat = Engine.resoudreAnnoncePC(partie, state.theme);
    if (!resultat) return;
    fermerModale({ silencieux: true, sansReprise: true });
    arreterTimer();
    allerResultat();
  }

  function basculerCarte(id) {
    const partie = state.partie;
    if (!partie || !id) return;
    const eliminee = Engine.basculerElimination(partie, id);
    if (eliminee) {
      state.ui.animationsElimination.add(id);
      window.setTimeout(() => state.ui.animationsElimination.delete(id), 700);
    } else {
      state.ui.animationsElimination.delete(id);
    }
    rendre();
  }

  function inspecterCarte(id) {
    if (!personnage(id)) return;
    ouvrirModale('fiche', { id });
  }

  function basculerFiche(id) {
    const partie = state.partie;
    if (!partie) return;
    const eliminee = Engine.basculerElimination(partie, id);
    if (eliminee) {
      state.ui.animationsElimination.add(id);
      window.setTimeout(() => state.ui.animationsElimination.delete(id), 700);
    }
    fermerModale({ silencieux: true });
    rendre();
    toast(eliminee ? 'Portrait écarté.' : 'Portrait réintégré.', 'info', 1800);
  }

  function eliminerAuto() {
    const partie = state.partie;
    if (!partie) return;
    const elimines = Engine.eliminerSelonDerniereReponse(partie, state.theme);
    state.ui.suggestionsCache = null;
    rendre();
    toast(
      elimines > 0
        ? `${elimines} portrait${elimines > 1 ? 's' : ''} écarté${elimines > 1 ? 's' : ''} selon la réponse.`
        : 'Aucun nouveau portrait à écarter.',
      'info',
      2200
    );
  }

  function restaurerPlateau() {
    const partie = state.partie;
    if (!partie) return;
    Engine.restaurerPlateau(partie);
    state.ui.animationsElimination.clear();
    rendre();
    toast('Plateau restauré.', 'info', 1800);
  }

  function ouvrirDeviner() {
    const partie = state.partie;
    if (!partie || partie.phase !== 'game') return;
    state.ui.devineChoix = null;
    ouvrirModale('deviner');
  }

  function confirmerDeviner() {
    const partie = state.partie;
    const id = state.ui.devineChoix;
    if (!partie || !id) {
      toast('Choisis d’abord un portrait.', 'info');
      return;
    }
    fermerModale({ silencieux: true, sansReprise: true });
    state.ui.devineChoix = null;

    if (partie.mode === 'hotseat') {
      const resultat = Engine.devinerHotseat(partie, state.theme, id);
      if (!resultat) {
        rendre();
        return;
      }
      arreterTimer();
      allerResultat();
      return;
    }

    if (partie.mode === 'duel') {
      const resultat = Engine.devinerDuel(partie, state.theme, id);
      if (!resultat) {
        rendre();
        return;
      }
      arreterTimer();
      allerResultat();
      return;
    }

    const resultat = Engine.devinerMystere(partie, state.theme, id);
    if (!resultat) {
      rendre();
      return;
    }
    if (resultat.type === 'vie-perdue') {
      rendre();
      toast(`Mauvaise annonce. Il reste ${resultat.viesRestantes} vie${resultat.viesRestantes > 1 ? 's' : ''}.`, 'erreur', 3600);
      return;
    }
    arreterTimer();
    allerResultat();
  }

  function ouvrirJournal() {
    if (!state.partie) return;
    ouvrirModale('journal');
  }

  function quitterPartie() {
    if (!state.partie) {
      state.ecran = 'accueil';
      rendre({ deplacerHaut: true });
      return;
    }
    ouvrirModale('quitter');
  }

  function confirmerQuitter() {
    if (state.ui.pcDelai) {
      window.clearTimeout(state.ui.pcDelai);
      state.ui.pcDelai = null;
    }
    fermerModale({ silencieux: true, sansReprise: true });
    arreterTimer();
    state.partie = null;
    state.ui.secret = null;
    state.ui.modale = null;
    state.ecran = 'accueil';
    rendre({ deplacerHaut: true });
    toast('Partie quittée. Le plateau vous attend.', 'info', 2200);
  }

  function retourAccueil() {
    if (state.ui.pcDelai) {
      window.clearTimeout(state.ui.pcDelai);
      state.ui.pcDelai = null;
    }
    fermerModale({ silencieux: true, sansReprise: true });
    arreterTimer();
    state.partie = null;
    state.ecran = 'accueil';
    rendre({ deplacerHaut: true });
  }

  function reinitialiserInterfacePartie() {
    if (state.ui.pcDelai) {
      window.clearTimeout(state.ui.pcDelai);
      state.ui.pcDelai = null;
    }
    state.ui.eliminationRapide = false;
    state.ui.devineChoix = null;
    state.ui.suggestionsCache = null;
    state.ui.pcReflexion = false;
    state.ui.secret = null;
    state.ui.animationsElimination.clear();
    state.ui.modale = null;
    modaleEl.hidden = true;
    modaleEl.innerHTML = '';
    document.body.classList.remove('est-fige');
  }

  function mancheSuivante() {
    const partie = state.partie;
    if (!partie || partie.phase !== 'result') return;

    if (partie.mode === 'hotseat') {
      if (!Engine.mancheSuivanteHotseat(partie)) return;
      partie._statsManche = false;
      reinitialiserInterfacePartie();
      state.ecran = 'secrets';
      arreterTimer();
      initialiserSecretUI();
      rendre({ deplacerHaut: true });
      return;
    }

    if (partie.mode === 'duel') {
      if (!Engine.mancheSuivanteDuel(partie, state.theme)) return;
      partie._statsManche = false;
      reinitialiserInterfacePartie();
      state.ecran = 'jeu';
      rendre({ deplacerHaut: true });
      demarrerTourSiPossible();
      toast(`Manche ${partie.round} — nouveau secret pour le PC.`, 'info', 2400);
      return;
    }

    if (partie.mode === 'mystere') {
      const config = { ...partie.config };
      state.partie = Engine.creerMystere({ config }, state.theme);
      reinitialiserInterfacePartie();
      state.ecran = 'jeu';
      rendre({ deplacerHaut: true });
      demarrerTourSiPossible();
      toast('Nouvelle manche de la série.', 'info', 2200);
    }
  }

  function rejouerPartie() {
    const ancienne = state.partie;
    if (!ancienne) {
      state.ecran = 'accueil';
      rendre({ deplacerHaut: true });
      return;
    }
    arreterTimer();
    reinitialiserInterfacePartie();

    if (ancienne.mode === 'hotseat') {
      const joueurs = ancienne.joueurs.map((joueur) => joueur.nom);
      state.partie = Engine.creerHotseat({ joueurs, config: { ...ancienne.config } }, state.theme);
      state.ecran = 'secrets';
      initialiserSecretUI();
    } else if (ancienne.mode === 'duel') {
      state.partie = Engine.creerDuel(
        { nomJoueur: ancienne.nomJoueur, config: { ...ancienne.config } },
        state.theme
      );
      state.ecran = 'secrets';
      initialiserSecretUI();
    } else {
      state.partie = Engine.creerMystere({ config: { ...ancienne.config } }, state.theme);
      state.ecran = 'jeu';
    }
    rendre({ deplacerHaut: true });
    if (state.ecran === 'jeu') demarrerTourSiPossible();
  }

  function choisirTheme(idTheme) {
    if (!['accueil', 'configuration'].includes(state.ecran)) {
      toast('Le thème ne peut pas être changé en pleine partie.', 'info');
      return;
    }
    const nouveau = Themes.obtenir(idTheme);
    if (!nouveau) return;
    if (state.ecran === 'configuration') {
      capturerConfiguration();
      persisterOptionsDepuisConfiguration();
    }
    state.theme = nouveau;
    state.reglages.themeId = nouveau.id;
    Storage.sauverReglages(state.reglages);
    appliquerPalette();
    rendre();
  }

  function confirmerSecret(id) {
    const partie = state.partie;
    const ui = state.ui.secret;
    if (!partie || !ui) return;
    let secretId = id || null;
    if (!secretId) {
      if (ui.methode === 'choix') secretId = ui.choixId;
      else if (ui.methode === 'hasard') secretId = ui.tirageId;
      else secretId = ui.codeId;
    }
    if (!secretId) {
      toast('Choisis d’abord un personnage.', 'info');
      return;
    }

    if (partie.mode === 'hotseat') {
      const index = partie.etapeSecret ? partie.etapeSecret.joueurIndex : 0;
      const resultat = Engine.confirmerSecretHotseat(partie, state.theme, index, secretId);
      if (!resultat) {
        toast('Le secret n’a pas pu être enregistré.', 'erreur');
        return;
      }
      state.ui.secret = null;
      if (resultat.termine) {
        state.ecran = 'jeu';
        state.ui.eliminationRapide = false;
        state.ui.suggestionsCache = null;
        rendre({ deplacerHaut: true });
        demarrerTourSiPossible();
        toast('Les deux secrets sont choisis. Que la manche commence !', 'succes', 2600);
      } else {
        state.ecran = 'secrets';
        rendre({ deplacerHaut: true });
        toast('Secret enregistré. Passe le PC à l’autre joueur.', 'succes', 2600);
      }
      return;
    }

    if (partie.mode === 'duel') {
      if (!Engine.confirmerSecretDuel(partie, state.theme, secretId)) {
        toast('Le secret n’a pas pu être enregistré.', 'erreur');
        return;
      }
      state.ui.secret = null;
      state.ecran = 'jeu';
      state.ui.eliminationRapide = false;
      state.ui.suggestionsCache = null;
      rendre({ deplacerHaut: true });
      demarrerTourSiPossible();
      toast('Votre secret est prêt. Le PC a tiré le sien.', 'succes', 2600);
    }
  }

  function passagePret() {
    const partie = state.partie;
    if (!partie) return;
    if (!Engine.activerJoueurSuivantHotseat(partie)) return;
    state.ecran = 'jeu';
    state.ui.suggestionsCache = null;
    state.ui.eliminationRapide = false;
    state.ui.pcReflexion = false;
    rendre({ deplacerHaut: true });
    demarrerTourSiPossible();
    toast(`Au tour de ${partie.joueurs[partie.active].nom}.`, 'info', 2200);
  }

  function installerApplication() {
    const prompt = state.ui.installPrompt;
    if (U.estStandalone()) {
      toast('L’application est déjà installée sur cet appareil.', 'succes');
      return;
    }
    if (!prompt) {
      ouvrirModale('installation');
      return;
    }
    prompt.prompt();
    prompt.userChoice
      .then((reponse) => {
        if (reponse && reponse.outcome === 'accepted') {
          toast('Installation lancée. Retrouvez Qui suis-je ? sur votre écran d’accueil.', 'succes', 4200);
        }
      })
      .catch((erreur) => console.warn('Installation impossible.', erreur))
      .finally(() => {
        state.ui.installPrompt = null;
      });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Écoute des événements
  // ───────────────────────────────────────────────────────────────────────────

  function activerHold(bouton) {
    if (!bouton) return;
    const cible = document.getElementById(bouton.dataset.holdCible);
    if (!cible) return;
    bouton.classList.add('est-presse');
    bouton.setAttribute('aria-pressed', 'true');
    cible.classList.remove('est-masque');
    const nom = bouton.dataset.holdNom ? document.getElementById(bouton.dataset.holdNom) : null;
    if (nom) {
      nom.dataset.texteMasque = nom.textContent;
      nom.textContent = nom.dataset.nom || '';
    }
  }

  function relacherHold(bouton) {
    if (!bouton) return;
    const cible = document.getElementById(bouton.dataset.holdCible);
    bouton.classList.remove('est-presse');
    bouton.setAttribute('aria-pressed', 'false');
    if (cible) cible.classList.add('est-masque');
    const nom = bouton.dataset.holdNom ? document.getElementById(bouton.dataset.holdNom) : null;
    if (nom) {
      nom.dataset.texteMasque = '';
      nom.textContent = '••••••';
    }
  }

  function relacherTousLesHolds() {
    document.querySelectorAll('[data-hold-cible].est-presse').forEach(relacherHold);
  }

  function gererClic(evenement) {
    const element = evenement.target.closest('[data-action]');
    if (!element || element.disabled) return;
    const action = element.dataset.action;

    switch (action) {
      case 'defiler-modes':
        evenement.preventDefault();
        document.getElementById('section-modes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;

      case 'ouvrir-config':
        evenement.preventDefault();
        preparerConfiguration(element.dataset.mode || 'hotseat');
        break;

      case 'accueil':
      case 'retour-accueil':
      case 'resultat-accueil':
        retourAccueil();
        break;

      case 'choisir-theme':
        choisirTheme(element.dataset.theme);
        break;

      case 'installer':
        installerApplication();
        break;

      case 'ouvrir-installation':
        ouvrirModale('installation');
        break;

      case 'ouvrir-aide':
        ouvrirModale('aide');
        break;

      case 'ouvrir-stats':
        ouvrirModale('stats');
        break;

      case 'demander-reset-stats':
        ouvrirModale('reset-stats');
        break;

      case 'confirmer-reset-stats':
        Storage.reinitialiserStats();
        state.stats = Storage.chargerStats();
        fermerModale({ silencieux: true });
        rendre();
        toast('Scores réinitialisés.', 'succes');
        break;

      case 'fermer-modale':
        fermerModale();
        rendre();
        break;

      case 'secret-pret':
        if (state.partie && Engine.secretPretHotseat(state.partie)) {
          state.ui.secret = null;
          initialiserSecretUI();
          rendre();
        }
        break;

      case 'secret-methode':
        if (state.ui.secret) {
          state.ui.secret.methode = element.dataset.methode || 'choix';
          state.ui.secret.erreurCode = '';
          rendre();
        }
        break;

      case 'secret-choisir':
        if (state.ui.secret) {
          state.ui.secret.choixId = element.dataset.id || null;
          rendre();
        }
        break;

      case 'secret-tirer': {
        if (!state.ui.secret) break;
        const tirage = U.choisir(state.theme.tousLesIds);
        state.ui.secret.tirageId = tirage;
        state.ui.secret.methode = 'hasard';
        rendre();
        break;
      }

      case 'secret-effacer-code':
        if (state.ui.secret) {
          state.ui.secret.codeId = null;
          state.ui.secret.codeSaisi = '';
          state.ui.secret.erreurCode = '';
          rendre();
        }
        break;

      case 'secret-confirmer':
        confirmerSecret(element.dataset.id || null);
        break;

      case 'passage-pret':
        passagePret();
        break;

      case 'question-ouvrir':
        ouvrirChoixQuestion();
        break;

      case 'question-choisir':
        poserQuestion(element.dataset.cle);
        break;

      case 'repondre-question-attente':
        if (state.partie && state.partie.questionCeTour) {
          remplacerModale('reponse-hotseat');
        }
        break;

      case 'repondre-hotseat':
        repondreHotseat(element.dataset.reponse === 'oui');
        break;

      case 'question-pc-repondre':
        repondreQuestionPC(element.dataset.reponse === 'oui');
        break;

      case 'pc-annonce-continuer':
        continuerAnnoncePC();
        break;

      case 'fin-tour-hotseat':
        finTourHotseat();
        break;

      case 'fin-tour-duel':
        finTourDuel();
        break;

      case 'auto-eliminer':
        eliminerAuto();
        break;

      case 'carte-eliminer':
        basculerCarte(element.dataset.id);
        break;

      case 'carte-inspecter':
        inspecterCarte(element.dataset.id);
        break;

      case 'fiche-basculer':
        basculerFiche(element.dataset.id);
        break;

      case 'mode-elimination':
        state.ui.eliminationRapide = !state.ui.eliminationRapide;
        rendre();
        toast(
          state.ui.eliminationRapide
            ? 'Élimination rapide active : un clic sur une carte l’écarte.'
            : 'Mode fiche : un clic sur une carte affiche ses attributs.',
          'info',
          2400
        );
        break;

      case 'restaurer-plateau':
        restaurerPlateau();
        break;

      case 'deviner-ouvrir':
        ouvrirDeviner();
        break;

      case 'devine-choisir':
        state.ui.devineChoix = element.dataset.id || null;
        rendreModale();
        break;

      case 'deviner-confirmer':
        confirmerDeviner();
        break;

      case 'journal-ouvrir':
        ouvrirJournal();
        break;

      case 'quitter-partie':
        quitterPartie();
        break;

      case 'confirmer-quitter':
        confirmerQuitter();
        break;

      case 'manche-suivante':
        mancheSuivante();
        break;

      case 'rejouer':
        rejouerPartie();
        break;

      default:
        console.warn(`Action inconnue : ${action}`);
    }
  }

  function gererChangement(evenement) {
    const form = evenement.target.closest('#form-config');
    if (!form) return;
    capturerConfiguration();
    persisterOptionsDepuisConfiguration();
    syncConfigurationUI();
  }

  function gererSoumission(evenement) {
    const form = evenement.target.closest('form[data-form]');
    if (!form) return;
    evenement.preventDefault();

    if (form.dataset.form === 'config') {
      lancerPartieDepuisConfiguration();
      return;
    }

    if (form.dataset.form === 'code-secret') {
      const ui = state.ui.secret;
      if (!ui) return;
      const donnees = new FormData(form);
      const code = String(donnees.get('code') || '').trim().toUpperCase();
      const index = U.depuisCodePosition(code, state.theme.tousLesIds.length, 6);
      ui.codeSaisi = code;
      if (index < 0) {
        ui.codeId = null;
        ui.erreurCode = `Code invalide. Utilise une case existante entre A1 et ${U.codePosition(state.theme.tousLesIds.length - 1, 6)}.`;
        rendre();
        return;
      }
      const pers = state.theme.personnages[index];
      ui.codeId = pers.id;
      ui.erreurCode = '';
      rendre();
    }
  }

  function gererClavier(evenement) {
    if (state.ui.modale) {
      if (evenement.key === 'Escape') {
        const nonClosable = ['reponse-hotseat', 'question-pc', 'annonce-pc'].includes(state.ui.modale.type);
        if (!nonClosable) {
          evenement.preventDefault();
          fermerModale();
          rendre();
        }
        return;
      }
      if (evenement.key === 'Tab') {
        const focusables = Array.from(
          modaleEl.querySelectorAll(
            'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((element) => element.offsetParent !== null);
        if (focusables.length === 0) return;
        const premier = focusables[0];
        const dernier = focusables[focusables.length - 1];
        if (evenement.shiftKey && document.activeElement === premier) {
          evenement.preventDefault();
          dernier.focus();
        } else if (!evenement.shiftKey && document.activeElement === dernier) {
          evenement.preventDefault();
          premier.focus();
        }
      }
      return;
    }

    const cible = evenement.target;
    if (cible && cible.matches('[data-hold-cible]') && (evenement.key === 'Enter' || evenement.key === ' ')) {
      evenement.preventDefault();
      activerHold(cible);
    }
  }

  function gererRelachementClavier(evenement) {
    if (evenement.key === 'Enter' || evenement.key === ' ') {
      relacherTousLesHolds();
    }
  }

  function installerEcouteurs() {
    document.addEventListener('click', gererClic);
    document.addEventListener('change', gererChangement);
    document.addEventListener('submit', gererSoumission);
    document.addEventListener('keydown', gererClavier);
    document.addEventListener('keyup', gererRelachementClavier);

    document.addEventListener('pointerdown', (evenement) => {
      const bouton = evenement.target.closest('[data-hold-cible]');
      if (!bouton) return;
      evenement.preventDefault();
      activerHold(bouton);
    });

    document.addEventListener('pointerup', relacherTousLesHolds);
    document.addEventListener('pointercancel', relacherTousLesHolds);
    window.addEventListener('blur', relacherTousLesHolds);

    window.addEventListener('beforeinstallprompt', (evenement) => {
      evenement.preventDefault();
      state.ui.installPrompt = evenement;
    });

    window.addEventListener('appinstalled', () => {
      state.ui.installPrompt = null;
      toast('Application installée. Le plateau est disponible hors-ligne.', 'succes', 4200);
      if (state.ecran === 'accueil') rendre();
    });

    window.addEventListener('online', () => toast('Connexion rétablie.', 'succes', 1800));
    window.addEventListener('offline', () => toast('Mode hors-ligne actif : le jeu continue.', 'info', 2600));

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        pauseTimer();
      } else if (!state.ui.modale && state.partie && state.partie.phase === 'game') {
        reprendreTimer();
      }
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Démarrage
  // ───────────────────────────────────────────────────────────────────────────

  async function initialiser() {
    try {
      await Themes.initialiser();
      const idTheme = Themes.obtenirIdValide(state.reglages.themeId);
      state.reglages.themeId = idTheme;
      state.theme = Themes.obtenir(idTheme);
      Storage.sauverReglages(state.reglages);
      appliquerPalette();
      installerEcouteurs();
      state.ecran = 'accueil';
      rendre({ deplacerHaut: true });
    } catch (erreur) {
      console.error('Impossible de charger le jeu.', erreur);
      appEl.innerHTML = `
        <div class="chargement">
          <div class="erreur-chargement">
            <h1>Le plateau n’a pas pu être chargé</h1>
            <p>${htmlEchappe(erreur && erreur.message ? erreur.message : 'Erreur inconnue.')}</p>
            <p>Vérifie que le dossier <code>data/themes</code> est intact, puis recharge la page.</p>
            <button class="btn btn--secondaire" onclick="location.reload()">Recharger</button>
          </div>
        </div>
      `;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialiser, { once: true });
  } else {
    initialiser();
  }
})();
