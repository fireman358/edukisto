# Authentification

## Bailleur — compte classique (email + mot de passe)

- **Inscription et connexion** via Supabase Auth (`src/auth/OwnerAuth.tsx`)
- Le compte utilisateur vit dans `auth.users` (géré par Supabase)
- À l'inscription, une ligne `profiles` est créée avec `role = 'bailleur'` (déclencheur SQL)
- Session stockée par le SDK Supabase (localStorage) — le bailleur reste connecté entre les visites
- **Déconnexion** : bouton en haut à droite de l'application
- **Suppression de compte** : lien rouge « Supprimer mon compte » (double confirmation) → appelle la fonction `/api/owner-delete` qui supprime le compte `auth.users` ; la cascade SQL supprime profil → logements → locataires → demandes → interventions → photos (migration 004)

### Ce que le bailleur peut faire
- Créer / supprimer ses logements
- Créer / supprimer ses locataires, révoquer/regénérer leurs codes
- Recevoir, lire, traiter les demandes
- Exporter en CSV

## Locataire — connexion par code + PIN (sans compte)

Le locataire n'a **pas de compte Supabase**. Son identité est vérifiée par 3 informations :

1. **Code logement** (ex. `AND-HAU-12`) — identifie le logement
2. **Email** — identifie le locataire parmi ceux du logement
3. **PIN 4 chiffres** — secret partagé avec le bailleur

### Flux de connexion (`functions/api/tenant-login.ts`)
1. Le locataire soumet code + email + PIN sur l'écran d'accueil (`src/auth/TenantLogin.tsx`)
2. La fonction cherche le logement par `access_code` → 404 « Code logement inconnu » si absent
3. Vérifie que le code n'est pas révoqué → 403 si révoqué
4. Cherche le locataire sur ce logement avec cet email → 404 si absent
5. Vérifie le verrouillage temporaire (voir ci-dessous) → 423 si verrouillé
6. Vérifie le PIN (hachage SHA-256 + sel, WebCrypto natif — plus de bcrypt)
7. **PIN incorrect** : incrémente `pin_attempts` ; au 5e échec → verrouillage 15 minutes (`locked_until`), message avec le nombre d'essais restants
8. **PIN correct** : réinitialise les compteurs, signe un **jeton JWT custom** (HMAC-SHA256 avec `SUPABASE_JWT_SECRET`) contenant `tenant_id`, `property_id`, `role: "locataire"`, expiration 30 jours
9. Le jeton est stocké dans `localStorage` (`barakfix_tenant_token`) côté navigateur

### Jeton locataire — points d'attention
- **Le jeton n'est PAS un jeton Supabase officiel** : Supabase ne sait pas le vérifier avec le nouveau système de clés (cause de l'erreur historique « No suitable key or wrong key type »). C'est pourquoi les fonctions Cloudflare (`tenant-data`, `tenant-request-create`) **vérifient la signature elles-mêmes** puis parlent à Supabase avec la secret key.
- Durée de vie : 30 jours. Passé ce délai, le locataire doit se reconnecter.
- Déconnexion locataire : simple suppression du jeton du localStorage.

### Sécurité du login
- 5 tentatives de PIN puis **blocage 15 minutes** (par locataire, en base)
- Le PIN n'est jamais stocké ni transmis en clair : uniquement son hash SHA-256 salé
- Le format du code est validé par regex avant toute requête (`^[A-Z0-9]{2,4}-[A-Z0-9]{2,4}-[A-Z0-9]{1,6}$`)

## Écran d'accueil (gate)

`src/auth/GateScreen.tsx` — écran de garde avec deux choix : « Je suis bailleur » (inscription/connexion) ou « Je suis locataire » (code + email + PIN).

## Problèmes connus / à discuter
- **Pas de changement de mot de passe bailleur** dans l'interface ( possible via Supabase Auth « Forgot password » si les emails sont configurés dans Supabase → à vérifier)
- **Pas de reset de PIN locataire** : le bailleur doit supprimer et recréer le locataire → candidat roadmap
- **Pas de changement d'email locataire** : idem, suppression/recréation → candidat roadmap
- Le locataire ne peut pas changer lui-même son PIN → à discuter (sécurité vs simplicité)
- Hachage SHA-256+sel : suffisant pour un PIN 4 chiffres avec verrouillage, mais **moins fort que bcrypt/argon2** pour un mauvais acteur qui lirait la base ; acceptable car le nombre de combinaisons est limité (10 000) et le verrouillage ralentit les attaques en ligne
