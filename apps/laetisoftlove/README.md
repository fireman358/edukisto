# Espace Manager — Soft Love by Nadine

Petit site interne (100 % statique, aucun serveur ni dépendance) destiné à la manager
Soft Love et à ses Love Coachs.

## Contenu

- **Guides & Process** : les procédures extraites des guides Soft Love (commandes points,
  échanges/SAV, SAV produit défectueux, suivi de démo, clôture de démo, panier moyen,
  fidélisation post-démo, événements, histoire et valeurs, revenus, carrière, back office).
- **FAQ** : questions/réponses pré-remplies d'après les guides. La manager peut
  **ajouter, modifier, supprimer** des questions, filtrer par catégorie et par recherche.
  Les données sont conservées automatiquement dans le navigateur (localStorage) et
  peuvent être **exportées / importées en JSON** (sauvegarde ou partage entre appareils).
- **Contact & Modèles** : 10 modèles de mails et messages prêts à copier (relance,
  récapitulatif J-3 mois, invitations J-2 mois, commande points, groupe à J-15,
  rappel hôtesse, confirmation veille, remerciement, collaboration, SMS),
  points de retour et rappels importants.

## Utilisation

Ouvrir simplement `index.html` dans un navigateur (double-clic suffit).

> ⚠️ Les FAQ personnalisées sont stockées dans le navigateur. Pour les conserver lors
> d'un changement d'ordinateur ou pour les partager, utiliser le bouton **Exporter** et
> garder le fichier JSON.

## Fichiers

- `index.html` — structure et contenu des guides
- `styles.css` — thème (rose/prune, typographie Playfair Display + Jost)
- `app.js` — logique FAQ (CRUD, recherche, filtres, import/export, copie des modèles)

## Note

Les references à Estefania Portorreal (manager citée dans le manuel original) ont été
retirées : le site est préparé pour la nouvelle manager. Nadine Vanhoegaerden est la
CEO de By Nadine Events / Soft Love.

## Synchronisation cloud (Cloudflare D1)

La synchro multi-appareils passe par le Worker `worker.js` (route `/api/sync`),
reliée à la base D1 `laetisoftlove` (table `app_data` : clés `faq` et `team`).
L'accès est protégé par le même secret d'équipe (header `x-app-secret`) qu'auparavant.

Mise en place :
1. Créer la base D1 `laetisoftlove` (gratuite) et renseigner son `database_id`
   dans `wrangler.toml`.
2. Initialiser : `npx wrangler d1 execute laetisoftlove --remote --file=schema.sql`
   (le schema inclut les données équipe transférées depuis Supabase).
3. Liaison D1 : définie dans `wrangler.toml` (binding `DB`) — vérifier dans le dashboard
   du Worker (Settings > Bindings) qu’elle apparaît bien.
