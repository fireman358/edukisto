# Gestion clients — Edukisto (gestion.edukisto.win)

Espace privé pour gérer tes clients, tes devis et le suivi de tes factures.
Les factures B2B sont émises via **Accountable** (envoi **Peppol** obligatoire en Belgique depuis le 01/01/2026) ; l'app trace les factures et leur statut (envoyée Peppol / e-mail, payée, en retard).

## Fonctionnalités

- **Connexion unique** : un seul mot de passe, hashé en PBKDF2-SHA256 (jamais stocké en clair), session JWT en cookie `HttpOnly; Secure; SameSite=Strict`, rate-limiting des tentatives (5 échecs / 15 min), `noindex` + CSP.
- **Clients** : nom, société, e-mail, tél., adresse, n° TVA, type B2B/B2C, endpoint Peppol, notes ; recherche ; suppression interdite si des documents y sont liés.
- **Devis** : lignes (description, qté, prix HT), taux de TVA, totaux HT/TTC calculés, validité en jours, statuts (brouillon → envoyé → accepté/refusé), passage en facture en un clic.
- **Factures** : n° auto `F-YYYY-NNN`, date, échéance (J+30 par défaut), montant HT/TVA/TTC, statuts (à envoyer, envoyée Peppol, envoyée e-mail, payée), indicateur « retard », bouton **Récap Accountable** (copie les données à coller dans Accountable pour l'envoi Peppol).
- **Tableau de bord** : CA payé (total/mois), en attente, en retard, devis envoyés/acceptés, liste des factures à relancer, exports CSV (clients/devis/factures).

## Architecture

- `public/` : SPA vanilla (HTML/CSS/JS, aucun build) servie comme assets statiques
- `worker.js` : API Cloudflare Worker (`/api/*` protégé par session, assets sinon)
- `d1/schema.sql` : schéma de la base D1 (SQLite)
- `wrangler.jsonc` : config du Worker (binding D1 `DB`, assets `public/`)

## Mise en ligne

Deux façons : en local (script ci-dessous) ou **100 % via GitHub Actions** (recommandé si tu n'as pas de clone local).

### A. Via GitHub Actions (sans clone local)

1. Ajouter deux secrets dans le repo (Settings → Secrets and variables → Actions → New repository secret) — **ne jamais les coller ailleurs** :
   - `CLOUDFLARE_API_TOKEN` : token API Cloudflare avec Account « Workers Scripts: Edit » + « D1: Edit », et Zone `edukisto.win` « Zone: Read » (+ « Workers Routes: Edit » pour la custom domain automatique)
   - `CLOUDFLARE_ACCOUNT_ID` : visible dans le dashboard Cloudflare (page d'accueil du compte, colonne de droite)
2. Onglet **Actions** → lancer une fois le workflow **« gestion — setup one-shot »** : il crée la base D1 `gestion`, applique `d1/schema.sql` et pose `AUTH_SECRET` (généré aléatoirement dans le runner, jamais affiché). Le `database_id` apparaît dans les logs du run.
3. Renseigner ce `database_id` dans `apps/gestion/wrangler.jsonc` et push sur `main`.
4. Le workflow **« gestion — deploy »** se déclenche alors automatiquement à chaque push sur `main` qui touche `apps/gestion/` (`worker.js`, `public/`, `wrangler.jsonc`, `d1/`) : `wrangler deploy` + tentative d'attache de la custom domain `gestion.edukisto.win` (sinon l'ajouter dans le dashboard : Workers & Pages > gestion > Settings > Domains & Routes).
5. Premier accès : `https://gestion.edukisto.win/` → la première connexion crée le mot de passe (8 caractères min).

### B. En local (wrangler)

Depuis ta machine (wrangler connecté à ton compte Cloudflare), lancer :

```bash
bash apps/gestion/scripts/deploy.sh
```

Le script crée la base D1, renseigne le `database_id` dans `wrangler.jsonc` (à committer), initialise le schéma, génère et pose `AUTH_SECRET` (32 octets aléatoires, jamais affiché), puis déploie. Aucun secret n'est imprimé ni commité.

**Manuel** (équivalent étape par étape) :

1. **Créer la base D1** (gratuit) :
   ```bash
   npx wrangler d1 create gestion
   ```
   Copier le `database_id` affiché dans `wrangler.jsonc`, puis commit + push.

2. **Initialiser les tables** :
   ```bash
   npx wrangler d1 execute gestion --remote --file=d1/schema.sql
   ```

3. **Secret de session** (valeur aléatoire, ne la colle nulle part) :
   ```bash
   openssl rand -hex 32 | npx wrangler secret put AUTH_SECRET
   ```

4. **Déployer** :
   ```bash
   cd apps/gestion && npx wrangler deploy
   ```

5. **Route** : dans le dashboard Cloudflare, ajouter la custom domain `gestion.edukisto.win` sur le Worker `gestion` (Workers & Pages > gestion > Settings > Domains & Routes). Alternative : décommenter `routes` dans `wrangler.jsonc` si le token a les droits sur la zone `edukisto.win`, puis redeployer.

6. **Premier accès** : ouvrir `https://gestion.edukisto.win/`, la première connexion crée le mot de passe (8 caractères min).

## Notes légales (Belgique, 2026)

- Facturation électronique structurée (**Peppol BIS 3.0**, UBL 2.1, EN 16931) obligatoire pour tout le B2B entre assujettis TVA belges, en émission comme en réception. Un PDF par e-mail ne suffit plus en B2B.
- Accountable sert d'access point Peppol certifié : enregistrer son n° TVA sur Peppol via Accountable (gratuit), y créer/envoyer les factures.
- En B2C (particuliers), l'envoi par e-mail reste valable.
- Données clients = données personnelles (RGPD) : l'accès est protégé par mot de passe, l'URL n'est pas indexée, exportez la base régulièrement (`npx wrangler d1 export gestion --remote --output=backup.sql`).
