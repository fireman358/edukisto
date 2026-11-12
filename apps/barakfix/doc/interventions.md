# Interventions, artisans & coûts

## Table `interventions`

Une ligne par demande traitée (relation 1-1 avec `requests` — `maybeSingle()` côté code) :

| Champ | Description |
|---|---|
| `id` | UUID |
| `request_id` | → `requests` (cascade) |
| `artisan_name` | Nom de l'artisan/entreprise |
| `artisan_phone` | Téléphone de l'artisan |
| `cost` | Coût total (numeric 10,2) |
| `scheduled_date` | Date d'intervention **prévue** |
| `performed_date` | Date d'intervention **réalisée** |

## Traitement d'une demande par le bailleur (`src/owner/RequestDetail.tsx`)

Écran de détail d'une demande, le bailleur peut renseigner :

1. **Statut** — select : nouveau / planifié / en cours / résolu
2. **Artisan** — nom + téléphone
3. **Coût** — montant (en EUR)
4. **Dates** — prévue et réalisée (champs date)

Sauvegarde en un clic (upsert de l'intervention : crée si absente, met à jour sinon).

L'écran affiche aussi :
- Les infos de la demande (titre, catégorie, urgence, description, dates, logement, locataire)
- Les photos liées (voir `photos.md`)
- **L'ouverture marque automatiquement la demande comme lue** (`owner_read = true`)

## Visibilité des coûts — point sécurité important

**Le locataire ne voit JAMAIS les coûts ni les informations d'artisan** :
- La RLS (voir `securite.md`) bloque l'accès direct à `interventions` pour le rôle locataire
- Le endpoint `/api/tenant-data` ne renvoie que les champs des demandes (statut, dates, titre…) — jamais les coûts

C'est un choix produit : le coût d'une réparation concerne le bailleur, pas le locataire.

## Suivi des coûts par logement

Le dashboard bailleur (`src/owner/Dashboard.tsx`) affiche le récapitulatif : nombre de demandes par statut et **coût total par logement** (agrégation des interventions).

## Export CSV

`src/lib/csv.ts` — `downloadCSV(filename, rows)` : génère un CSV (séparateur `;`, BOM UTF-8 pour Excel, séparateur de lignes CRLF) et déclenche le téléchargement. Utilisé pour exporter les demandes (avec statut, urgence, logement, locataire, dates) et éventuellement les interventions/coûts.

## À discuter (roadmap)
- **Facturation/document** : générer un PDF récapitulatif par logement (coûts annuels, pour la comptabilité bailleur)
- **Devis** : distinguer devis accepté / coût final
- **Fournisseur d'artisans** : annuaire des artisans déjà utilisés par le bailleur (réutilisation des coordonnées)
- Photo avant/après intervention côté bailleur
- Coût partagé (charge locataire vs bailleur) — typique en Belgique (petites réparations à charge du locataire)
