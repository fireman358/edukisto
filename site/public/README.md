# David Demoulin — Vitrine & CV interactif

Site vitrine statique (HTML/CSS/JS, zéro dépendance) :
- **Dépannage & services** : dépannage informatique à domicile, à distance, ou à Arquennes.
- **Formations** : cours d'informatique, tarifs affichés.
- **Mes projets** : 11 projets en ligne (4 applications, 4 jeux, 2 démos, 1 site média).
- **CV** : parcours complet, pensé pour les recruteurs.

## Tarifs

| Prestation | Tarif |
|---|---|
| Je viens chez vous — jusqu'à 10 km | 45 €/h, déplacement compris |
| Je viens chez vous — 10 à 20 km | 45 €/h + 15 € |
| Vous venez à Arquennes (sur rendez-vous) | 25 €/h |
| À distance / visio | 25 €/h |

Minimum 1 h à domicile · 30 min à Arquennes. Prix TTC (régime de franchise, art. 44 §2).
La grille est affichée sur `/services` (dépannage) et `/transmets` (formations).

## Structure

- `index.html` — accueil
- `services.html` — dépannage & services
- `transmets.html` — formations & tarifs
- `construis.html` — projets (rendus par famille : applications / jeux / démos / site média)
- `about.html` — CV
- `mentions-legales.html`
- `js/data.js` — contenu (projets, CV) : tout se modifie ici
- `js/app.js` — rendu des cartes projets
- `js/cv.js` — rendu du CV
- `js/contact.js` — révélation email/téléphone (1er clic) + année du footer
- `css/style.css` — thème sombre ; palette, rayons et fond en variables en tête de fichier

## Déploiement

GitHub Pages ou Cloudflare Pages : branche `main`, racine du dépôt.
URL : `https://edukisto.win/`

## Captures d'écran

Dans `img/`, en `.png` et `.webp` de même nom :
- `barakfix` — https://barakfix.edukisto.win/
- `caldemandco` — https://caldemo.edukisto.win/
- `keskonmagelulu` — https://repas.edukisto.win/
- `ecal` — https://ecal.edukisto.win/
- `laetisoftlove` — https://manager.edukisto.win/
- `tirdefense-capture` — https://tir-defense-belgique.be/
- `trivialquest` — https://trivial.edukisto.win/
- `tdwars` — https://td-wars.edukisto.win/
- `pendu` — https://pendu.edukisto.win/
- `quisuisje` — https://quisuisje.edukisto.win/
- `belotepoints` — https://cardspoints.edukisto.win/

Le site charge le `.webp` en priorité, avec le `.png` en repli.
