#!/usr/bin/env node
/**
 * Validation des thèmes « Qui suis-je ? »
 *
 * Vérifie :
 *  - l'index et la présence des fichiers ;
 *  - 24 ou 48 personnages par thème, identifiants uniques ;
 *  - les attributs booléens et énumérés, leurs options et leurs valeurs ;
 *  - l'équilibre de chaque critère de question : entre 25 % et 75 %.
 *
 * Les déséquilibres sont des AVERTISSEMENTS (pas des erreurs), comme demandé :
 * certains peuples ou classes sont naturellement rares dans un thème.
 * Code de sortie 1 uniquement en cas d'erreur structurelle.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOSSIER_THEMES = path.join(RACINE, 'data', 'themes');
const INDEX = path.join(DOSSIER_THEMES, 'index.json');
const MIN_RATIO = 0.25;
const MAX_RATIO = 0.75;
const TAILLES_AUTORISEES = [24, 48];

const erreurs = [];
const avertissements = [];

async function lireJson(fichier) {
  return JSON.parse(await readFile(fichier, 'utf8'));
}

function estObjet(valeur) {
  return valeur !== null && typeof valeur === 'object' && !Array.isArray(valeur);
}

function verifierTheme(theme, entreeIndex, fichiersUtilises) {
  const etiquette = `${theme.nom || entreeIndex.id} [${entreeIndex.id}]`;
  const prefixeErreur = `${etiquette} :`;

  if (!theme.id || theme.id !== entreeIndex.id) {
    erreurs.push(`${prefixeErreur} l'id du thème ne correspond pas à l'index.`);
  }
  if (!theme.nom || !theme.emoji) {
    erreurs.push(`${prefixeErreur} nom ou emoji manquant.`);
  }
  if (!Array.isArray(theme.attributs) || theme.attributs.length === 0) {
    erreurs.push(`${prefixeErreur} aucun attribut déclaré.`);
    return;
  }
  if (!Array.isArray(theme.personnages)) {
    erreurs.push(`${prefixeErreur} la liste des personnages est absente.`);
    return;
  }
  if (!TAILLES_AUTORISEES.includes(theme.personnages.length)) {
    erreurs.push(`${prefixeErreur} ${theme.personnages.length} personnages (attendu : 24 ou 48).`);
  }

  const idsAttributs = new Set();
  const criteres = [];
  for (const attribut of theme.attributs) {
    if (!attribut.id || idsAttributs.has(attribut.id)) {
      erreurs.push(`${prefixeErreur} attribut sans id ou id dupliqué (${attribut.id}).`);
      continue;
    }
    idsAttributs.add(attribut.id);
    if (!attribut.nom || !attribut.categorie) {
      erreurs.push(`${prefixeErreur} attribut ${attribut.id} sans nom ou catégorie.`);
    }

    if (attribut.type === 'bool') {
      if (!attribut.question) {
        erreurs.push(`${prefixeErreur} attribut ${attribut.id} sans question.`);
      }
      criteres.push({
        cle: attribut.id,
        type: 'bool',
        attribut,
        libelle: attribut.nom
      });
    } else if (attribut.type === 'enum') {
      if (!Array.isArray(attribut.options) || attribut.options.length < 2) {
        erreurs.push(`${prefixeErreur} attribut enum ${attribut.id} sans options valides.`);
        continue;
      }
      const idsOptions = new Set();
      for (const option of attribut.options) {
        if (!option.id || idsOptions.has(option.id) || !option.nom || !option.question) {
          erreurs.push(`${prefixeErreur} option invalide ou dupliquée dans ${attribut.id}.`);
          continue;
        }
        idsOptions.add(option.id);
        criteres.push({
          cle: `${attribut.id}:${option.id}`,
          type: 'enum',
          attribut,
          option,
          libelle: `${attribut.nom} — ${option.nom}`
        });
      }
    } else {
      erreurs.push(`${prefixeErreur} attribut ${attribut.id} de type inconnu (${attribut.type}).`);
    }
  }

  const idsPersonnages = new Set();
  for (const personnage of theme.personnages) {
    if (!personnage.id || idsPersonnages.has(personnage.id)) {
      erreurs.push(`${prefixeErreur} personnage sans id ou id dupliqué (${personnage.id}).`);
      continue;
    }
    idsPersonnages.add(personnage.id);
    if (!personnage.nom || !personnage.emoji) {
      erreurs.push(`${prefixeErreur} personnage ${personnage.id} sans nom ou emoji.`);
    }
    if (!estObjet(personnage.attributs)) {
      erreurs.push(`${prefixeErreur} personnage ${personnage.id} sans objet attributs.`);
      continue;
    }

    const clesFournies = Object.keys(personnage.attributs);
    for (const cle of clesFournies) {
      if (!idsAttributs.has(cle)) {
        erreurs.push(`${prefixeErreur} ${personnage.id} possède l'attribut inconnu « ${cle} ».`);
      }
    }

    for (const attribut of theme.attributs) {
      if (!(attribut.id in personnage.attributs)) {
        erreurs.push(`${prefixeErreur} ${personnage.id} n'a pas de valeur pour ${attribut.id}.`);
        continue;
      }
      const valeur = personnage.attributs[attribut.id];
      if (attribut.type === 'bool' && typeof valeur !== 'boolean') {
        erreurs.push(`${prefixeErreur} ${personnage.id}.${attribut.id} doit être un booléen.`);
      }
      if (attribut.type === 'enum') {
        const options = new Set((attribut.options || []).map((option) => option.id));
        if (!options.has(valeur)) {
          erreurs.push(`${prefixeErreur} ${personnage.id}.${attribut.id} vaut « ${valeur} », option inconnue.`);
        }
      }
    }
  }

  // --- Équilibre de chaque critère -----------------------------------------
  const total = theme.personnages.length;
  const resultats = [];
  for (const critere of criteres) {
    let possede = 0;
    for (const personnage of theme.personnages) {
      const valeur = personnage.attributs?.[critere.attribut.id];
      if (critere.type === 'bool' ? valeur === true : valeur === critere.option.id) {
        possede += 1;
      }
    }
    const ratio = total ? possede / total : 0;
    const equilibre = ratio >= MIN_RATIO && ratio <= MAX_RATIO;
    resultats.push({ ...critere, possede, ratio, equilibre });
    if (!equilibre) {
      avertissements.push(
        `${etiquette} : « ${critere.libelle} » = ${possede}/${total} (${(ratio * 100).toFixed(1)} %) — hors de la zone 25–75 %.`
      );
    }
  }

  const horsZone = resultats.filter((resultat) => !resultat.equilibre).length;
  const statut = horsZone === 0 ? '✓ équilibré' : `⚠ ${horsZone} critère(s) déséquilibré(s)`;
  console.log(`\n${theme.emoji}  ${theme.nom} — ${total} personnages, ${theme.attributs.length} attributs / ${criteres.length} questions`);
  console.log(`   ${statut}`);

  // Détail utile en console pour l'équilibrage du thème.
  for (const resultat of resultats) {
    const barre = '█'.repeat(Math.round(resultat.ratio * 12)).padEnd(12, '·');
    const alerte = resultat.equilibre ? ' ' : '⚠';
    console.log(
      `   ${alerte} ${barre} ${String(resultat.possede).padStart(2)}/${total}  ${(resultat.ratio * 100).toFixed(1).padStart(5)} %  ${resultat.libelle}`
    );
  }

  fichiersUtilises.add(path.join(RACINE, entreeIndex.fichier));
}

async function principal() {
  let index;
  try {
    index = await lireJson(INDEX);
  } catch (erreur) {
    console.error(`Impossible de lire ${INDEX} :`, erreur.message);
    process.exitCode = 1;
    return;
  }

  if (!Array.isArray(index.themes) || index.themes.length === 0) {
    console.error('L’index des thèmes ne contient aucun thème.');
    process.exitCode = 1;
    return;
  }

  console.log('Validation des thèmes « Qui suis-je ? »');
  console.log(`Zone d'équilibre attendue : ${MIN_RATIO * 100} % – ${MAX_RATIO * 100} %\n`);

  const fichiersUtilises = new Set();
  for (const entree of index.themes) {
    const fichier = path.join(RACINE, entree.fichier);
    let theme;
    try {
      theme = await lireJson(fichier);
    } catch (erreur) {
      erreurs.push(`Index : impossible de lire ${entree.fichier} (${erreur.message}).`);
      continue;
    }
    verifierTheme(theme, entree, fichiersUtilises);
  }

  if (avertissements.length > 0) {
    console.log('\n' + '─'.repeat(72));
    console.log(`AVERTISSEMENTS D'ÉQUILIBRE (${avertissements.length})`);
    console.log('Ces attributs restent jouables, mais divisent le plateau de façon déséquilibrée.');
    for (const message of avertissements) {
      console.log(`  ⚠ ${message}`);
    }
  }

  if (erreurs.length > 0) {
    console.log('\n' + '─'.repeat(72));
    console.log(`ERREURS (${erreurs.length})`);
    for (const message of erreurs) {
      console.log(`  ✗ ${message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('\n' + '─'.repeat(72));
  console.log(`✓ Structure valide : ${index.themes.length} thèmes, aucun doublon, toutes les valeurs renseignées.`);
  console.log(
    avertissements.length === 0
      ? '✓ Tous les critères sont dans la zone d’équilibre 25–75 %.'
      : `⚠ ${avertissements.length} avertissement(s) d'équilibre — aucune erreur bloquante.`
  );
}

principal().catch((erreur) => {
  console.error('Erreur inattendue pendant la validation :', erreur);
  process.exitCode = 1;
});
