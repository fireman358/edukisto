# Logements

## Table `properties`

| Champ | Description |
|---|---|
| `id` | UUID |
| `owner_id` | → `profiles` (le bailleur propriétaire) |
| `address` | Texte libre, format attendu « 12 Rue Haute, 1070 Anderlecht » |
| `type` | Appartement / maison / etc. (texte, défaut `appartement`) |
| `notes` | Notes libres du bailleur |
| `access_code` | **Unique** — le code d'accès du logement |
| `access_code_revoked_at` | Horodatage si le code est révoqué |
| `created_at` | Date de création |

Suppression en cascade : supprimer un logement supprime ses locataires, leurs demandes, les interventions et les photos.

## Code d'accès — génération (`generateAccessCode` dans `src/owner/Properties.tsx`)

Format : `VILLE-RUE-NUMÉRO` (ex. `AND-HAU-12`).

- Ville : 3 premières lettres du nom de ville (accents retirés, majuscules)
- Rue : 3 premières lettres du nom de rue, en ignorant les mots génériques (« rue », « avenue », « boulevard », « place », … y compris néerlandais : stra- laan, plein, …)
- Numéro : le numéro de la rue (début ou fin d'adresse)

Exemples :
- « 12 Rue Haute, 1070 Anderlecht » → `AND-HAU-12`
- « 45 Rue de la Dexterité, 1180 Uccle » → (mots génériques filtrés, « de » exclu car < 2 lettres) → `UCC-DEX-45`

**Limites du générateur** (voir roadmap) :
- Une adresse sans code postal ni ville donne `XXX-...` (ex. « 12 rue haute anderlecht » sans les 2 parties → XXX) — c'est arrivé en production
- Pas de gestion des collisions complexes : si le code existe déjà, le code réessaie avec un suffixe (revérifié côté insertion)
- Les codes sont sensibles à la casse à l'insertion (toujours convertis en majuscules)

## Actions disponibles (interface bailleur — `src/owner/Properties.tsx`)

1. **Créer un logement** — adresse + type + notes → génère le code d'accès, l'affiche une fois créé (à communiquer au locataire)
2. **Supprimer le logement** — bouton rouge avec double confirmation (`confirm()` : « Ses locataires et toutes leurs demandes seront également supprimés ») → cascade SQL
3. **Révoquer le code d'accès** — bouton rouge « Révoquer l'accès » : marque `access_code_revoked_at` → le locataire ne peut plus se connecter avec ce code (erreur explicite côté login), mais le logement et l'historique restent intacts
4. **Regénérer le code** — génère un nouveau code unique et lève la révocation (utile si un code a fuité)

## Ce que le locataire voit du logement
- L'adresse de son logement (via `/api/tenant-data`)
- Le téléphone du bailleur **s'il est renseigné** dans son profil (`profiles.phone`) — encart ambre « Urgence ? Appelez directement votre bailleur »
- Il ne voit ni les autres logements du bailleur, ni les notes, ni le type

## À discuter (roadmap)
- Bouton « modifier l'adresse / type / notes » d'un logement (aujourd'hui : supprimer + recréer, ce qui casse l'historique des demandes)
- Améliorer le parseur d'adresse (validation du code postal belge, message d'erreur plus clair si format incomplet)
- Archivage de logement (au lieu de suppression définitive, garder l'historique)
