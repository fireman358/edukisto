/**
 * Construit une version « double-clic » du jeu : un seul fichier HTML,
 * scripts et styles intégrés, sans module ES (que les navigateurs bloquent
 * en `file://`).
 *
 *   npm run build:file
 *
 * Produit `td-wars.html` à la racine. `esbuild` est fourni par Vite : le script
 * doit donc être lancé via npm (qui ajoute node_modules/.bin au PATH).
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = '.tmp/file';
const TARGET = 'td-wars.html';

mkdirSync(OUT_DIR, { recursive: true });

/** Binaire esbuild fourni par Vite (évite toute dépendance au PATH). */
function esbuildBin() {
  const arm = process.arch === 'arm64' ? 'arm64' : 'x64';
  const candidates =
    process.platform === 'win32'
      ? [`node_modules/@esbuild/win32-${arm}/esbuild.exe`]
      : process.platform === 'darwin'
        ? [`node_modules/@esbuild/darwin-${arm}/bin/esbuild`]
        : [`node_modules/@esbuild/linux-${arm}/bin/esbuild`];
  return candidates.find((path) => existsSync(path)) ?? 'esbuild';
}

const BIN = esbuildBin();

const run = (cmd) => {
  process.stdout.write(`> ${cmd}\n`);
  execSync(cmd, { stdio: 'inherit' });
};

// 1. Application en IIFE (pas de module ES) + CSS, les deux minifiés
run(`"${BIN}" src/main.ts --bundle --minify --format=iife --target=es2020 --outfile=${join(OUT_DIR, 'app.js')}`);
run(`"${BIN}" src/style.css --bundle --minify --outfile=${join(OUT_DIR, 'app.css')}`);

const js = readFileSync(join(OUT_DIR, 'app.js'), 'utf8');
const css = readFileSync(join(OUT_DIR, 'app.css'), 'utf8');

// 2. On part du vrai index.html : une seule source de vérité pour le balisage
let html = readFileSync('index.html', 'utf8');
const cssTag = /<link rel="stylesheet" href="\/src\/style\.css" \/>/;
const jsTag = /<script type="module" src="\/src\/main\.ts"><\/script>/;
if (!cssTag.test(html) || !jsTag.test(html)) {
  throw new Error('index.html a changé : les balises CSS/JS attendues sont introuvables.');
}
html = html.replace(cssTag, () => `<style>\n${css}\n</style>`);
html = html.replace(jsTag, () => `<script>\n${js}\n</script>`);

// 3. Un repère pour savoir d'où vient le fichier
html = html.replace(
  '<body>',
  `<body>\n    <!-- Version autonome générée par npm run build:file — ouvrable en double-clic. -->`
);

writeFileSync(TARGET, html, 'utf8');
const size = statSync(TARGET).size;
process.stdout.write(`\n${TARGET} écrit (${(size / 1024).toFixed(0)} Ko). Double-clic pour jouer.\n`);
