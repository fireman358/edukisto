# Demandes de réparation

## Table `requests`

| Champ | Description |
|---|---|
| `id` | UUID |
| `property_id` | → `properties` |
| `tenant_id` | → `tenants` (NULL si le locataire a été supprimé) |
| `title` | Titre court (ex. « Fuite sous l'évier ») |
| `category` | Enum : plomberie, electricite, chauffage, menuiserie, toiture, serrurerie, electromenager, autre |
| `urgency` | Enum : basse, normale, haute (24-48h), urgente (24h) |
| `status` | Enum : nouveau → planifié → en cours → résolu |
| `description` | Texte libre du locataire |
| `owner_read` | Badge « non lu » pour le bailleur (migration 006) |
| `created_at` / `updated_at` | Horodatages |

## Cycle de vie d'une demande

```
Locataire                Bailleur
   │
   ├─ + Nouvelle demande ──► apparaît avec badge rouge « non lu »
   │                        (clic ou ouverture → owner_read = true)
   │
   │                        ├─ statut : nouveau → planifié (artisan + date prévue)
   │                        ├─ statut : en cours (intervention en cours)
   │                        └─ statut : résolu (coût + date d'exécution)
   │
   └─ voit le statut mis à jour (badge violet/bleu/jaune/vert)
```

## Création par le locataire (`functions/api/tenant-request-create.ts`)

Le locataire envoie : titre, catégorie, urgence, description (+ son jeton). La fonction :
1. Vérifie le jeton locataire (signature HMAC avec `SUPABASE_JWT_SECRET`, expiration 30 jours)
2. Vérifie que le logement du jeton existe et que le code n'est pas révoqué
3. Insère la demande avec `tenant_id` et `property_id` du jeton — **en utilisant la secret key** (le locataire ne parle jamais directement à Supabase, voir `securite.md`)
4. `owner_read = false` → le bailleur voit le point rouge

**Note : l'upload de photos a été temporairement retiré de ce flux** (retiré lors du correctif v6c) — voir `photos.md`.

## Consultation côté bailleur (`src/owner/Requests.tsx`)

- Liste de **toutes ses demandes** (tous logements), triée par urgence puis date
- **Filtres** : par statut, par logement, par catégorie (barre de filtre)
- **Badge non-lu** : point rouge + la liste marque automatiquement `owner_read = true` au clic/détail
- Clic sur une demande → écran de détail (`src/owner/RequestDetail.tsx`) avec le traitement complet (voir `interventions.md`)

## Consultation côté locataire (`src/tenant/TenantHome.tsx`)

- Liste de **ses demandes uniquement** (via `/api/tenant-data`)
- Badge de statut coloré : violet (nouveau), bleu (planifié), jaune (en cours), vert (résolu)
- Date de dernière mise à jour visible
- Pas de notification push — le locataire voit le changement au rechargement de page

## Statuts et urgences — libellés

| Statut | Libellé | Couleur badge |
|---|---|---|
| nouveau | Nouveau | violet |
| planifie | Planifié | bleu |
| en_cours | En cours | jaune |
| resolu | Résolu | vert |

| Urgence | Libellé |
|---|---|
| basse | Basse |
| normale | Normale |
| haute | Haute (24-48h) |
| urgente | Urgente (24h) |

## À discuter (roadmap)
- **Notifications email** au bailleur à chaque nouvelle demande (Supabase + service email type Resend) — aujourd'hui il doit ouvrir l'appli
- **Notifications/push au locataire** quand le statut change
- Commentaires/échanges sous une demande (fil de discussion bailleur ↔ locataire) — pas de chat aujourd'hui
- Historique des changements de statut (audit trail) — seul le dernier statut est conservé
- Suppression d'une demande par le bailleur (aujourd'hui : uniquement via la suppression du logement)
- Recherche plein texte dans les demandes
