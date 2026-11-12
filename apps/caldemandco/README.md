# Calendrier Familial — Application Web

Refonte web de l'ancien calendrier familial Microsoft Publisher. Fonctionne entièrement
dans le navigateur, **sans serveur** : ouvrez `index.html` ou déployez tel quel.

## Déploiement (Cloudflare Pages ou Netlify)

1. Télécharger ce dossier depuis Google Drive : clic droit → **Télécharger** (ZIP)
2. Dézipper le dossier
3. **Copier votre dossier `Photos`** de votre PC à côté d'`index.html` (photos nommées
   du nom exact des personnes : `Photos/Jarod Demoulin.jpg`)
4. Déployer :
   - **Cloudflare Pages** : dashboard → Workers & Pages → Create → Pages → **Upload assets**
     (ou « Direct Upload ») → glisser le dossier → Deploy
   - **Netlify** : https://app.netlify.com/drop → glisser le dossier → c'est en ligne
5. Le site obtient une adresse du type `mon-site.pages.dev` ou `mon-site.netlify.app`

## Les photos — deux sources

- **Dossier `Photos/`** (recommandé) : visible par toute la famille, inclus dans le déploiement.
  Extensions : `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`. Recherche tolérante (accents/majuscules ignorés).
- **Upload navigateur** (Gestion → Photos) : stocké dans IndexedDB, visible uniquement
  dans ce navigateur. Prioritaire en cas de doublon.

## Fonctionnalités

### Onglet Mois (accueil)
À l'ouverture : le mois en cours — bandeau 🎉 si anniversaire aujourd'hui, photos du mois,
liste des anniversaires avec âges, événements, congés, grande grille du mois avec noms
des personnes dans les cases. Navigation ◀ ▶ entre les mois.

**Méli-mélo des photos** (v2026-10-31.10-meli) : les polaroids du mois occupent toute la
zone à gauche de la liste et prennent la même hauteur qu'elle ; ils sont posés en légère
superposition (coins qui se chevauchent, jamais les noms) avec des angles différents. Le
nombre de colonnes/rangées et la taille des photos sont calculés à partir du nombre de
photos du mois (2, 6 ou 12 photos donnent donc des dispositions différentes). Le bouton
🔀 Mélanger retire les photos au sort. Les réglages fins sont regroupés dans la constante
`MELI` en haut de `js/app.js` (chevauchement, inclinaison, marge, taille maximale).

### Onglet Année
Les 12 mois en grille cliquable (weekends, congés bleus, fériés rouges, jour actuel surligné),
prochains anniversaires avec compte à rebours, détail du mois au clic.

### Onglet Gestion
Tout est modifiable : anniversaires (CRUD + recherche), photos (deux sources), événements,
jours fériés (avec génération automatique belge : calcul exact de Pâques), vacances scolaires.

### Impression
Bouton 🖨️ Imprimer : version A4 paysage fidèle à la maquette Publisher — une page par
mois : photos + listes + grille du mois.

### Sauvegarde
- Données dans le navigateur (localStorage), photos uploadées dans IndexedDB
- **💾 Exporter** : sauvegarde JSON (à faire régulièrement)
- **📂 Importer** : restauration depuis un fichier JSON

## Structure
```
index.html                    Page principale (Mois / Année / Gestion)
css/style.css                 Styles écran + impression A4 paysage
js/storage.js                 localStorage + IndexedDB + dossier Photos/
js/print.js                   Version imprimable (logique Publisher)
js/app.js                     Interface, rendu, gestion CRUD
donnees/donnees-initiales.js  Données d'origine (105 anniversaires, 2026-2030)
Photos/                       (à ajouter) photos des personnes
```

## Remarques
- Les données modifiées sont locales à chaque navigateur : pas de partage entre membres.
- Faire un 💾 Exporter régulièrement ; le dossier `Photos/` reste la meilleure sauvegarde photos.
- Pour un calendrier *partagé et modifiable par tous*, un backend serait nécessaire.
