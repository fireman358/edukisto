# Workflow worktrees — une branche par feature

Chaque feature de Barakfix est développée dans un **worktree Git isolé**, avec sa propre branche `feature/<nom>`. Aucune feature ne touche `main` tant qu'elle n'est pas validée.

## Règles

1. **Une feature = un worktree = une branche `feature/<slug>`**
2. Le worktree est créé depuis `main` (état de production) au début de la feature
3. Le build (`npm install && npm run build`) doit passer dans le worktree avant tout push
4. Le push se fait sur la branche de la feature — **jamais directement sur `main`**
5. La fusion dans `main` ne se fait qu'après validation (test sur le site, revue ensemble)
6. Après fusion : le worktree est supprimé et la branche nettoyée

## Worktrees actifs

| Feature | Branche | Worktree | Statut |
|---|---|---|---|
| Téléphone bailleur dans l'interface | `feature/owner-phone-field` | `barakfix-wt-owner-phone` | en cours |
| Photos locataire (upload + Storage) | `feature/tenant-photos` | `barakfix-wt-tenant-photos` | en cours |

## Commandes de référence

```bash
# Créer un worktree pour une nouvelle feature (depuis main)
git worktree add ../barakfix-wt-<slug> -b feature/<slug> main

# Travailler dedans : build de vérification avant push
cd ../barakfix-wt-<slug> && npm install && npm run build

# Pousser la branche de la feature
git push -u origin feature/<slug>

# Fusion dans main après validation (depuis le worktree principal)
git checkout main && git merge feature/<slug> && git push origin main

# Nettoyage après fusion
git worktree remove ../barakfix-wt-<slug>
git branch -d feature/<slug>
```

## Pourquoi ce workflow

- **Isolation** : deux features peuvent avancer en parallèle sans conflit de fichiers
- **Sécurité** : `main` ne contient que du validé — ce qui est déployé en production via Cloudflare reste toujours fonctionnel
- **Revue** : la branche de la feature permet de relire le diff complet avant fusion
- **Abandon propre** : une feature abandonnée = suppression du worktree, zéro trace dans `main`
