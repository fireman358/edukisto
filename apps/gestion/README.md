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

## Mise en ligne (Cloudflare Worker + D1)

1. **Créer la base D1** (gratuit) :
   ```bash
   npx wrangler d1 create gestion
   ```
   Copier le `database_id` affiché dans `wrangler.jsonc`, puis commit + push.

2. **Initialiser les tables** :
   ```bash
   npx wrangler d1 execute gestion --remote --file=d1/schema.sql
   ```

3. **Secret de session** :
   ```bash
   npx wrangler secret put AUTH_SECRET   # coller une chaîne aléatoire longue
   ```

4. **Déployer** :
   ```bash
   npx wrangler deploy
   ```

5. **Route** : dans le dashboard Cloudflare, ajouter la custom domain `gestion.edukisto.win` sur le Worker `gestion`.

6. **Premier accès** : ouvrir `https://gestion.edukisto.win/`, la première connexion crée le mot de passe (8 caractères min).

## Notes légales (Belgique, 2026)

- Facturation électronique structurée (**Peppol BIS 3.0**, UBL 2.1, EN 16931) obligatoire pour tout le B2B entre assujettis TVA belges, en émission comme en réception. Un PDF par e-mail ne suffit plus en B2B.
- Accountable sert d'access point Peppol certifié : enregistrer son n° TVA sur Peppol via Accountable (gratuit), y créer/envoyer les factures.
- En B2C (particuliers), l'envoi par e-mail reste valable.
- Données clients = données personnelles (RGPD) : l'accès est protégé par mot de passe, l'URL n'est pas indexée, exportez la base régulièrement (`npx wrangler d1 export gestion --remote --output=backup.sql`).
