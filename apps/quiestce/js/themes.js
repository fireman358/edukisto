/* Chargement, modélisation et contrôle d'équilibre des thèmes. */
(function () {
  'use strict';

  const QC = (window.QC = window.QC || {});
  const U = QC.U;
  const MIN_RATIO = 0.25;
  const MAX_RATIO = 0.75;

  class ThemeInvalide extends Error {}

  function estObjet(valeur) {
    return valeur !== null && typeof valeur === 'object' && !Array.isArray(valeur);
  }

  function construireModele(theme) {
    if (!estObjet(theme) || !Array.isArray(theme.attributs) || !Array.isArray(theme.personnages)) {
      throw new ThemeInvalide(`Le thème ${theme && theme.id ? theme.id : '?'} est incomplet.`);
    }
    if (theme.personnages.length < 2) {
      throw new ThemeInvalide(`Le thème ${theme.id} doit contenir au moins 2 personnages.`);
    }

    const personnages = [];
    const personnageParId = new Map();
    const criteres = [];
    const questionsParCle = new Map();
    const criteresParCategorie = new Map();
    const idsAttributs = new Set();

    for (const attribut of theme.attributs) {
      if (!attribut.id || idsAttributs.has(attribut.id)) {
        throw new ThemeInvalide(`Attribut absent ou dupliqué dans le thème ${theme.id}.`);
      }
      idsAttributs.add(attribut.id);

      if (attribut.type === 'bool' && attribut.question) {
        const critere = {
          cle: attribut.id,
          type: 'bool',
          attributId: attribut.id,
          attribut,
          question: attribut.question,
          libelleCourt: attribut.nom,
          nomAttribut: attribut.nom,
          categorie: attribut.categorie || 'Autres',
          icone: attribut.icone || '❓'
        };
        criteres.push(critere);
        questionsParCle.set(critere.cle, critere);
      } else if (attribut.type === 'enum' && Array.isArray(attribut.options)) {
        for (const option of attribut.options) {
          if (!option.id || !option.question) continue;
          const critere = {
            cle: `${attribut.id}:${option.id}`,
            type: 'enum',
            attributId: attribut.id,
            optionId: option.id,
            attribut,
            option,
            question: option.question,
            libelleCourt: `${attribut.nom} · ${option.nom}`,
            nomAttribut: attribut.nom,
            nomOption: option.nom,
            categorie: attribut.categorie || 'Autres',
            icone: attribut.icone || '❓'
          };
          criteres.push(critere);
          questionsParCle.set(critere.cle, critere);
        }
      } else {
        console.warn(`Attribut ignoré dans ${theme.id} : type ou question invalide.`, attribut);
      }
    }

    for (const critere of criteres) {
      if (!criteresParCategorie.has(critere.categorie)) {
        criteresParCategorie.set(critere.categorie, {
          nom: critere.categorie,
          icone: critere.icone,
          criteres: []
        });
      }
      criteresParCategorie.get(critere.categorie).criteres.push(critere);
    }

    for (const personnage of theme.personnages) {
      if (!personnage.id || personnageParId.has(personnage.id)) {
        throw new ThemeInvalide(`Personnage absent ou dupliqué dans le thème ${theme.id}.`);
      }
      if (!personnage.nom || !personnage.emoji || !estObjet(personnage.attributs)) {
        throw new ThemeInvalide(`Fiche incomplète pour ${personnage.id}.`);
      }
      personnageParId.set(personnage.id, personnage);
      personnages.push(personnage);
    }

    const modele = {
      ...theme,
      personnages,
      personnageParId,
      criteres,
      questionsParCle,
      criteresParCategorie: Array.from(criteresParCategorie.values()),
      indexParId: new Map(personnages.map((personnage, index) => [personnage.id, index])),
      tousLesIds: personnages.map((personnage) => personnage.id)
    };

    modele.reponse = (personnage, cle) => {
      const critere = questionsParCle.get(cle);
      if (!critere || !personnage) return false;
      const valeur = personnage.attributs[critere.attributId];
      return critere.type === 'bool' ? valeur === true : valeur === critere.optionId;
    };

    modele.obtenirQuestion = (cle) => questionsParCle.get(cle) || null;

    modele.compter = (identifiants, cle) => {
      const critere = questionsParCle.get(cle);
      if (!critere) return 0;
      let total = 0;
      for (const id of identifiants) {
        const personnage = personnageParId.get(id);
        if (personnage && modele.reponse(personnage, cle)) total += 1;
      }
      return total;
    };

    modele.filtrer = (identifiants, cle, reponse) => {
      const ensemble = new Set(identifiants);
      return Array.from(ensemble).filter((id) => {
        const personnage = personnageParId.get(id);
        if (!personnage) return false;
        const valeur = modele.reponse(personnage, cle);
        return reponse ? valeur : !valeur;
      });
    };

    modele.repartition = (identifiants, cle) => {
      const total = identifiants.length;
      const oui = modele.compter(identifiants, cle);
      return {
        oui,
        non: total - oui,
        total,
        ratio: total ? oui / total : 0,
        equilibre: total ? 1 - Math.abs(oui / total - 0.5) * 2 : 0
      };
    };

    modele.detailsPersonnage = (personnage) => {
      return theme.attributs.map((attribut) => {
        const valeur = personnage.attributs[attribut.id];
        if (attribut.type === 'enum') {
          const option = (attribut.options || []).find((element) => element.id === valeur);
          return {
            id: attribut.id,
            nom: attribut.nom,
            categorie: attribut.categorie || 'Autres',
            icone: attribut.icone || '❓',
            valeur: option ? option.nom : String(valeur || '—'),
            estBooleen: false,
            positif: true
          };
        }
        return {
          id: attribut.id,
          nom: attribut.nom,
          categorie: attribut.categorie || 'Autres',
          icone: attribut.icone || '❓',
          valeur: valeur ? 'Oui' : 'Non',
          estBooleen: true,
          positif: valeur === true
        };
      });
    };

    modele.couleurPersonnage = (personnage) => {
      const teinte = U.teinte(personnage.id);
      return {
        teinte,
        fond: `linear-gradient(155deg, hsl(${teinte} 55% 28%), hsl(${(teinte + 42) % 360} 45% 12%))`,
        lueur: `hsl(${teinte} 85% 66%)`
      };
    };

    return modele;
  }

  /**
   * Contrôle l'équilibre (25–75 %) et affiche les avertissements dans la console.
   * L'objectif est de repérer un attribut trop rare ou trop commun pour le jeu.
   */
  function verifierEquilibre(modele) {
    const avertissements = [];
    for (const critere of modele.criteres) {
      const oui = modele.compter(modele.tousLesIds, critere.cle);
      const ratio = oui / modele.personnages.length;
      if (ratio < MIN_RATIO || ratio > MAX_RATIO) {
        avertissements.push({
          theme: modele.nom,
          libelle: critere.libelleCourt,
          oui,
          total: modele.personnages.length,
          ratio
        });
      }
    }

    if (avertissements.length > 0) {
      console.groupCollapsed(
        `⚠ Équilibre du thème « ${modele.nom} » : ${avertissements.length} attribut(s) hors zone 25–75 %`
      );
      for (const avertissement of avertissements) {
        console.warn(
          `${modele.nom} · ${avertissement.libelle} : ${avertissement.oui}/${avertissement.total} ` +
            `(${(avertissement.ratio * 100).toFixed(1)} %).`
        );
      }
      console.groupEnd();
    } else {
      console.info(`✓ Thème « ${modele.nom} » équilibré : tous les critères sont entre 25 et 75 %.`);
    }

    return avertissements;
  }

  async function chargerDepuisFichiers() {
    const controller = new AbortController();
    const minuterie = window.setTimeout(() => controller.abort(), 5000);
    try {
      const urlIndex = new URL('data/themes/index.json', document.baseURI);
      const reponseIndex = await fetch(urlIndex, { signal: controller.signal, cache: 'no-cache' });
      if (!reponseIndex.ok) throw new Error(`Index HTTP ${reponseIndex.status}`);
      const index = await reponseIndex.json();
      if (!Array.isArray(index.themes)) throw new Error('Index sans liste de thèmes.');

      const themes = await Promise.all(
        index.themes.map(async (entree) => {
          const url = new URL(entree.fichier, document.baseURI);
          const reponse = await fetch(url, { signal: controller.signal, cache: 'no-cache' });
          if (!reponse.ok) throw new Error(`${entree.fichier} : HTTP ${reponse.status}`);
          return reponse.json();
        })
      );
      return themes;
    } finally {
      window.clearTimeout(minuterie);
    }
  }

  function chargerDepuisBundle() {
    const bundle = window.QC_THEME_BUNDLE;
    if (!bundle || !Array.isArray(bundle.themes) || bundle.themes.length === 0) {
      throw new Error('Aucun thème disponible dans le bundle local.');
    }
    return bundle.themes;
  }

  const Themes = (QC.Themes = {
    MIN_RATIO,
    MAX_RATIO,
    modeles: [],
    parId: new Map(),
    avertissements: [],
    chargementTermine: false,

    async initialiser() {
      if (this._promesse) return this._promesse;

      this._promesse = (async () => {
        let themesBruts;
        let origine = 'bundle local';

        if (window.location.protocol === 'file:') {
          themesBruts = chargerDepuisBundle();
        } else {
          try {
            themesBruts = await chargerDepuisFichiers();
            origine = 'fichiers JSON';
          } catch (erreur) {
            console.info('Chargement JSON impossible, utilisation du bundle local de secours.', erreur);
            themesBruts = chargerDepuisBundle();
          }
        }

        const modeles = [];
        const avertissements = [];
        for (const theme of themesBruts) {
          try {
            const modele = construireModele(theme);
            modeles.push(modele);
            avertissements.push(...verifierEquilibre(modele));
          } catch (erreur) {
            console.error(`Thème ignoré : ${theme && theme.nom ? theme.nom : '?'}`, erreur);
          }
        }

        if (modeles.length === 0) {
          throw new Error('Aucun thème valide n’a pu être chargé.');
        }

        this.modeles = modeles;
        this.parId = new Map(modeles.map((modele) => [modele.id, modele]));
        this.avertissements = avertissements;
        this.chargementTermine = true;
        console.info(
          `Thèmes chargés depuis ${origine} : ${modeles.length} univers, ` +
            `${modeles.reduce((total, modele) => total + modele.personnages.length, 0)} personnages.`
        );
        return modeles;
      })();

      return this._promesse;
    },

    tous() {
      return this.modeles;
    },

    obtenir(id) {
      return this.parId.get(id) || this.modeles[0] || null;
    },

    obtenirIdValide(id) {
      return this.parId.has(id) ? id : this.modeles[0] ? this.modeles[0].id : 'classique';
    },

    /** Construit les avertissements d'équilibre pour l'écran de développement. */
    rapportEquilibre() {
      return this.modeles.map((modele) => ({
        theme: modele.nom,
        total: modele.personnages.length,
        criteres: modele.criteres.map((critere) => {
          const oui = modele.compter(modele.tousLesIds, critere.cle);
          const ratio = oui / modele.personnages.length;
          return {
            libelle: critere.libelleCourt,
            oui,
            ratio,
            equilibre: ratio >= MIN_RATIO && ratio <= MAX_RATIO
          };
        })
      }));
    }
  });
})();
