# Locataires

## Table `tenants`

| Champ | Description |
|---|---|
| `id` | UUID |
| `property_id` | → `properties` (le logement du locataire) |
| `full_name` | Nom complet |
| `phone` | Téléphone (optionnel) |
| `email` | Email (identifiant de connexion avec le code logement) |
| `pin_hash` | Hash SHA-256 + sel du PIN (jamais en clair) |
| `pin_attempts` | Compteur d'échecs (remis à 0 après succès) |
| `locked_until` | Horodatage de fin de verrouillage (5 échecs → 15 min) |
| `created_at` | Date de création |

Un locataire est toujours rattaché à un logement unique. Le même email peut exister sur deux logements différents (c'est le couple code logement + email qui identifie).

## Création d'un locataire (`functions/api/tenant-create.ts`)

Seul le **bailleur propriétaire du logement** peut créer un locataire. La fonction vérifie :

1. La session bailleur (token Supabase envoyé dans le corps) → 401 « Session bailleur invalide » sinon
2. Que le logement existe et appartient bien à ce bailleur → 403 sinon
3. Qu'aucun locataire avec cet email n'existe déjà sur ce logement → 409 sinon
4. Le format du PIN : **exactement 4 chiffres** (`/^\d{4}$/`)

Puis insertion avec le hash du PIN (WebCrypto SHA-256 + sel aléatoire).

Le bailleur communique ensuite au locataire : le **code logement** + son **email** + le **PIN**. Ces trois éléments sont nécessaires à la connexion.

## Actions disponibles (interface bailleur — `src/owner/Tenants.tsx`)

1. **Créer un locataire** — nom, téléphone, email, PIN 4 chiffres (formulaire par logement ou global avec sélection du logement)
2. **Supprimer / révoquer l'accès d'un locataire** — bouton rouge « Révoquer l'accès » → suppression de la ligne `tenants` ; les demandes existantes sont conservées mais `tenant_id` passe à NULL (`on delete set null`)

## Ce que voit le locataire connecté
- Son prénom/nom (stocké côté navigateur après login)
- L'adresse de son logement
- Ses demandes avec leur statut
- Le téléphone bailleur en cas d'urgence (si renseigné)
- Bouton « + Nouvelle demande »

## Ce que le locataire ne voit jamais
- Les coûts et interventions (sécurité RLS + le fait que tout passe par les fonctions serverless)
- Les autres logements/locataires du bailleur
- Le PIN des autres locataires (jamais renvoyé par l'API)

## À discuter (roadmap)
- **Changement de PIN** par le bailleur (sans recréer le locataire) — aujourd'hui le seul chemin est suppression + recréation
- **Modification email/téléphone/nom** d'un locataire existant
- Un locataire sur **plusieurs logements** du même bailleur (déménagement) — non supporté aujourd'hui
- Historique complet du locataire quand on le supprime (les demandes restent avec `tenant_id = NULL` — le nom disparaît des demandes anciennes côté bailleur, mais l'historique des demandes reste)
