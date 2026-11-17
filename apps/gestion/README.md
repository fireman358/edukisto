# Gestion clients — Edukisto

Outil interne pour gérer les clients, les devis et le **suivi** des factures d'Edukisto.
Les factures officielles sont émises dans **Accountable** (Peppol, lié au compte bancaire) : l'app garde la trace commerciale, les devis, les relances et les copies de travail.

> L'app n'est pas le document comptable officiel. Le PDF d'une facture est une copie de travail ; le numéro `F-…` est une référence interne. Le numéro Accountable/Peppol se saisit dans le champ « N° Accountable ».

## Fonctionnalités

- **Clients** : nom, société, e-mail, tél., adresse multiligne, TVA, type B2B/B2C, endpoint Peppol, statut (prospect/actif/inactif), notes, historique des devis/factures, CA payé et encours.
- **Devis** : lignes détaillées, catalogue de prestations, TVA, validité, date de prestation, notes/conditions, statuts (brouillon → envoyé → accepté/refusé/expiré), édition, duplication, conversion en facture en un clic (avec copie des lignes).
- **Factures** : numéro interne automatique, lignes ou montant global, saisie HT ou TTC, date d'échéance, date de prestation, statuts (à envoyer / envoyée Peppol / envoyée e-mail / payée), date et moyen de paiement, relances tracées, n° et lien Accountable, duplication.
- **Prestations** : catalogue réutilisable dans les devis et factures (description, prix HT, TVA, unité, actif/inactif).
- **Mode test** : tout document ou client peut être marqué « test ». Il est exclu par défaut des statistiques et des exports, et le PDF porte la mention « EXEMPLE ».
- **Tableau de bord** : encaissé du mois/année, en attente, en retard, à envoyer, devis à relancer, jauge de seuil de franchise, encaissements sur 6 mois.
- **Exports CSV** : clients, devis, factures, prestations — séparateur `;`, BOM UTF-8, guillemets et neutralisation des formules Excel.
- **Sécurité** : mot de passe PBKDF2-SHA256, session JWT avec `jti` révocable en base, cookie `HttpOnly; Secure; SameSite=Strict`, limitation des tentatives, changement de mot de passe, révocation de toutes les sessions, CSP, HTTPS forcé + HSTS.

## Architecture

- `public/` : SPA vanilla (aucun build) servie comme assets statiques.
- `worker.js` : API Cloudflare Worker (`/api/*`) + assets.
- `lib/core.js` : logique pure testable (argent en centimes, dates Bruxelles, CSV, noms clients).
- `d1/schema.sql` : schéma complet pour une installation neuve.
- `d1/migrations/` : migrations pour une base existante.
- `tests/core.test.mjs` : tests unitaires (`node --test`).
- `wrangler.jsonc` : binding D1 `DB` + assets `public/`.

## Développement local

```bash
cd apps/gestion
npm test
npm run dev        # http://127.0.0.1:8787
```

Le premier accès crée le mot de passe (10 caractères minimum). En local, `wrangler dev` utilise une base D1 locale dans `.wrangler/` (ignorée par Git).

## Mise en ligne

### Installation neuve

1. Créer la base D1 :
   ```bash
   npx wrangler d1 create gestion
   ```
   Copier le `database_id` dans `wrangler.jsonc`.
2. Appliquer le schéma :
   ```bash
   npx wrangler d1 execute gestion --remote --file=d1/schema.sql
   ```
3. Poser le secret de session :
   ```bash
   openssl rand -hex 32 | npx wrangler secret put AUTH_SECRET
   ```
4. Déployer :
   ```bash
   npx wrangler deploy
   ```
5. Ajouter la custom domain `gestion.edukisto.win` (dashboard Cloudflare ou workflow GitHub Actions).

### Base existante (migration 0002)

La migration ajoute les colonnes du mode test, des lignes de facture, des relances, du n° Accountable, des sessions et du catalogue. **À appliquer avant de déployer le nouveau Worker** :

```bash
cd apps/gestion
npx wrangler d1 execute gestion --remote --file=d1/migrations/0002_outil_complet.sql
```

La migration n'est pas idempotente : ne la relance pas. Pour une base neuve, utilise `d1/schema.sql`, qui contient déjà tout.

### Via GitHub Actions

Les workflows du repo :

- **gestion — deploy** : tests puis `wrangler deploy` + custom domain, à chaque push sur `main` touchant `apps/gestion`.
- **gestion — tests** : tests unitaires sur les pull requests.
- **gestion — sauvegarde D1** : export quotidien chiffré (voir ci-dessous).
- **gestion — setup one-shot** : création D1 + schéma + premier déploiement + `AUTH_SECRET`.

Secrets nécessaires : `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, et `BACKUP_PASSPHRASE` pour la sauvegarde.

## Sauvegardes

Le workflow `gestion — sauvegarde D1` exporte la base chaque nuit à 03:00 UTC, la chiffre en AES-256 avec `BACKUP_PASSPHRASE`, et publie l'artefact `.sql.gpg` (rétention 30 jours).

Restaurer :

```bash
gpg --decrypt gestion-YYYYMMDD.sql.gpg > backup.sql
npx wrangler d1 execute gestion --remote --file=backup.sql
```

D1 Time Travel reste disponible en complément (30 jours en offre payante, 7 jours en gratuité). Une sauvegarde n'est valide que si tu as déjà testé une restauration sur une base jetable.

## Notes

- **Factures officielles** : Accountable / Peppol. L'app ne produit pas d'UBL et ne remplace pas Accountable.
- **Mention de franchise** : « Régime particulier de franchise des petites entreprises — TVA non applicable (art. 56bis du Code TVA) ».
- **Mode test** : les documents `TEST` sont exclus des stats et des exports par défaut ; le bouton « Inclure les tests » les affiche.
- **Données personnelles** : accès protégé, exports à manipuler avec précaution, sauvegardes chiffrées.
- **Numérotation** : compteur atomique en base (`counters`), jamais réutilisé après suppression ; le numéro reste une référence interne.
