# Barakfix — Documentation des fonctionnalités

Application de gestion des demandes de réparation entre bailleurs et locataires (Belgique).

> **Statut du document** : ce dossier `/doc` recense et analyse **toutes les fonctionnalités existantes** du code (v6) et sert de base de discussion pour les évolutions futures. Chaque fichier `.md` couvre un domaine.

## Vue d'ensemble

| Domaine | Fichier |
|---|---|
| Comptes & authentification (bailleur, locataire, jetons) | [authentification.md](authentification.md) |
| Logements & codes d'accès | [logements.md](logements.md) |
| Locataires (création, PIN, connexion) | [locataires.md](locataires.md) |
| Demandes de réparation (cycle complet) | [demandes.md](demandes.md) |
| Interventions, artisans & coûts | [interventions.md](interventions.md) |
| Photos des demandes | [photos.md](photos.md) |
| Sécurité, RLS & données | [securite.md](securite.md) |
| Déploiement & infrastructure | [deploiement.md](deploiement.md) |
| Problèmes connus & évolutions à discuter | [roadmap.md](roadmap.md) |

## Rôles

**Bailleur** — propriétaire d'un ou plusieurs logements. Il crée ses logements, enregistre ses locataires, reçoit et traite leurs demandes de réparation.

**Locataire** — habite un logement. Il se connecte avec un code logement + son email + un PIN, envoie des demandes de réparation et suit leur avancement. Il ne peut pas créer de compte lui-même : c'est le bailleur qui l'enregistre.

## Flux simplifié

1. Bailleur s'inscrit (email + mot de passe) → il crée son profil `bailleur`
2. Bailleur crée un logement → le système génère un code d'accès unique (ex. `AND-HAU-12`)
3. Bailleur enregistre un locataire pour ce logement (nom, email, PIN 4 chiffres)
4. Le locataire se connecte (code logement + email + PIN) → il voit ses demandes et en crée
5. Chaque demande arrive chez le bailleur (badge « non lu ») → il la traite : statut, artisan, dates, coût
6. Le locataire voit l'avancement en temps quasi réel (rechargement de page)

## Stack technique

- **Frontend** : React 18 + TypeScript + Vite + Tailwind CSS
- **Backend** : 5 Pages Functions Cloudflare (`functions/api/`) — aucune dépendance Node externe (WebCrypto natif)
- **Base de données** : Supabase (PostgreSQL + RLS)
- **Hébergement** : Cloudflare Pages — https://barakfix.edukisto.win
- **Code source** : github.com/fireman358/barakfix (privé) — déploiement automatique à chaque push
