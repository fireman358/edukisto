/* Moteur de jeu : règles des trois modes, tours, éliminations et annonces. */
(function () {
  'use strict';

  const QC = (window.QC = window.QC || {});
  const U = QC.U;
  const AI = QC.AI;

  function maintenant() {
    return Date.now();
  }

  function autreIndex(index) {
    return index === 0 ? 1 : 0;
  }

  function nomDe(partie, modele, id) {
    const personnage = id ? modele.personnageParId.get(id) : null;
    return personnage ? personnage.nom : '—';
  }

  function ajouterJournal(partie, entree) {
    const numero = partie.journal.length + 1;
    partie.journal.push({
      id: U.identifiant('journal'),
      numero,
      manche: partie.round || 1,
      tour: partie.tourNumero || 1,
      horodatage: maintenant(),
      type: 'question',
      ...entree
    });
  }

  function filtrerPlateau(plateau, identifiants, modele, cle, reponse) {
    const restants = Array.from(identifiants).filter((id) => !plateau.has(id));
    const correspondants = new Set(modele.filtrer(restants, cle, reponse));
    let elimines = 0;
    for (const id of restants) {
      if (!correspondants.has(id)) {
        plateau.add(id);
        elimines += 1;
      }
    }
    return elimines;
  }

  function restantsDepuisPlateau(plateau, modele) {
    return modele.tousLesIds.filter((id) => !plateau.has(id));
  }

  function logQuestion(partie, { auteur, auteurNom, cibleNom, question, reponse, critere }) {
    ajouterJournal(partie, {
      type: 'question',
      auteur,
      auteurNom,
      cibleNom,
      question,
      reponse: Boolean(reponse),
      cle: critere ? critere.cle : null
    });
  }

  function logAnnonce(partie, { auteurNom, cibleNom, personnage, correcte, texte }) {
    ajouterJournal(partie, {
      type: 'annonce',
      auteur: auteurNom,
      auteurNom,
      cibleNom,
      question: texte,
      reponse: Boolean(correcte),
      personnage: personnage ? personnage.nom : null
    });
  }

  function logInfo(partie, texte) {
    ajouterJournal(partie, {
      type: 'info',
      auteur: 'Système',
      auteurNom: 'Système',
      cibleNom: '',
      question: texte,
      reponse: null
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MODE 1 — DEUX JOUEURS SUR LE MÊME PC (HOT-SEAT)
  // ───────────────────────────────────────────────────────────────────────────

  function creerHotseat({ joueurs, config }, modele) {
    const noms = (joueurs || []).map((nom, index) => String(nom || '').trim() || `Joueur ${index + 1}`);
    while (noms.length < 2) noms.push(`Joueur ${noms.length + 1}`);

    return {
      id: U.identifiant('hotseat'),
      mode: 'hotseat',
      themeId: modele.id,
      phase: 'secrets',
      round: 1,
      tourNumero: 1,
      config: { ...config },
      joueurs: [
        { nom: noms[0], secretId: null, plateau: new Set() },
        { nom: noms[1], secretId: null, plateau: new Set() }
      ],
      active: 0,
      scores: [0, 0],
      questionsParJoueur: [0, 0],
      questionCount: 0,
      etapeSecret: { joueurIndex: 0, sousEtape: 'pass' },
      questionCeTour: null,
      derniereQuestion: null,
      passageVers: null,
      resultat: null,
      matchTermine: false,
      journal: [],
      debut: maintenant()
    };
  }

  function secretPretHotseat(partie) {
    if (partie.mode !== 'hotseat' || partie.phase !== 'secrets' || !partie.etapeSecret) return false;
    if (partie.etapeSecret.sousEtape !== 'pass') return false;
    partie.etapeSecret.sousEtape = 'choix';
    return true;
  }

  function confirmerSecretHotseat(partie, modele, joueurIndex, secretId) {
    if (partie.mode !== 'hotseat' || partie.phase !== 'secrets') return false;
    if (!partie.etapeSecret || partie.etapeSecret.joueurIndex !== joueurIndex) return false;
    if (!modele.personnageParId.has(secretId)) return false;

    partie.joueurs[joueurIndex].secretId = secretId;

    if (joueurIndex === 0) {
      partie.etapeSecret = { joueurIndex: 1, sousEtape: 'pass' };
      return { termine: false, joueurSuivant: 1 };
    }

    partie.etapeSecret = null;
    partie.phase = 'game';
    partie.active = (partie.round - 1) % 2;
    partie.tourNumero = 1;
    logInfo(
      partie,
      `Manche ${partie.round} — les deux secrets sont choisis. ${partie.joueurs[partie.active].nom} commence.`
    );
    return { termine: true, joueurSuivant: null };
  }

  function questionHotseat(partie, modele, cle) {
    if (partie.mode !== 'hotseat' || partie.phase !== 'game' || partie.questionCeTour) return null;
    const critere = modele.obtenirQuestion(cle);
    if (!critere) return null;
    partie.questionCeTour = { cle: critere.cle, question: critere.question };
    return critere;
  }

  function reponseHotseat(partie, modele, reponse) {
    if (partie.mode !== 'hotseat' || partie.phase !== 'game' || !partie.questionCeTour) return null;
    const critere = modele.obtenirQuestion(partie.questionCeTour.cle);
    if (!critere) return null;

    const joueur = partie.joueurs[partie.active];
    const adversaire = partie.joueurs[autreIndex(partie.active)];
    const elimines = partie.config.eliminationAuto
      ? filtrerPlateau(joueur.plateau, modele.tousLesIds, modele, critere.cle, reponse)
      : 0;

    logQuestion(partie, {
      auteur: `J${partie.active + 1}`,
      auteurNom: joueur.nom,
      cibleNom: adversaire.nom,
      question: critere.question,
      reponse,
      critere
    });

    partie.questionCount += 1;
    partie.questionsParJoueur[partie.active] += 1;
    partie.derniereQuestion = {
      cle: critere.cle,
      question: critere.question,
      reponse: Boolean(reponse),
      elimines
    };
    partie.questionCeTour.reponse = Boolean(reponse);
    partie.questionCeTour.elimines = elimines;
    return { critere, reponse: Boolean(reponse), elimines };
  }

  function eliminerSelonDerniereReponse(partie, modele) {
    if (!partie.derniereQuestion || !partie.derniereQuestion.cle) return 0;
    if (partie.mode === 'hotseat') {
      const joueur = partie.joueurs[partie.active];
      const elimines = filtrerPlateau(
        joueur.plateau,
        modele.tousLesIds,
        modele,
        partie.derniereQuestion.cle,
        partie.derniereQuestion.reponse
      );
      partie.derniereQuestion.elimines += elimines;
      return elimines;
    }
    if (partie.mode === 'duel') {
      const elimines = filtrerPlateau(
        partie.plateau,
        modele.tousLesIds,
        modele,
        partie.derniereQuestion.cle,
        partie.derniereQuestion.reponse
      );
      partie.derniereQuestion.elimines += elimines;
      return elimines;
    }
    if (partie.mode === 'mystere') {
      const elimines = filtrerPlateau(
        partie.plateau,
        modele.tousLesIds,
        modele,
        partie.derniereQuestion.cle,
        partie.derniereQuestion.reponse
      );
      partie.derniereQuestion.elimines += elimines;
      return elimines;
    }
    return 0;
  }

  function basculerElimination(partie, id) {
    if (!partie || !id) return false;
    let plateau = null;
    if (partie.mode === 'hotseat' && partie.phase === 'game') {
      plateau = partie.joueurs[partie.active].plateau;
    } else if ((partie.mode === 'duel' || partie.mode === 'mystere') && (partie.phase === 'game' || partie.phase === 'pcTurn')) {
      plateau = partie.plateau;
    }
    if (!plateau) return false;
    if (plateau.has(id)) {
      plateau.delete(id);
      return false;
    }
    plateau.add(id);
    return true;
  }

  function restaurerPlateau(partie) {
    if (partie.mode === 'hotseat') {
      partie.joueurs[partie.active].plateau.clear();
      return true;
    }
    if (partie.mode === 'duel' || partie.mode === 'mystere') {
      partie.plateau.clear();
      return true;
    }
    return false;
  }

  function finTourHotseat(partie, raison) {
    if (partie.mode !== 'hotseat' || partie.phase !== 'game') return false;
    partie.passageVers = autreIndex(partie.active);
    partie.phase = 'passage';
    partie.motifPassage = raison || 'fin';
    return true;
  }

  function activerJoueurSuivantHotseat(partie) {
    if (partie.mode !== 'hotseat' || partie.phase !== 'passage') return false;
    partie.active = partie.passageVers == null ? autreIndex(partie.active) : partie.passageVers;
    partie.passageVers = null;
    partie.phase = 'game';
    partie.tourNumero += 1;
    partie.questionCeTour = null;
    partie.derniereQuestion = null;
    return true;
  }

  function terminerMancheHotseat(partie, modele, gagnantIndex, raison) {
    if (partie.phase === 'resultat' || partie.phase === 'result') return null;
    partie.scores[gagnantIndex] += 1;
    partie.matchTermine = partie.scores[gagnantIndex] >= partie.config.manches;
    partie.phase = 'result';
    partie.resultat = {
      mode: 'hotseat',
      manche: partie.round,
      gagnantIndex,
      gagnantNom: partie.joueurs[gagnantIndex].nom,
      perdantNom: partie.joueurs[autreIndex(gagnantIndex)].nom,
      raison,
      scores: [...partie.scores],
      secrets: partie.joueurs.map((joueur) => ({
        joueur: joueur.nom,
        secretId: joueur.secretId,
        nom: nomDe(partie, modele, joueur.secretId)
      })),
      matchTermine: partie.matchTermine
    };
    logInfo(partie, `Fin de la manche ${partie.round} : ${partie.joueurs[gagnantIndex].nom} l'emporte.`);
    return partie.resultat;
  }

  function devinerHotseat(partie, modele, idAnnonce) {
    if (partie.mode !== 'hotseat' || partie.phase !== 'game') return null;
    const adversaireIndex = autreIndex(partie.active);
    const adversaire = partie.joueurs[adversaireIndex];
    const annonceur = partie.joueurs[partie.active];
    const correcte = adversaire.secretId === idAnnonce;
    const personnage = modele.personnageParId.get(idAnnonce);

    logAnnonce(partie, {
      auteurNom: annonceur.nom,
      cibleNom: adversaire.nom,
      personnage,
      correcte,
      texte: `${annonceur.nom} annonce : « ${personnage ? personnage.nom : '?'} »`
    });

    if (correcte) {
      terminerMancheHotseat(
        partie,
        modele,
        partie.active,
        `Bonne annonce : ${personnage.nom} était bien le personnage secret de ${adversaire.nom}.`
      );
    } else {
      terminerMancheHotseat(
        partie,
        modele,
        adversaireIndex,
        `Mauvaise annonce : ce n'était pas ${personnage ? personnage.nom : 'ce personnage'}.`
      );
    }
    return partie.resultat;
  }

  function mancheSuivanteHotseat(partie) {
    if (partie.mode !== 'hotseat' || partie.phase !== 'result' || partie.matchTermine) return false;
    partie.round += 1;
    partie.phase = 'secrets';
    partie.etapeSecret = { joueurIndex: 0, sousEtape: 'pass' };
    partie.active = 0;
    partie.tourNumero = 1;
    partie.questionCeTour = null;
    partie.derniereQuestion = null;
    partie.passageVers = null;
    partie.resultat = null;
    for (const joueur of partie.joueurs) {
      joueur.secretId = null;
      joueur.plateau.clear();
    }
    return true;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MODE 2 — DUEL CONTRE LE PC
  // ───────────────────────────────────────────────────────────────────────────

  function creerDuel({ nomJoueur, config }, modele) {
    const nom = String(nomJoueur || '').trim() || 'Détective';
    return {
      id: U.identifiant('duel'),
      mode: 'duel',
      themeId: modele.id,
      phase: 'secret',
      round: 1,
      tourNumero: 1,
      nomJoueur: nom,
      config: { ...config },
      scores: { joueur: 0, pc: 0 },
      secretJoueur: null,
      secretPC: null,
      plateau: new Set(),
      pcCandidats: [...modele.tousLesIds],
      pcAttributsDemandes: new Set(),
      pcNumeroQuestion: 0,
      questionCount: 0,
      questionPoseeCeTour: false,
      questionPC: null,
      annoncePC: null,
      derniereQuestion: null,
      mensonge: { utilise: false, question: null, manche: null },
      resultat: null,
      matchTermine: false,
      journal: [],
      debut: maintenant()
    };
  }

  function demarrerMancheDuel(partie, modele) {
    const possibles = modele.tousLesIds.filter((id) => id !== partie.secretJoueur);
    partie.secretPC = U.choisir(possibles.length ? possibles : modele.tousLesIds);
    partie.phase = 'game';
    partie.plateau = new Set();
    partie.pcCandidats = [...modele.tousLesIds];
    partie.pcAttributsDemandes = new Set();
    partie.pcNumeroQuestion = 0;
    partie.questionPoseeCeTour = false;
    partie.questionPC = null;
    partie.annoncePC = null;
    partie.derniereQuestion = null;
    partie.tourNumero = 1;
    logInfo(partie, `Manche ${partie.round} — le PC a choisi un nouveau personnage secret.`);
  }

  function confirmerSecretDuel(partie, modele, secretId) {
    if (partie.mode !== 'duel' || partie.phase !== 'secret') return false;
    if (!modele.personnageParId.has(secretId)) return false;
    partie.secretJoueur = secretId;
    demarrerMancheDuel(partie, modele);
    return true;
  }

  function questionDuel(partie, modele, cle) {
    if (partie.mode !== 'duel' || partie.phase !== 'game' || partie.questionPoseeCeTour) return null;
    const critere = modele.obtenirQuestion(cle);
    if (!critere) return null;

    const personnagePC = modele.personnageParId.get(partie.secretPC);
    const reponseReelle = modele.reponse(personnagePC, critere.cle);
    const restantsJoueur = restantsDepuisPlateau(partie.plateau, modele);

    let mensonge = false;
    if (partie.config.bluff && partie.config.difficulte === 'difficile' && !partie.mensonge.utilise) {
      const analyse = AI.evaluerMensonge({
        modele,
        identifiantsRestants: restantsJoueur,
        cle: critere.cle,
        total: modele.tousLesIds.length,
        questionsPosees: partie.questionCount
      });
      if (analyse.decider) {
        mensonge = true;
        partie.mensonge = {
          utilise: true,
          question: partie.questionCount + 1,
          manche: partie.round
        };
      }
    }

    const reponse = mensonge ? !reponseReelle : reponseReelle;
    const elimines = partie.config.eliminationAuto
      ? filtrerPlateau(partie.plateau, modele.tousLesIds, modele, critere.cle, reponse)
      : 0;

    logQuestion(partie, {
      auteur: 'Vous',
      auteurNom: partie.nomJoueur,
      cibleNom: 'Le PC',
      question: critere.question,
      reponse,
      critere
    });

    partie.questionCount += 1;
    partie.questionPoseeCeTour = true;
    partie.derniereQuestion = {
      cle: critere.cle,
      question: critere.question,
      reponse,
      elimines,
      mensonge
    };
    return { critere, reponse, elimines, mensonge };
  }

  function preparerQuestionPC(partie, modele) {
    if (partie.mode !== 'duel' || partie.phase !== 'game') return null;

    if (partie.pcCandidats.length <= 1) {
      // En cas d'incohérence (réponse volontairement erronée du joueur),
      // le PC tente une annonce de secours au lieu de rester bloqué.
      partie.annoncePC = partie.pcCandidats[0] || AI.choisirAnnonce(modele.tousLesIds);
      partie.phase = 'pcAnnonce';
      return { annonce: true };
    }

    const profil = AI.choisirQuestionPC(
      modele,
      partie.pcCandidats,
      partie.pcAttributsDemandes,
      partie.config.difficulte,
      partie.pcNumeroQuestion
    );

    if (!profil) {
      // Plus aucune question utile : le PC tente sa chance sur un candidat.
      partie.annoncePC = AI.choisirAnnonce(partie.pcCandidats);
      partie.phase = 'pcAnnonce';
      return { annonce: true };
    }

    partie.questionPC = {
      cle: profil.critere.cle,
      question: profil.critere.question,
      transition: profil
    };
    partie.phase = 'pcTurn';
    return { annonce: false, critere: profil.critere };
  }

  function repondreQuestionPC(partie, modele, reponse) {
    if (partie.mode !== 'duel' || partie.phase !== 'pcTurn' || !partie.questionPC) return null;
    const critere = modele.obtenirQuestion(partie.questionPC.cle);
    if (!critere) return null;

    partie.pcAttributsDemandes.add(critere.attributId);
    partie.pcCandidats = modele.filtrer(partie.pcCandidats, critere.cle, Boolean(reponse));
    partie.pcNumeroQuestion += 1;
    partie.questionCount += 1;

    logQuestion(partie, {
      auteur: 'Le PC',
      auteurNom: 'Le PC',
      cibleNom: partie.nomJoueur,
      question: critere.question,
      reponse: Boolean(reponse),
      critere
    });

    partie.questionPC = null;
    partie.questionPoseeCeTour = false;
    partie.derniereQuestion = null;

    if (partie.pcCandidats.length <= 1) {
      partie.annoncePC = partie.pcCandidats[0] || AI.choisirAnnonce(modele.tousLesIds);
      partie.phase = 'pcAnnonce';
      return { annonce: true, restants: partie.pcCandidats.length };
    }

    partie.phase = 'game';
    partie.tourNumero += 1;
    return { annonce: false, restants: partie.pcCandidats.length };
  }

  function resoudreAnnoncePC(partie, modele) {
    if (partie.mode !== 'duel' || partie.phase !== 'pcAnnonce') return null;
    const idAnnonce = partie.annoncePC;
    const personnage = modele.personnageParId.get(idAnnonce);
    const correcte = idAnnonce === partie.secretJoueur;
    logAnnonce(partie, {
      auteurNom: 'Le PC',
      cibleNom: partie.nomJoueur,
      personnage,
      correcte,
      texte: `Le PC annonce : « ${personnage ? personnage.nom : '?'} »`
    });

    partie.annoncePC = null;
    return terminerMancheDuel(
      partie,
      modele,
      correcte ? 'pc' : 'joueur',
      correcte
        ? `Le PC a déduit votre personnage : ${personnage ? personnage.nom : '?'}.`
        : `Le PC s'est trompé : ce n'était pas ${personnage ? personnage.nom : 'ce personnage'}.`
    );
  }

  function finTourJoueurDuel(partie, modele) {
    if (partie.mode !== 'duel' || partie.phase !== 'game') return null;
    return preparerQuestionPC(partie, modele);
  }

  function devinerDuel(partie, modele, idAnnonce) {
    if (partie.mode !== 'duel' || partie.phase !== 'game') return null;
    const personnage = modele.personnageParId.get(idAnnonce);
    const correcte = idAnnonce === partie.secretPC;

    logAnnonce(partie, {
      auteurNom: partie.nomJoueur,
      cibleNom: 'Le PC',
      personnage,
      correcte,
      texte: `${partie.nomJoueur} annonce : « ${personnage ? personnage.nom : '?'} »`
    });

    return terminerMancheDuel(
      partie,
      modele,
      correcte ? 'joueur' : 'pc',
      correcte
        ? `Bonne annonce : le personnage du PC était ${personnage.nom}.`
        : `Mauvaise annonce : le personnage du PC n'était pas ${personnage ? personnage.nom : '?'}.`
    );
  }

  function terminerMancheDuel(partie, modele, gagnant, raison) {
    if (partie.phase === 'result') return partie.resultat;
    partie.scores[gagnant] += 1;
    partie.matchTermine = partie.scores[gagnant] >= partie.config.manches;
    partie.phase = 'result';
    partie.resultat = {
      mode: 'duel',
      manche: partie.round,
      gagnant,
      gagnantNom: gagnant === 'joueur' ? partie.nomJoueur : 'Le PC',
      raison,
      scores: { ...partie.scores },
      secrets: {
        joueur: {
          id: partie.secretJoueur,
          nom: nomDe(partie, modele, partie.secretJoueur)
        },
        pc: {
          id: partie.secretPC,
          nom: nomDe(partie, modele, partie.secretPC)
        }
      },
      mensonge: {
        utilise: partie.mensonge.utilise,
        question: partie.mensonge.question,
        manche: partie.mensonge.manche
      },
      matchTermine: partie.matchTermine
    };
    logInfo(
      partie,
      `Fin de la manche ${partie.round} : ${gagnant === 'joueur' ? partie.nomJoueur : 'le PC'} l'emporte.`
    );
    return partie.resultat;
  }

  function mancheSuivanteDuel(partie, modele) {
    if (partie.mode !== 'duel' || partie.phase !== 'result' || partie.matchTermine) return false;
    partie.round += 1;
    partie.resultat = null;
    demarrerMancheDuel(partie, modele);
    return true;
  }

  function timeoutDuel(partie, modele) {
    if (partie.mode !== 'duel' || partie.phase !== 'game') return null;
    return preparerQuestionPC(partie, modele);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MODE 3 — MYSTÈRE CONTRE LE PC (SOLO / SÉRIE)
  // ───────────────────────────────────────────────────────────────────────────

  function creerMystere({ config }, modele) {
    return {
      id: U.identifiant('mystere'),
      mode: 'mystere',
      themeId: modele.id,
      phase: 'game',
      round: 1,
      config: { ...config },
      secretId: U.choisir(modele.tousLesIds),
      plateau: new Set(),
      questionCount: 0,
      viesRestantes: config.sousMode === 'vies' ? 3 : null,
      budget: config.sousMode === 'questions' ? Number(config.budget) || 8 : null,
      dureeChrono: config.sousMode === 'chrono' ? Number(config.dureeChrono) || 90 : null,
      debut: maintenant(),
      limiteChrono: config.sousMode === 'chrono' ? maintenant() + (Number(config.dureeChrono) || 90) * 1000 : null,
      derniereQuestion: null,
      resultat: null,
      journal: []
    };
  }

  function peutPoserQuestionMystere(partie) {
    if (!partie || partie.mode !== 'mystere' || partie.phase !== 'game') return false;
    if (partie.config.sousMode === 'questions') {
      return partie.questionCount < partie.budget;
    }
    return true;
  }

  function questionMystere(partie, modele, cle) {
    if (!peutPoserQuestionMystere(partie)) return null;
    const critere = modele.obtenirQuestion(cle);
    if (!critere) return null;
    const personnage = modele.personnageParId.get(partie.secretId);
    const reponse = modele.reponse(personnage, critere.cle);
    const elimines = partie.config.eliminationAuto
      ? filtrerPlateau(partie.plateau, modele.tousLesIds, modele, critere.cle, reponse)
      : 0;

    logQuestion(partie, {
      auteur: 'Vous',
      auteurNom: 'Vous',
      cibleNom: 'Le PC',
      question: critere.question,
      reponse,
      critere
    });

    partie.questionCount += 1;
    partie.derniereQuestion = {
      cle: critere.cle,
      question: critere.question,
      reponse,
      elimines
    };

    return {
      critere,
      reponse,
      elimines,
      budgetAtteint: partie.config.sousMode === 'questions' && partie.questionCount >= partie.budget,
      questionsRestantes:
        partie.config.sousMode === 'questions' ? Math.max(0, partie.budget - partie.questionCount) : null
    };
  }

  function calculerScoreMystere(partie, gagne) {
    if (!gagne) return 0;
    const base = { libre: 80, questions: 110, vies: 120, chrono: 140 }[partie.config.sousMode] || 80;
    const duree = Math.round((maintenant() - partie.debut) / 1000);
    const rapidite = Math.max(0, 30 - Math.floor(duree / 12)) * 3;
    let bonus = rapidite;
    if (partie.config.sousMode === 'questions') {
      bonus += Math.max(0, partie.budget - partie.questionCount) * 15;
    }
    if (partie.config.sousMode === 'vies') {
      bonus += Math.max(0, partie.viesRestantes || 0) * 35;
    }
    if (partie.config.sousMode === 'chrono') {
      const restant = Math.max(0, Math.ceil((partie.limiteChrono - maintenant()) / 1000));
      bonus += restant * 2;
    }
    return Math.round(base + bonus);
  }

  function terminerMystere(partie, modele, gagne, raison) {
    if (partie.phase === 'result') return partie.resultat;
    partie.phase = 'result';
    const duree = maintenant() - partie.debut;
    const personnage = modele.personnageParId.get(partie.secretId);
    partie.resultat = {
      mode: 'mystere',
      sousMode: partie.config.sousMode,
      gagne: Boolean(gagne),
      raison,
      secretId: partie.secretId,
      secretNom: personnage ? personnage.nom : '?',
      secretEmoji: personnage ? personnage.emoji : '❓',
      questions: partie.questionCount,
      viesRestantes: partie.viesRestantes,
      duree,
      score: calculerScoreMystere(partie, gagne)
    };
    logInfo(partie, gagne ? 'Enquête résolue !' : `Enquête terminée : ${raison}`);
    return partie.resultat;
  }

  function devinerMystere(partie, modele, idAnnonce) {
    if (partie.mode !== 'mystere' || partie.phase !== 'game') return null;
    const personnage = modele.personnageParId.get(idAnnonce);
    const correcte = idAnnonce === partie.secretId;

    logAnnonce(partie, {
      auteurNom: 'Vous',
      cibleNom: 'Le PC',
      personnage,
      correcte,
      texte: `Vous annoncez : « ${personnage ? personnage.nom : '?'} »`
    });

    if (correcte) {
      return {
        type: 'gagne',
        resultat: terminerMystere(partie, modele, true, 'Bonne annonce !')
      };
    }

    if (partie.config.sousMode === 'vies' && partie.viesRestantes > 1) {
      partie.viesRestantes -= 1;
      if (partie.config.eliminationAuto) {
        partie.plateau.add(idAnnonce);
      }
      logInfo(partie, `Mauvaise annonce. Il reste ${partie.viesRestantes} vie(s).`);
      return { type: 'vie-perdue', viesRestantes: partie.viesRestantes };
    }

    if (partie.config.sousMode === 'vies') {
      partie.viesRestantes = 0;
    }
    return {
      type: 'perdu',
      resultat: terminerMystere(
        partie,
        modele,
        false,
        `Mauvaise annonce : ce n'était pas ${personnage ? personnage.nom : 'ce personnage'}.`
      )
    };
  }

  function expirerChronoMystere(partie, modele) {
    if (partie.mode !== 'mystere' || partie.phase !== 'game' || partie.config.sousMode !== 'chrono') {
      return null;
    }
    return terminerMystere(partie, modele, false, 'Temps écoulé avant de trouver le personnage.');
  }

  function rejouerMystere(partie, modele) {
    if (!partie || partie.mode !== 'mystere') return creerMystere({ config: { sousMode: 'libre' } }, modele);
    const nouvelle = creerMystere({ config: { ...partie.config } }, modele);
    return nouvelle;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // OUTILS COMMUNS
  // ───────────────────────────────────────────────────────────────────────────

  function candidatsRestants(partie, modele) {
    if (!partie) return 0;
    if (partie.mode === 'hotseat') {
      return modele.tousLesIds.length - partie.joueurs[partie.active].plateau.size;
    }
    if (partie.mode === 'duel' || partie.mode === 'mystere') {
      return modele.tousLesIds.length - partie.plateau.size;
    }
    return modele.tousLesIds.length;
  }

  function plateauActif(partie) {
    if (!partie) return new Set();
    if (partie.mode === 'hotseat') return partie.joueurs[partie.active].plateau;
    return partie.plateau || new Set();
  }

  const Engine = (QC.Engine = {
    creerHotseat,
    secretPretHotseat,
    confirmerSecretHotseat,
    questionHotseat,
    reponseHotseat,
    finTourHotseat,
    activerJoueurSuivantHotseat,
    devinerHotseat,
    mancheSuivanteHotseat,
    timeoutHotseat: finTourHotseat,

    creerDuel,
    confirmerSecretDuel,
    questionDuel,
    preparerQuestionPC,
    repondreQuestionPC,
    finTourJoueurDuel,
    resoudreAnnoncePC,
    devinerDuel,
    mancheSuivanteDuel,
    timeoutDuel,

    creerMystere,
    peutPoserQuestionMystere,
    questionMystere,
    devinerMystere,
    expirerChronoMystere,
    rejouerMystere,

    eliminerSelonDerniereReponse,
    basculerElimination,
    restaurerPlateau,
    candidatsRestants,
    plateauActif,

    logInfo,
    nomDe
  });
})();
