#!/usr/bin/env node
/**
 * Agrège les thèmes JSON dans un bundle JavaScript.
 *
 * Pourquoi ce bundle ? L'application doit rester utilisable en ouvrant
 * directement index.html (protocole file://). Dans ce cas, fetch() ne peut pas
 * lire les fichiers JSON locaux. Le bundle sert donc de secours hors serveur.
 * En mode servi (http/https), l'application charge les JSON, qui restent la
 * source de vérité, et PWA/offline est assuré par le service worker.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOSSIER_THEMES = path.join(RACINE, 'data', 'themes');
const INDEX = path.join(DOSSIER_THEMES, 'index.json');
const SORTIE = path.join(RACINE, 'data', 'themes.bundle.js');

async function lireJson(fichier) {
  return JSON.parse(await readFile(fichier, 'utf8'));
}

async function principal() {
  const index = await lireJson(INDEX);
  const themes = [];

  for (const entree of index.themes) {
    const fichier = path.join(RACINE, entree.fichier);
    const theme = await lireJson(fichier);
    themes.push(theme);
    console.log(`  ✓ ${theme.emoji}  ${theme.nom} (${theme.personnages.length} personnages)`);
  }

  const charge = {
    version: index.version,
    genereLe: new Date().toISOString(),
    themes
  };

  const contenu = `/* Fichier généré par scripts/build-themes.mjs — ne pas modifier à la main.
 * Les sources de vérité sont les fichiers data/themes/*.json.
 * Ce bundle permet à l'application de fonctionner sans serveur (file://).
 */
window.QC_THEME_BUNDLE = ${JSON.stringify(charge, null, 2)};
`;

  await writeFile(SORTIE, contenu, 'utf8');
  console.log(`\nBundle écrit : ${path.relative(RACINE, SORTIE)} (${(Buffer.byteLength(contenu) / 1024).toFixed(1)} Ko)`);
}

principal().catch((erreur) => {
  console.error('Impossible de générer le bundle des thèmes :', erreur);
  process.exitCode = 1;
});
