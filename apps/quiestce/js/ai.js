/* Intelligence artificielle du PC : dichotomie, difficultés et bluff. */
(function () {
  'use strict';

  const QC = (window.QC = window.QC || {});
  const U = QC.U;

  function criteresUtilisables(modele, attributsDemandes) {
    const demandes = attributsDemandes || new Set();
    return modele.criteres.filter((critere) => !demandes.has(critere.attributId));
  }

  function profil(modele, identifiants, critere) {
    const total = identifiants.length;
    const oui = modele.compter(identifiants, critere.cle);
    const non = total - oui;
    const ratio = total ? oui / total : 0;
    return {
      critere,
      oui,
      non,
      total,
      ratio,
      // 1 = coupe parfaitement le plateau en deux, 0 = ne coupe rien.
      equilibre: total ? 1 - Math.abs(ratio - 0.5) * 2 : 0
    };
  }

  /**
   * Recherche dichotomique : on retient la question dont la répartition
   * Oui/Non parmi les candidats est la plus proche de 50/50.
   */
  function choisirDichotomique(modele, identifiants, attributsDemandes) {
    if (!Array.isArray(identifiants) || identifiants.length <= 1) return null;
    const candidats = criteresUtilisables(modele, attributsDemandes);
    let meilleur = null;
    let meilleurScore = -Infinity;

    for (const critere of candidats) {
      const details = profil(modele, identifiants, critere);
      if (details.oui === 0 || details.non === 0) continue;
      // Un léger aléa départage les critères quasi équivalents.
      const score = details.equilibre + Math.random() * 0.002;
      if (score > meilleurScore) {
        meilleurScore = score;
        meilleur = details;
      }
    }

    return meilleur;
  }

  /** Question volontairement hasardeuse (niveau facile / moitié du niveau moyen). */
  function choisirAleatoire(modele, identifiants, attributsDemandes) {
    if (!Array.isArray(identifiants) || identifiants.length <= 1) return null;
    const candidats = criteresUtilisables(modele, attributsDemandes);
    const utiles = candidats.filter((critere) => {
      const details = profil(modele, identifiants, critere);
      return details.oui > 0 && details.non > 0;
    });
    // Si tous les attributs ont déjà été posés, on retombe sur le hasard complet.
    const critere = U.choisir(utiles.length ? utiles : candidats);
    return critere ? profil(modele, identifiants, critere) : null;
  }

  /**
   * Choisit la question du PC selon la difficulté.
   * facile   : attribut aléatoire ;
   * moyen    : une question aléatoire, une question dichotomique en alternance ;
   * difficile: dichotomie pure.
   */
  function choisirQuestionPC(modele, identifiants, attributsDemandes, difficulte, numero) {
    if (!Array.isArray(identifiants) || identifiants.length <= 1) return null;

    if (difficulte === 'facile') {
      return choisirAleatoire(modele, identifiants, attributsDemandes);
    }
    if (difficulte === 'moyen' && numero % 2 === 0) {
      return choisirAleatoire(modele, identifiants, attributsDemandes);
    }
    return choisirDichotomique(modele, identifiants, attributsDemandes);
  }

  /**
   * Variante bluff : le PC ne ment qu'une fois dans la partie. On attend un
   * moment où la question coupe déjà fortement les hypothèses du joueur et où
   * le plateau de celui-ci est suffisamment entamé pour que le mensonge coûte
   * cher. L'IA compare le ratio Oui/Non sur les portraits encore en jeu chez
   * le joueur, sans jamais regarder son personnage secret.
   */
  function evaluerMensonge({ modele, identifiantsRestants, cle, total, questionsPosees }) {
    if (!modele || !Array.isArray(identifiantsRestants) || identifiantsRestants.length < 4) {
      return { decider: false, score: 0, equilibre: 0, urgence: 0 };
    }
    if (identifiantsRestants.length > total * 0.84) {
      return { decider: false, score: 0, equilibre: 0, urgence: 0 };
    }
    if (questionsPosees < 2) {
      return { decider: false, score: 0, equilibre: 0, urgence: 0 };
    }

    const details = profil(modele, identifiantsRestants, modele.obtenirQuestion(cle));
    if (!details || details.oui === 0 || details.non === 0) {
      return { decider: false, score: 0, equilibre: 0, urgence: 0 };
    }

    const equilibre = details.equilibre;
    const urgence = 1 - identifiantsRestants.length / total;
    const score = equilibre * 0.8 + urgence * 0.6;

    return {
      decider: score >= 0.82,
      score,
      equilibre,
      urgence
    };
  }

  function choisirAnnonce(identifiants) {
    if (!Array.isArray(identifiants) || identifiants.length === 0) return null;
    return U.choisir(identifiants);
  }

  const AI = (QC.AI = {
    profil,
    choisirDichotomique,
    choisirAleatoire,
    choisirQuestionPC,
    evaluerMensonge,
    choisirAnnonce
  });
})();
