# Edukisto Home · edukisto

**Calendrier familial tout-en-un** pour tablette murale ou sur pied — inspiré du NewYes eCalendar, **sans abonnement, sans cloud, sans compte**. Toutes les données restent sur l'appareil (localStorage) ou dans le dépôt Git.

## ✨ Fonctionnalités

| Onglet | Contenu |
|---|---|
| ☀️ **Aujourd'hui** | Tout le résumé du jour : anniversaires, fériés, vacances scolaires, événements, repas de la semaine, tâches du jour, classement des points |
| 📅 **Calendrier** | Vue mois colorée (anniversaires 🎂, fériés 🎉, vacances 🏖️, événements par type), événements manuels + **import Google Calendar (.ics fichier ou URL agenda partagé)** |
| 🍽️ **Repas** | Planificateur hebdo intégré avec **toute la bibliothèque Keskonmange Lulu** (81 plats, 9 catégories) et le bouton **🎲 Générer la semaine** qui respecte les règles : légumes illimités, 1× max par catégorie, « à commander » seulement si pas de crasses |
| ✅ **Tâches** | Tâches avec points (5/10/20 selon difficulté), **objectifs & récompenses** pour motiver les enfants, barres de progression |
| 🛒 **Listes** | Listes de courses et autres, cochables |
| 🖼️ **Album** | Photos de famille (upload navigateur ou dossier `Photos/`) + **mode cadre photo** plein écran |
| ⚙️ **Réglages** | Membres avec code couleur, export/import JSON, **import direct des données de calfam.edukisto.win**, mode sombre, mode kiosque |

## 🚀 Installation sur la tablette

1. Créez un dépôt GitHub et poussez ce dossier (`git init`, `git add -A`, `git commit`, `git push`)
2. Activez **GitHub Pages** (Settings → Pages → branche `main`, dossier `/`)
3. Ouvrez l'URL `https://<votre-user>.github.io/<repo>/` dans le navigateur de la tablette
4. Menu navigateur → **"Ajouter à l'écran d'accueil"** pour un plein écran type app

Alternative sans GitHub : copiez le dossier sur la tablette et ouvrez `index.html` directement.

## 📥 Récupérer les données existantes

- **calfam.edukisto.win** : dans calfam, bouton **Exporter** (JSON) → ici, onglet Réglages → **Importer calfam**. Anniversaires, fériés, vacances et événements sont repris. Copiez aussi le dossier `Photos/` de calfam dans `Photos/` (et créez `Photos/photos-manifest.json` listant les noms de fichiers pour l'affichage auto).
- **Google Calendar privé** : Google Agenda → Paramètres de l'agenda → **Importer et exporter** → téléchargez le `.ics`, ou copiez l'**URL secrète au format iCal** de l'agenda partagé (Paramètres → Adresse secrète au format iCal) et collez-la dans l'onglet Calendrier. Les événements apparaissent dans le calendrier (marqués « importé »).

> 💡 Pour que l'import par URL fonctionne, l'URL doit être accessible publiquement (agenda partagé "Tout le monde avec le lien"). Sinon, utilisez le fichier `.ics`.

## 🗂️ Structure

```
index.html                  — interface (7 vues)
css/style.css               — charte de marque edukisto (anthracite #333333, surface #3d3d3d, accent #38bdf8, teal #0e7490)
js/app.js                   — logique complète
js/storage.js               — persistance localStorage
donnees/donnees-initiales.js— plats Keskonmange, fériés BE, vacances scolaires BE
Photos/                     — album familial
test-smoke.js               — tests (node test-smoke.js)
```

## ☁️ Synchronisation avec calfam & repas — deux modes au choix

### Mode 1 — Local (sans cloud, recommandé si le PC reste allumé)

Un mini-serveur Node **sans aucune dépendance** : [`serveur-sync.js`](serveur-sync.js). Il stocke les données dans `sync-donnees.json` à côté de lui et imite l'API Supabase — aucune modification dans les apps.

Sur le PC qui centralise (allumé quand vous consultez la tablette) :

```bash
node serveur-sync.js            # local uniquement
node serveur-sync.js 0.0.0.0    # partagé : accessible depuis la tablette et les autres PC du réseau
```

Relevez l'IP du PC (`ipconfig` / `ip a`), par ex. `192.168.1.20`, puis dans chaque app (calfam, repas, Edukisto Home → Réglages → ☁️ Cloud) :
- **URL du Cloud** : `http://192.168.1.20:8788`
- **Clé anon** : `local`
- **Jeton** : le même mot de passe familial partout

⚠️ Deux limites du mode local :
- Les apps étant servies en **https** (Cloudflare), le navigateur peut bloquer l'appel vers un serveur **http** local (mixed content). Si ça arrive : soit gardez l'app tablette en **http** aussi (pas de TLS sur le réseau maison, acceptable chez vous), soit utilisez le mode 2 pour la partie en ligne et le mode 1 en secours.
- Le PC serveur doit rester allumé. Option : `node serveur-sync.js 0.0.0.0` en tâche planifiée au démarrage.

### Mode 2 — Cloud (worker `cal-sync` · Cloudflare D1)

Tout en ligne, sans Supabase : un Worker Cloudflare unique ([`worker-cal-sync/`](worker-cal-sync)) sert les endpoints de synchro sur **https://sync.edukisto.win**, avec la base D1 `cal_sync` (table `famille_sync` : id, jeton, contenu chiffré, maj).

- `GET /api/sync?jeton=<id>` — récupérer le bloc chiffré
- `POST /api/sync` — enregistrer (upsert) le bloc chiffré tel quel
- `POST /api/ics` (paramètre `p_url`) — proxy ICS des agendas Google

CORS limité aux apps `ecal.edukisto.win`, `calfam.edukisto.win` et `repas.edukisto.win`. Déploiement : `cd worker-cal-sync && npx wrangler deploy` (binding D1 `DB` configuré dans `wrangler.toml`, custom domain `sync.edukisto.win`).

1. Choisissez un **jeton secret familial** (mot de passe partagé) — il protège vos données : sans lui, rien n'est lisible (chiffrement AES-GCM côté navigateur)
2. Dans chaque app, saisissez : URL `https://sync.edukisto.win` + le même jeton (les anciennes configs Supabase sont migrées automatiquement)
3. calfam → **☁️ Publier** ; repas → **☁️ Publier** — Edukisto Home affiche tout, refresh 5 min

Les deux modes partagent le même code côté apps (`js/sync.js`) : vous pouvez passer de l'un à l'autre en changeant l'URL dans la config.

Architecture : **calfam** (calendrier) et **repas** (Keskonmange) sont les outils d'édition ; **Edukisto Home** est l'écran de consultation (tablette murale). Le lien entre eux passe par le worker `cal-sync` : les données sont chiffrées dans le navigateur (AES-GCM, clé dérivée du jeton familial) et stockées telles quelles dans D1 — illisibles sans le jeton.

## 💾 Sauvegarde

Les données vivent dans le navigateur de la tablette. Faites régulièrement **Réglages → Exporter** pour garder une copie JSON. Aucune donnée n'est envoyée sur un serveur.

---
edukisto — relier & orienter.
