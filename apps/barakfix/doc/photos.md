# Photos des demandes

## État actuel : ⚠️ partiellement implémenté

C'est le **principal écart restant par rapport au cahier des charges initial** : le locataire devait pouvoir joindre jusqu'à **3 photos** à sa demande.

## Ce qui existe déjà

### Base de données (`supabase/migrations/001_schema.sql`)
```sql
create table request_photos (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references requests(id) on delete cascade,
  storage_path text
);
```
La table est prête et déployée en production.

### Côté bailleur (`src/owner/RequestDetail.tsx`)
L'écran de détail charge et affiche les photos liées à une demande (`request_photos` par `request_id`). Le mécanisme d'affichage fonctionne — il attend des données.

### Côté locataire (`src/tenant/NewRequest.tsx`)
Le formulaire a conservé un state `files: File[]` (reliquat du retrait), mais **aucun input file n'est rendu** et aucune photo n'est envoyée à l'API.

## Ce qui a été retiré et pourquoi (correctif v6c)

Lors du passage de l'architecture « le locataire parle directement à Supabase » vers « tout passe par les fonctions Cloudflare » (cause du bug « No suitable key or wrong key type »), l'upload direct au Supabase Storage depuis le navigateur locataire a été retiré : il aurait nécessité soit un token Supabase officiel pour le locataire (ce qui cassait la correction), soit une refonte du flux d'upload.

## Deux options de réimplémentation (à discuter)

### Option A — Upload via fonction Cloudflare + Supabase Storage (recommandée)
1. Le locataire sélectionne ses photos (max 3) → le formulaire les envoie en `multipart/form-data` à une nouvelle fonction `/api/tenant-photo-upload`
2. La fonction vérifie le jeton locataire (comme `tenant-request-create`)
3. La fonction uploade dans Supabase Storage (bucket `request-photos`, chemin par demande) **avec la secret key côté serveur**
4. Les chemins sont stockés dans `request_photos`

Avantages : pas de token Supabase côté locataire, cohérent avec l'architecture actuelle, taille de photo contrôlable côté serveur (ex. max 2 Mo), compression possible.
Inconvénients : une fonction de plus à maintenir, base64 temporaire en mémoire de la fonction (limites Cloudflare : 100 Mo par requête, très largement suffisant pour 3 photos).

### Option B — Photos en base64 dans la table
1. Photos compressées côté navigateur (canvas, max ~300 Ko chacune)
2. Stockées en base64 directement dans une colonne texte de `request_photos`

Avantages : zéro fonction de plus, zéro configuration Storage.
Inconvénients : alourdit la base (Supabase gratuit : 500 Mo), requêtes plus lourdes, pas de vraie URL d'image.

**Recommandation : Option A** — plus propre, s'intègre à l'existant, et Supabase Storage est déjà inclus dans le plan gratuit (1 Go).

## Prérequis pour l'option A (uniquement si on la retient)
1. Créer le bucket `request-photos` dans Supabase → Storage (privé)
2. Vérifier la RLS du storage (insertion seulement via secret key = fonction serveur, lecture via fonction ou bailleur)
3. Ajouter la variable d'environnement `SUPABASE_URL` (sans le préfixe VITE_) dans Cloudflare si pas déjà présente côté fonctions

## Points UX à définir ensemble
- Nombre max de photos : 3 (cahier des charges) — à confirmer ?
- Compression automatique côté navigateur avant envoi (recommandé : redimensionner à max 1600px)
- Affichage en galerie / lightbox côté bailleur ?
- Le bailleur peut-il aussi ajouter des photos (avant/après) ? — non prévu aujourd'hui
