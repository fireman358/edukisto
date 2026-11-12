#!/usr/bin/env node
/**
 * Petit serveur statique local, sans dépendance.
 * Il ne sert qu'à activer le contexte sécurisé nécessaire au service worker
 * et à l'installation PWA. Aucune logique de jeu ne tourne côté serveur.
 *
 * Usage : node serve.mjs [port]
 */
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.argv[2] || process.env.PORT || 8080);
const HOTE = process.env.HOST || '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

function cheminSur(racine, cheminDemande) {
  const decode = decodeURIComponent(cheminDemande.split('?')[0]);
  const cible = path.resolve(racine, `.${decode}`);
  if (!cible.startsWith(racine + path.sep) && cible !== racine) return null;
  return cible;
}

const serveur = http.createServer(async (requete, reponse) => {
  try {
    const url = new URL(requete.url, `http://${requete.headers.host || 'localhost'}`);
    let cible = cheminSur(RACINE, url.pathname);
    if (!cible) {
      reponse.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      reponse.end('Accès refusé');
      return;
    }

    let info;
    try {
      info = await stat(cible);
    } catch {
      info = null;
    }

    if (info && info.isDirectory()) {
      cible = path.join(cible, 'index.html');
      try {
        info = await stat(cible);
      } catch {
        info = null;
      }
    }

    if (!info || !info.isFile()) {
      reponse.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      reponse.end('Fichier introuvable');
      return;
    }

    const extension = path.extname(cible).toLowerCase();
    const type = TYPES[extension] || 'application/octet-stream';
    const sansCache = extension === '.html' || cible.endsWith('service-worker.js');
    reponse.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': sansCache ? 'no-cache' : 'public, max-age=3600',
      'Service-Worker-Allowed': '/'
    });
    createReadStream(cible).pipe(reponse);
  } catch (erreur) {
    console.error('Erreur serveur :', erreur);
    reponse.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    reponse.end('Erreur interne');
  }
});

serveur.listen(PORT, HOTE, () => {
  console.log('');
  console.log('  QUI SUIS-JE ? — plateau local');
  console.log(`  http://${HOTE}:${PORT}/`);
  console.log('');
  console.log('  Laissez cette fenêtre ouverte. Ctrl+C pour arrêter.');
});
