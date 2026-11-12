# Edukisto — monorepo

Un seul dépôt pour le site vitrine edukisto.win et toutes les applications.

## Structure

- `site/` : le site vitrine edukisto.win (HTML/CSS/JS statique, déployé via Cloudflare)
- `apps/<nom>/` : une application par dossier, autonome
- `shared/` : assets et éléments communs (logo, favicons, charte de couleurs, polices)

## Règles

1. Une session = une tâche = un seul périmètre. Ne jamais modifier un dossier d'application qui n'est pas concerné par la demande en cours.
2. Les assets communs vivent dans `shared/`. Aucune application ne duplique ces fichiers : elle les référence depuis `shared/` ou les copie depuis `shared/assets` lors d'un changement explicite de charte.
3. Un changement transversal (ex: nouveau logo) se traite en une seule session : mise à jour de `shared/`, puis application aux dossiers concernés, un commit par dossier.
4. Commit et push après chaque étape fonctionnelle terminée, pas seulement à la fin de la tâche.
5. Chaque application reste autonome et déployable seule : aucun couplage de build entre applications.
6. Ne jamais créer un nouveau projet ou une nouvelle application sans demande explicite.
7. Les dossiers d'application ne déclarent pas de périmètre externe : toute demande qui ne concerne pas ce dossier doit être signalée à l'utilisateur au lieu d'être exécutée.

## Déploiements

- edukisto.win : dossier `site/`, via Cloudflare Pages/Workers.
- saucissons : Cloudflare Worker (wrangler), dossier `apps/saucissons/`.

## Conventions

- Front : HTML/CSS/JS vanilla sauf indication contraire.
- Noms de dossiers et de fichiers en minuscules, sans espaces (les noms hérités des anciens repos sont conservés pour la traçabilité).
