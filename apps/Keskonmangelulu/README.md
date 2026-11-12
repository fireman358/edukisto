# Keskonmange Lulu ? 🍽️

Version web de l'application Android « Keskonmange Lulu ? » — un planificateur de repas du soir pour la semaine.

## Fonctionnalités (fidèle à la version Android)

- **81 plats** répartis en 10 catégories (Végétarien, Poulet, Viande Rouge, Poisson, Crustacés, Porc, Pâtes, Crasses, À commander, Propositions Perso)
- **Planification par jour** : touche un plat → choisis un jour de la semaine
- **Semaine datée** : le planning est ancré sur la semaine en cours (lundi → dimanche) ; le lundi, l'ancienne semaine est archivée et le planning repart à zéro
- **Règles nutritionnelles** : « Crasses » et « À commander » exclusifs (désactivable), fréquence par catégorie réglable (illimité ou 1 à 6 fois par semaine)
- **Mode Magique 🎰** : génère une semaine complète aléatoire en respectant les règles
- **Mémoire anti-répétition 🧠** : bloque les plats déjà servis les N semaines précédentes (0 à 8)
- **Logo vectoriel dessiné en code (SVG inline, v3)** : assiette + couverts sur fond orange du thème, incrusté dans `app.js` — s'affiche toujours, sans aucun fichier image
- **Lien d'installation discret** : « 📲 Installer l'app » dans le pied de page, instructions adaptées à la plateforme (Android/iPhone/PC/Mac), disparaît une fois l'app installée
- **Récap 📅** : aperçu du menu par jour, portions par jour (1–20), partage du menu
- **Courses 🛒** : liste par rayon, nombre de convives, recherche d'ingrédients via Google, partage de la liste
- **Paramètres ⚙️** : mémoire anti-répétition, équilibre parfait, fréquence hebdo par catégorie
- **Publication ☁️** : envoi du planning de la semaine affichée vers eCalendar Family via Supabase (chiffré AES-GCM)
- **Période d'essai 30 jours** puis paywall (déverrouillage local, pas de paiement réel)
- **Installation 1-clic 📲** : bouton « Installer l'application » qui affiche les instructions adaptées à ta plateforme (Android, iPhone/iPad, PC, Mac)

## Technologie

Aucune dépendance, aucun build. HTML + CSS + JavaScript vanilla.

- Persistance : `localStorage` (un seul document JSON versionné) — remplace DataStore/Preferences Android
- Partage : `navigator.share` avec repli sur le presse-papiers (remplace les intents Android)
- Recettes/ingrédients : recherche Google dans un nouvel onglet
- Hors-ligne : service worker « réseau d'abord, cache en secours » (les mises à jour arrivent, l'app reste utilisable sans réseau)

## Fichiers

```
index.html      — point d'entrée
style.css       — styles (charte edukisto : anthracite #333, accent #38bdf8)
app.js          — logique complète (données, état, écrans, règles)
manifest.json   — manifeste PWA
sw.js           — service worker (cache hors-ligne)
logo.jpg        — logo de l'app
```

## Lancer en local

N'importe quel serveur statique suffit :

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

Ouvrir `index.html` directement dans un navigateur fonctionne aussi : tout marche sauf le service worker et la publication Cloud (Web Crypto et `fetch` exigent un contexte sécurisé, donc `http://localhost` ou HTTPS).

## Déploiement

Dossier statique, déployable tel quel sur GitHub Pages, Netlify, Vercel, Cloudflare Pages, etc. — il suffit de publier le dossier.

## Notes

- Le bouton « Débloquer l'application (4,99 €) » du paywall est simulé : il marque simplement l'app comme premium dans le `localStorage`. Pour un vrai paiement web, il faudra intégrer Stripe ou équivalent.
- Les données sont stockées localement dans le navigateur ; le bouton ☁️ publie une copie chiffrée du planning vers eCalendar Family, mais ne rapatrie rien (pas de synchronisation bidirectionnelle).
- La mémoire anti-répétition s'appuie sur l'historique local : elle ne voit pas les semaines planifiées sur un autre appareil.
