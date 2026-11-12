# 🥖 Saucissons — commande en ligne

Remplace le Google Form par une vraie app : commande en ligne pour tes amis,
interface admin pour gérer stock, prix, paiements et récap fournisseur.

## Fonctionnalités

**Côté clients** (lien partagé, pas de compte requis)
- Choix des saveurs avec compteur +/− et total en direct
- Nom, prénom, remarques
- IBAN de paiement affiché
- Les saveurs en rupture sont masquées automatiquement

**Côté admin** (onglet « Admin », protégé par mot de passe `demsau`)
- Tableau de toutes les commandes (détail, total, remarques, date)
- Suivi paiements : bascule Payé / Impayé, total impayé affiché
- Suppression d'une commande
- Récapitulatif par saveur + bouton « Copier la liste fournisseur »
- Gestion des saveurs : ajout, modification du prix, masquage/réaffichage (rupture de stock)
- Export CSV de toutes les commandes

## Architecture

- `index.html` : SPA (HTML/CSS/JS vanilla, aucun build nécessaire)
- `functions/api/[[route]].js` : API Cloudflare Pages Functions
- `schema.sql` : schéma de la base D1 (SQLite)
- Branding Edukisto (charte anthracite/bleu, logo, liens vers edukisto.win)

## Mise en ligne (Cloudflare Pages + D1)

1. **Créer la base D1** (gratuit) :
   ```bash
   npx wrangler d1 create saucissons
   ```
   Copier le `database_id` affiché dans `wrangler.toml` (remplacer
   `A_CREER_PUIS_REMPLACER`), puis commit + push.

2. **Initialiser les tables** :
   ```bash
   npx wrangler d1 execute saucissons --remote --file=schema.sql
   ```
   (crée les tables et les 25 saveurs du Google Form)

3. **Lier la base au site** : dans le projet Cloudflare Pages →
   Settings → Functions → D1 database bindings :
   - Variable name : `DB`
   - Database : `saucissons`

   Le mot de passe admin par défaut est `demsau` ; pour le changer, ajoute la
   variable `ADMIN_TOKEN` (elle remplace la valeur par défaut, visible dans le repo public).

4. **Déployer** : connecter le repo dans Cloudflare Pages
   (Build command : vide — Output directory : `/`), puis brancher le domaine.

## Développement local

```bash
npx wrangler d1 execute saucissons --local --file=schema.sql
npx wrangler pages dev .
```
