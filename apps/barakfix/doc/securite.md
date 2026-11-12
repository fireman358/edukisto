# Sécurité, RLS & données

## Architecture de confiance (le point le plus important du projet)

Barakfix utilise **trois canaux distincts**, chacun avec son propre mécanisme de confiance :

| Canal | Qui parle à Supabase | Mécanisme |
|---|---|---|
| Bailleur (navigateur) | SDK Supabase direct | Token Supabase officiel + **RLS** |
| Locataire (navigateur) | **Jamais direct** — passe par les fonctions Cloudflare | Jeton custom vérifié par la fonction, puis **secret key** côté serveur |
| Fonctions Cloudflare | REST Supabase avec secret key | Confiance serveur à serveur |

C'est le résultat du correctif v6c : le locataire ne peut plus parler directement à Supabase car le nouveau système de clés Supabase (publishable/secret keys, JWT Signing Keys) ne permet pas de vérifier des jetons custom signés par nos fonctions. Toute la donnée locataire passe donc par les fonctions, qui authentifient le jeton elles-mêmes.

## Row Level Security (migration `002_rls.sql`)

La RLS est active sur toutes les tables. Résumé des règles :

- `properties` : un bailleur ne voit/modifie/supprime **que ses logements** (`owner_id = auth.uid()`)
- `tenants` : visibles seulement par le bailleur propriétaire du logement (jointure `properties.owner_id`)
- `requests` : lisibles/modifiables par le bailleur propriétaire du logement de la demande ; le locataire ne passe jamais par là directement (fonctions only)
- `interventions` : idem bailleur — **jamais accessibles au locataire** (les coûts ne fuient pas)
- `request_photos` : idem
- `profiles` : chacun ne voit que son propre profil

### Fonctions SQL auxiliaires
- `current_tenant_id()` — lit `request.jwt.clclaims.tenant_id` du jeton ; **rendue tolérante** par la migration 005 (renvoie NULL au lieu de planter sur un claim `role` inattendu — fix de l'erreur « role "locataire" does not exist »)
- `current_owner_id()` — idem pour le bailleur

### Points d'attention RLS
- La RLS protège le canal bailleur. Le canal locataire est protégé par les **fonctions Cloudflare** (vérification du jeton custom) + le fait qu'elles n'exposent que les données du `tenant_id` du jeton.
- Les fonctions utilisent la **secret key** : elles passent au-dessus de la RLS (rôle `service_role`). C'est normal et sûr **tant que chaque fonction vérifie correctement le jeton/la session avant d'agir** — c'est le cas de `tenant-login`, `tenant-create`, `tenant-data`, `tenant-request-create`, `owner-delete`.

## Hachage des PIN

- **Format actuel** : `sha256$<sel-hex>$<signature-hex>` — SHA-256 (WebCrypto natif, zéro dépendance) avec sel aléatoire 16 octets, signature HMAC du sel avec le PIN comme clé
- Le PIN est un code à 4 chiffres : l'espace de recherche est faible (10 000 combinaisons), la vraie protection est le **verrouillage après 5 échecs (15 min)** en base
- Aucun PIN en clair n'est jamais stocké ou transmis

## Jeton locataire

- JWT custom signé en **HMAC-SHA256 avec `SUPABASE_JWT_SECRET`** (le « Legacy JWT secret » Supabase, toujours disponible dans Project Settings → API → JWT Settings)
- Payload : `tenant_id`, `property_id`, `role: "locataire"`, `exp` (+30 jours)
- Vérifié par les fonctions `tenant-data` et `tenant-request-create` (signature + expiration)

## Secrets & variables d'environnement

**Jamais dans le code ni sur GitHub** (le `.gitignore` exclut `.env`). Ils vivent dans le dashboard Cloudflare (Settings → Variables) :

| Variable | Usage | Niveau |
|---|---|---|
| `VITE_SUPABASE_URL` | URL du projet Supabase | Build (navigateur) + fonctions |
| `VITE_SUPABASE_ANON_KEY` | Publishable key — publique | Build (navigateur) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key — **secrète** | Fonctions uniquement |
| `SUPABASE_JWT_SECRET` | Legacy JWT secret — **secret** | Fonctions uniquement |

Règle d'or : tout ce qui commence par `VITE_` est embarqué dans le JavaScript public du navigateur — n'y mettre que des valeurs publiques. La secret key et le JWT secret ne servent qu'aux fonctions serveur.

## Problèmes connus / à discuter
- **Pas de rate limiting global** sur les fonctions (au-delà du verrouillage PIN) — un attaquant pourrait spammer les endpoints ; Cloudflare a des limites gratuites (WAF rules) si besoin
- **Pas d'audit trail** (qui a changé quel statut, quand)
- **Emails Supabase non vérifiés ?** — à vérifier : si l'inscription bailleur ne force pas la confirmation email, quelqu'un peut s'inscrire avec l'email d'un autre
- **CORS** : les fonctions ne restreignent pas l'origine (elles sont appelées par le même domaine en production, donc acceptable — à durcir si le domaine change)
