# Déploiement & infrastructure

## Architecture actuelle (v6 — production)

```
GitHub (fireman358/barakfix)
   │  git push (moi, depuis mon sandbox)
   ▼
Cloudflare Pages — build automatique
   │  npm run build  →  dist/
   │  + functions/api/*  (Pages Functions)
   ▼
https://barakfix.edukisto.win  (+ barakfix.pages.dev)
   │
   ▼
Cloudflare D1 (SQLite) — base "barakfix"
```

## Composants

| Composant | Service | Plan |
|---|---|---|
| Code source & sauvegarde | GitHub (dépôt privé) | Gratuit |
| Frontend + fonctions | Cloudflare Pages | Gratuit |
| Base de données | Cloudflare D1 | Gratuit |

**Coût total : 0 €** — tout est sur les plans gratuits Cloudflare + GitHub.

## Workflow de déploiement (depuis cette session IA)

1. Je modifie le code dans mon sandbox (clone du dépôt)
2. `npm run build` → vérifie que TypeScript et le build passent (zéro erreur)
3. `git commit` + `git push` sur `main`
4. Cloudflare détecte le push → rebuild → redéploiement automatique (1-2 minutes)
5. Vérification sur https://barakfix.edukisto.win

Plus aucun fichier sur PC, plus de wrangler, plus de xcopy, plus de Drive.

## Configuration Cloudflare Pages (déjà en place)

- **Build command** : `npm run build`
- **Build output directory** : `dist`
- **Pages Functions** : dossier `functions/` à la racine du dépôt → routes `/api/*` automatiquement
- **Domaine personnalisé** : `barakfix.edukisto.win` (DNS géré par Cloudflare)
- **Variables d'environnement** (runtime, dashboard Cloudflare) : `AUTH_SECRET` (secret JWT des sessions bailleur et locataire), `RESEND_API_KEY`, `RESEND_FROM`, `APP_URL`
- **Liaison D1** : binding `DB` → base `barakfix` (déclaré dans `wrangler.toml`)

⚠️ **Point de vigilance** : les variables `VITE_*` sont lues **au build**. Si on les change dans le dashboard, il faut relancer un déploiement (Retry deployment) pour qu'elles soient ré-embarquées dans le JavaScript. Les variables des fonctions (`SUPABASE_*`), elles, sont lues à l'exécution — modification immédiate sans rebuild.

## Base de données — migrations SQL

Exécutées manuellement dans le **SQL Editor Supabase** (pas d'automatisme) :

| Migration | Contenu | Statut prod |
|---|---|---|
| 001_schema.sql | Tables, enums, triggers | ✅ exécutée |
| 002_rls.sql | RLS complète + fonctions SQL | ✅ exécutée |
| 003_seed.sql | Données de démo | ✅ exécutée |
| 004_owner_cascade.sql | Cascade suppression bailleur | ✅ exécutée |
| 005_fix_jwt_role.sql | current_tenant_id() tolérante | ✅ exécutée |
| 006_add_owner_read.sql | Colonne owner_read | ✅ exécutée |

**Règle pour l'avenir** : toute nouvelle migration SQL (fichier `supabase/migrations/00X_*.sql`) doit être exécutée manuellement dans le SQL Editor — je fournirai toujours le fichier et le signalerai explicitement.

## Cron-job.org — maintien d'activité Supabase

Le plan gratuit Supabase met en pause les projets inactifs (~7 jours). Un ping quotidien évite ça :
- URL : `https://ghnwmqsvvvezvfmjneep.supabase.co/rest/v1/properties?select=id&apikey=<publishable key>`
- Fréquence : tous les jours — statut « Success » confirmé

## Sauvegarde
- **Code** : GitHub (historique versionné) — source de vérité
- **Données** : Supabase (à ce jour aucune sauvegarde automatique — voir roadmap : export SQL périodique via pg_dump ou dump Supabase)

## Problèmes connus / à discuter
- Les migrations SQL ne sont pas automatisées (pas de `supabase db push` dans le pipeline) — acceptable à cette échelle, à documenter à chaque fois
- Pas d'environnement de préproduction (staging) — les pushes vont directement en prod ; à ce stade du projet c'est un choix raisonnable, à revisiter s'il y a des utilisateurs réels nombreux
- Paquet lockfile `package-lock.json` présent ✅ — builds reproductibles
