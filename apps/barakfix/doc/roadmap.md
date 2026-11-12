# Problèmes connus & évolutions à discuter

Ce fichier recense tout ce qui a été identifié comme **écart, dette technique ou idée d'évolution** lors de l'analyse du code v6. C'est notre liste de discussion pour prioriser les prochaines itérations.

## 🔴 Écarts par rapport au cahier des charges initial

### 1. Photos locataire (le plus important)
Retirées temporairement lors du correctif v6c. Le formulaire n'a plus d'input file, la table `request_photos` attend toujours des données.
→ Analyse complète et 2 options d'implémentation dans [photos.md](photos.md).

### 2. Téléphone bailleur en urgence
Le locataire voit le téléphone du bailleur **seulement si le champ `profiles.phone` est rempli**. Aujourd'hui il n'y a **pas d'interface pour le remplir** — il faut le faire à la main dans Supabase (Table Editor → profiles).
→ À faire : champ « mon téléphone » dans l'interface bailleur (simple à ajouter).

## 🟠 Limites fonctionnelles connues (contournables mais frustrantes)

3. **Pas de modification d'un logement** (adresse, type, notes) — seul chemin : supprimer + recréer, ce qui **détruit l'historique des demandes**. Le parseur d'adresse peut aussi produire des codes `XXX-...` si le format est incomplet.
4. **Pas de modification d'un locataire** (nom, email, téléphone) ni de son PIN — suppression + recréation à chaque fois (l'ancien locataire doit être recréé, les demandes perdent le lien `tenant_id`).
5. **Pas de reset du PIN par le bailleur**.
6. **Pas de suppression d'une demande individuelle** (seulement via la suppression du logement en cascade).
7. **Pas de changement de mot de passe / reset de mot de passe bailleur** dans l'interface (dépend de la configuration email Supabase — à vérifier).

## 🟡 Manques produit potentiels (à prioriser ensemble)

8. **Notifications email au bailleur** à chaque nouvelle demande — aujourd'hui il doit ouvrir l'appli. Serait le plus gros gain d'usage (Supabase Edge Function ou service type Resend).
9. **Notification au locataire** quand son statut change (email ou simply badge à la reconnexion).
10. **Fil de discussion / commentaires** sous une demande (bailleur ↔ locataire) — pas d'échange écrit au-delà de la description initiale.
11. **Historique des changements de statut** (audit trail) — seul le dernier statut est conservé.
12. **Dashboard enrichi** : coûts par année, par logement, par catégorie (le dashboard actuel donne déjà le coût total par logement).
13. **Export PDF** récapitulatif annuel par logement (comptabilité bailleur) — l'export CSV existe déjà.
14. **Annuaire d'artisans** déjà utilisés (réutilisation des coordonnées au lieu de les retaper).
15. **Domaine « charge locataire vs bailleur »** sur les coûts (typique en Belgique, petites réparations).

## 🔵 Technique / sécurité

16. **Pas de vérification d'email à l'inscription bailleur** — selon la config Supabase Auth ; à vérifier et éventuellement activer.
17. **Pas de rate limiting** sur les endpoints API (le verrouillage PIN est la seule protection) — Cloudflare WAF gratuit peut limiter.
18. **Pas de sauvegarde automatique de la base Supabase** — le code est sur GitHub, mais les données ne sont sauvegardées nulle part. Supabase (plan gratuit) a un point de restauration limité ; un export SQL périodique serait prudent.
19. **Composants UI minimalistes** : les confirmations utilisent `confirm()` natif du navigateur, pas de modales stylées ; pas d'états de chargement squelettes ; pas de toast de confirmation après action.
20. **Pas de mode sombre** (le design est clair/gris, Tailwind).

## ✅ Ce qui fonctionne bien (à ne pas casser)

- Cycle complet demande : locataire → badge non-lu → traitement bailleur → suivi locataire
- Architecture fonctions Cloudflare sans dépendance (WebCrypto natif) — déploiements fiables
- RLS complète + canal locataire isolé des coûts
- Déploiement automatique GitHub → Cloudflare (push = en ligne en 2 min)
- Suppression bailleur/logement en cascade propre

## Proposition de priorisation (à valider)

| Priorité | Item | Effort estimé |
|---|---|---|
| P1 | #1 Photos locataire (option A, fonction upload + Storage) | Moyen |
| P1 | #2 Champ téléphone bailleur dans l'interface | Très faible |
| P2 | #3-4 Modification logement & locataire | Faible-moyen |
| P2 | #8 Notifications email bailleur | Moyen (dépend service email) |
| P3 | #18 Sauvegarde périodique SQL | Faible (doc + cron) |
| P3 | #9, #10, #11 Notifications/commentaires/audit | À chiffrer selon choix |
