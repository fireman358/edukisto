# 🂡 CardScore — marqueur de points pour jeux de cartes

Web app installable (PWA) pour marquer les points de vos parties de cartes,
aux couleurs [Edukisto](https://edukisto.win) (anthracite `#333333`, accent bleu `#38bdf8`), effet 2.5D.

## Jeux inclus (par ordre de priorité)

- **🂡 Belote** — classique, avec annonces, contrée, coinche · 2 équipes / 2 joueurs / 3 joueurs ·
  atout, SA/TA, contrat, coinche ×2/×4, litige 81-81, capot, fausse donne, arrondi dizaine
- **🃏 Couillon** — jeu wallon : **lignes (couillons) à effacer** (5/10/15/20), affichage visuel
  des lignes, prise perdue = +1 couillon, « craie dans le trou » (le prochain vainqueur en efface 2)
- **🂮 Rami** — points des cartes restantes, 2 à 6 joueurs, le plus bas gagne
- **♠ Whist** — 1 point par levée au-delà de 6, cible 3/5/7/9 points
- **🂱 Bridge** — comptage **rubber complet** : vulnérabilité, honneurs (100/150), contré/surcontré,
  bonus manche (300/500), chelems, surlevées et pénalités de chute complètes
- **🃜 Tarot** — prise/garde/garde sans/garde contre, bouts (56/51/41/36), poignées, petit au bout · 3/4/5 joueurs
- **🂲 Manille** — attaque/défense sur 120 points, objectif 101/201/501
- **🎯 Libre** — points libres (négatifs acceptés) pour tout autre jeu

## Parcours

1. **Choix du jeu** : grille de cartes 2.5D
2. **Paramètres** : variante, joueurs, mélangeur, objectif — puis « ▶️ Commencer la partie »
3. **Jeu** : écran épuré (scores + tableau), paramètres accessibles via « ✏️ Paramètres »,
   retour aux jeux via « 🎯 Changer de jeu »

## Fonctions communes

- Rotation automatique du mélangeur, noms libres
- Tableau des donnes modifiable (toucher une ligne), annulation, fausse donne
- Aide contextuelle + aperçu du score avant d'enregistrer
- **Mémo par jeu** (regles.html?jeu=…) : règles et comptage du jeu choisi
- Feuille de score partageable, historique des parties
- Responsive mobile-first, PWA installable (fonctionne hors ligne)

## En ligne

👉 **[cardspoints.edukisto.win](https://cardspoints.edukisto.win/)** — l'app est déployée et installable depuis cette adresse (PWA).

Fichiers : `index.html` (app), `regles.html` (mémo par jeu), `manifest.webmanifest`, `sw.js`, icônes SVG. Zéro dépendance.
