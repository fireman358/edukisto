/* Fichier généré par scripts/build-themes.mjs — ne pas modifier à la main.
 * Les sources de vérité sont les fichiers data/themes/*.json.
 * Ce bundle permet à l'application de fonctionner sans serveur (file://).
 */
window.QC_THEME_BUNDLE = {
  "version": 1,
  "genereLe": "2026-11-12T08:18:46.116Z",
  "themes": [
    {
      "id": "classique",
      "nom": "Tout le monde",
      "sousTitre": "Des visages, des indices",
      "description": "Vingt-quatre visages ordinaires, des cheveux roux aux regards noirs : le vrai plaisir du Qui suis-je ? à l'ancienne.",
      "emoji": "👥",
      "palette": {
        "accent": "#f2c14e",
        "accent2": "#6ec6b4",
        "fond": "#0d171b",
        "lueur": "#f2c14e"
      },
      "attributs": [
        {
          "id": "femme",
          "nom": "Femme",
          "type": "bool",
          "categorie": "Identité",
          "icone": "👩",
          "question": "Ton personnage est-il une femme ?"
        },
        {
          "id": "cheveux",
          "nom": "Cheveux",
          "type": "enum",
          "categorie": "Cheveux",
          "icone": "💇",
          "options": [
            {
              "id": "roux",
              "nom": "Roux",
              "question": "Ton personnage a-t-il les cheveux roux ?"
            },
            {
              "id": "blonds",
              "nom": "Blonds",
              "question": "Ton personnage a-t-il les cheveux blonds ?"
            },
            {
              "id": "bruns",
              "nom": "Bruns",
              "question": "Ton personnage a-t-il les cheveux bruns ?"
            },
            {
              "id": "noirs",
              "nom": "Noirs",
              "question": "Ton personnage a-t-il les cheveux noirs ?"
            }
          ]
        },
        {
          "id": "peau",
          "nom": "Peau",
          "type": "enum",
          "categorie": "Teint",
          "icone": "✋",
          "options": [
            {
              "id": "claire",
              "nom": "Claire",
              "question": "Ton personnage a-t-il la peau claire ?"
            },
            {
              "id": "mate",
              "nom": "Mate",
              "question": "Ton personnage a-t-il la peau mate ?"
            },
            {
              "id": "brune",
              "nom": "Brune",
              "question": "Ton personnage a-t-il la peau brune ?"
            },
            {
              "id": "noire",
              "nom": "Noire",
              "question": "Ton personnage a-t-il la peau noire ?"
            }
          ]
        },
        {
          "id": "yeux",
          "nom": "Yeux",
          "type": "enum",
          "categorie": "Regard",
          "icone": "👀",
          "options": [
            {
              "id": "bleus",
              "nom": "Bleus",
              "question": "Ton personnage a-t-il les yeux bleus ?"
            },
            {
              "id": "verts",
              "nom": "Verts",
              "question": "Ton personnage a-t-il les yeux verts ?"
            },
            {
              "id": "marron",
              "nom": "Marron",
              "question": "Ton personnage a-t-il les yeux marron ?"
            },
            {
              "id": "noisette",
              "nom": "Noisette",
              "question": "Ton personnage a-t-il les yeux noisette ?"
            }
          ]
        },
        {
          "id": "lunettes",
          "nom": "Lunettes",
          "type": "bool",
          "categorie": "Accessoires",
          "icone": "👓",
          "question": "Ton personnage porte-t-il des lunettes ?"
        },
        {
          "id": "barbe",
          "nom": "Barbe",
          "type": "bool",
          "categorie": "Visage",
          "icone": "🧔",
          "question": "Ton personnage porte-t-il une barbe ?"
        },
        {
          "id": "chapeau",
          "nom": "Chapeau",
          "type": "bool",
          "categorie": "Accessoires",
          "icone": "🎩",
          "question": "Ton personnage porte-t-il un chapeau ?"
        },
        {
          "id": "boucles_oreilles",
          "nom": "Boucles d'oreilles",
          "type": "bool",
          "categorie": "Accessoires",
          "icone": "💎",
          "question": "Ton personnage porte-t-il des boucles d'oreilles ?"
        },
        {
          "id": "taches_rousseur",
          "nom": "Taches de rousseur",
          "type": "bool",
          "categorie": "Visage",
          "icone": "🌟",
          "question": "Ton personnage a-t-il des taches de rousseur ?"
        },
        {
          "id": "cheveux_longs",
          "nom": "Cheveux longs",
          "type": "bool",
          "categorie": "Cheveux",
          "icone": "💇",
          "question": "Ton personnage a-t-il les cheveux longs ?"
        },
        {
          "id": "sourire",
          "nom": "Sourire",
          "type": "bool",
          "categorie": "Expression",
          "icone": "😊",
          "question": "Ton personnage sourit-il ?"
        }
      ],
      "personnages": [
        {
          "id": "alice",
          "nom": "Alice",
          "emoji": "👩‍🦰",
          "attributs": {
            "femme": true,
            "cheveux": "roux",
            "peau": "claire",
            "yeux": "verts",
            "lunettes": true,
            "barbe": false,
            "chapeau": false,
            "boucles_oreilles": true,
            "taches_rousseur": true,
            "cheveux_longs": true,
            "sourire": true
          }
        },
        {
          "id": "bastien",
          "nom": "Bastien",
          "emoji": "👨‍🦱",
          "attributs": {
            "femme": false,
            "cheveux": "blonds",
            "peau": "claire",
            "yeux": "bleus",
            "lunettes": false,
            "barbe": true,
            "chapeau": false,
            "boucles_oreilles": false,
            "taches_rousseur": false,
            "cheveux_longs": false,
            "sourire": false
          }
        },
        {
          "id": "camille",
          "nom": "Camille",
          "emoji": "👩‍🦱",
          "attributs": {
            "femme": true,
            "cheveux": "bruns",
            "peau": "mate",
            "yeux": "marron",
            "lunettes": true,
            "barbe": false,
            "chapeau": true,
            "boucles_oreilles": false,
            "taches_rousseur": false,
            "cheveux_longs": true,
            "sourire": true
          }
        },
        {
          "id": "david",
          "nom": "David",
          "emoji": "👨🏿",
          "attributs": {
            "femme": false,
            "cheveux": "noirs",
            "peau": "noire",
            "yeux": "marron",
            "lunettes": false,
            "barbe": true,
            "chapeau": false,
            "boucles_oreilles": false,
            "taches_rousseur": false,
            "cheveux_longs": false,
            "sourire": false
          }
        },
        {
          "id": "elodie",
          "nom": "Élodie",
          "emoji": "👩‍🦱",
          "attributs": {
            "femme": true,
            "cheveux": "blonds",
            "peau": "mate",
            "yeux": "bleus",
            "lunettes": false,
            "barbe": false,
            "chapeau": false,
            "boucles_oreilles": false,
            "taches_rousseur": true,
            "cheveux_longs": true,
            "sourire": true
          }
        },
        {
          "id": "farid",
          "nom": "Farid",
          "emoji": "👨🏽",
          "attributs": {
            "femme": false,
            "cheveux": "noirs",
            "peau": "brune",
            "yeux": "noisette",
            "lunettes": false,
            "barbe": true,
            "chapeau": false,
            "boucles_oreilles": false,
            "taches_rousseur": false,
            "cheveux_longs": false,
            "sourire": true
          }
        },
        {
          "id": "gabriel",
          "nom": "Gabriel",
          "emoji": "👨‍🦰",
          "attributs": {
            "femme": false,
            "cheveux": "roux",
            "peau": "claire",
            "yeux": "verts",
            "lunettes": true,
            "barbe": true,
            "chapeau": true,
            "boucles_oreilles": false,
            "taches_rousseur": true,
            "cheveux_longs": false,
            "sourire": false
          }
        },
        {
          "id": "helene",
          "nom": "Hélène",
          "emoji": "👩‍🦱",
          "attributs": {
            "femme": true,
            "cheveux": "bruns",
            "peau": "claire",
            "yeux": "marron",
            "lunettes": true,
            "barbe": false,
            "chapeau": false,
            "boucles_oreilles": true,
            "taches_rousseur": false,
            "cheveux_longs": true,
            "sourire": false
          }
        },
        {
          "id": "ines",
          "nom": "Inès",
          "emoji": "👩🏽",
          "attributs": {
            "femme": true,
            "cheveux": "noirs",
            "peau": "brune",
            "yeux": "marron",
            "lunettes": false,
            "barbe": false,
            "chapeau": false,
            "boucles_oreilles": true,
            "taches_rousseur": false,
            "cheveux_longs": true,
            "sourire": true
          }
        },
        {
          "id": "julien",
          "nom": "Julien",
          "emoji": "👨‍🦱",
          "attributs": {
            "femme": false,
            "cheveux": "bruns",
            "peau": "mate",
            "yeux": "verts",
            "lunettes": false,
            "barbe": true,
            "chapeau": true,
            "boucles_oreilles": false,
            "taches_rousseur": false,
            "cheveux_longs": false,
            "sourire": false
          }
        },
        {
          "id": "karim",
          "nom": "Karim",
          "emoji": "👨🏿",
          "attributs": {
            "femme": false,
            "cheveux": "noirs",
            "peau": "noire",
            "yeux": "marron",
            "lunettes": true,
            "barbe": true,
            "chapeau": false,
            "boucles_oreilles": false,
            "taches_rousseur": false,
            "cheveux_longs": false,
            "sourire": true
          }
        },
        {
          "id": "laura",
          "nom": "Laura",
          "emoji": "👩‍🦰",
          "attributs": {
            "femme": true,
            "cheveux": "roux",
            "peau": "mate",
            "yeux": "noisette",
            "lunettes": false,
            "barbe": false,
            "chapeau": false,
            "boucles_oreilles": true,
            "taches_rousseur": true,
            "cheveux_longs": true,
            "sourire": true
          }
        },
        {
          "id": "mathieu",
          "nom": "Mathieu",
          "emoji": "👨‍🦱",
          "attributs": {
            "femme": false,
            "cheveux": "blonds",
            "peau": "claire",
            "yeux": "bleus",
            "lunettes": false,
            "barbe": false,
            "chapeau": false,
            "boucles_oreilles": false,
            "taches_rousseur": false,
            "cheveux_longs": true,
            "sourire": true
          }
        },
        {
          "id": "nadia",
          "nom": "Nadia",
          "emoji": "👩🏽",
          "attributs": {
            "femme": true,
            "cheveux": "bruns",
            "peau": "brune",
            "yeux": "noisette",
            "lunettes": true,
            "barbe": false,
            "chapeau": true,
            "boucles_oreilles": false,
            "taches_rousseur": false,
            "cheveux_longs": true,
            "sourire": false
          }
        },
        {
          "id": "olivier",
          "nom": "Olivier",
          "emoji": "👨🏽",
          "attributs": {
            "femme": false,
            "cheveux": "noirs",
            "peau": "brune",
            "yeux": "verts",
            "lunettes": true,
            "barbe": true,
            "chapeau": false,
            "boucles_oreilles": false,
            "taches_rousseur": false,
            "cheveux_longs": false,
            "sourire": false
          }
        },
        {
          "id": "pauline",
          "nom": "Pauline",
          "emoji": "👩‍🦱",
          "attributs": {
            "femme": true,
            "cheveux": "blonds",
            "peau": "mate",
            "yeux": "bleus",
            "lunettes": false,
            "barbe": false,
            "chapeau": false,
            "boucles_oreilles": true,
            "taches_rousseur": true,
            "cheveux_longs": true,
            "sourire": true
          }
        },
        {
          "id": "quentin",
          "nom": "Quentin",
          "emoji": "👨‍🦰",
          "attributs": {
            "femme": false,
            "cheveux": "roux",
            "peau": "claire",
            "yeux": "bleus",
            "lunettes": false,
            "barbe": true,
            "chapeau": false,
            "boucles_oreilles": false,
            "taches_rousseur": true,
            "cheveux_longs": false,
            "sourire": false
          }
        },
        {
          "id": "rachid",
          "nom": "Rachid",
          "emoji": "👨🏽",
          "attributs": {
            "femme": false,
            "cheveux": "bruns",
            "peau": "brune",
            "yeux": "noisette",
            "lunettes": false,
            "barbe": true,
            "chapeau": true,
            "boucles_oreilles": false,
            "taches_rousseur": false,
            "cheveux_longs": false,
            "sourire": true
          }
        },
        {
          "id": "sophie",
          "nom": "Sophie",
          "emoji": "👩🏽",
          "attributs": {
            "femme": true,
            "cheveux": "blonds",
            "peau": "brune",
            "yeux": "verts",
            "lunettes": true,
            "barbe": false,
            "chapeau": false,
            "boucles_oreilles": true,
            "taches_rousseur": false,
            "cheveux_longs": false,
            "sourire": false
          }
        },
        {
          "id": "tessa",
          "nom": "Tessa",
          "emoji": "👩‍🦰",
          "attributs": {
            "femme": true,
            "cheveux": "roux",
            "peau": "mate",
            "yeux": "verts",
            "lunettes": false,
            "barbe": false,
            "chapeau": true,
            "boucles_oreilles": false,
            "taches_rousseur": false,
            "cheveux_longs": false,
            "sourire": true
          }
        },
        {
          "id": "ursule",
          "nom": "Ursule",
          "emoji": "👩🏿",
          "attributs": {
            "femme": true,
            "cheveux": "roux",
            "peau": "noire",
            "yeux": "noisette",
            "lunettes": false,
            "barbe": false,
            "chapeau": false,
            "boucles_oreilles": false,
            "taches_rousseur": true,
            "cheveux_longs": true,
            "sourire": true
          }
        },
        {
          "id": "valentin",
          "nom": "Valentin",
          "emoji": "👨🏿",
          "attributs": {
            "femme": false,
            "cheveux": "blonds",
            "peau": "noire",
            "yeux": "bleus",
            "lunettes": true,
            "barbe": false,
            "chapeau": false,
            "boucles_oreilles": false,
            "taches_rousseur": true,
            "cheveux_longs": false,
            "sourire": false
          }
        },
        {
          "id": "wassim",
          "nom": "Wassim",
          "emoji": "👨🏿",
          "attributs": {
            "femme": false,
            "cheveux": "noirs",
            "peau": "noire",
            "yeux": "noisette",
            "lunettes": false,
            "barbe": true,
            "chapeau": false,
            "boucles_oreilles": false,
            "taches_rousseur": false,
            "cheveux_longs": false,
            "sourire": true
          }
        },
        {
          "id": "yasmine",
          "nom": "Yasmine",
          "emoji": "👩🏿",
          "attributs": {
            "femme": true,
            "cheveux": "bruns",
            "peau": "noire",
            "yeux": "marron",
            "lunettes": true,
            "barbe": false,
            "chapeau": true,
            "boucles_oreilles": true,
            "taches_rousseur": false,
            "cheveux_longs": true,
            "sourire": false
          }
        }
      ]
    },
    {
      "id": "animaux",
      "nom": "Animaux",
      "sousTitre": "Le grand règne",
      "description": "Plumes, écailles et fourrure : repère la bête cachée dans ce règne animal haut en couleurs.",
      "emoji": "🦁",
      "palette": {
        "accent": "#f7b955",
        "accent2": "#54d6a1",
        "fond": "#0a1915",
        "lueur": "#f7b955"
      },
      "attributs": [
        {
          "id": "classe",
          "nom": "Classe",
          "type": "enum",
          "categorie": "Zoologie",
          "icone": "🐾",
          "options": [
            {
              "id": "mammifere",
              "nom": "Mammifère",
              "question": "Ton personnage est-il un mammifère ?"
            },
            {
              "id": "oiseau",
              "nom": "Oiseau",
              "question": "Ton personnage est-il un oiseau ?"
            },
            {
              "id": "reptile",
              "nom": "Reptile",
              "question": "Ton personnage est-il un reptile ?"
            },
            {
              "id": "poisson",
              "nom": "Poisson",
              "question": "Ton personnage est-il un poisson ?"
            },
            {
              "id": "insecte",
              "nom": "Insecte",
              "question": "Ton personnage est-il un insecte ?"
            }
          ]
        },
        {
          "id": "habitat",
          "nom": "Habitat",
          "type": "enum",
          "categorie": "Milieu de vie",
          "icone": "🌍",
          "options": [
            {
              "id": "ferme",
              "nom": "Ferme",
              "question": "Ton personnage vit-il dans une ferme ?"
            },
            {
              "id": "savane",
              "nom": "Savane",
              "question": "Ton personnage vit-il dans la savane ?"
            },
            {
              "id": "foret",
              "nom": "Forêt",
              "question": "Ton personnage vit-il dans une forêt ?"
            },
            {
              "id": "ocean",
              "nom": "Océan",
              "question": "Ton personnage vit-il dans l'océan ?"
            },
            {
              "id": "jungle",
              "nom": "Jungle",
              "question": "Ton personnage vit-il dans la jungle ?"
            }
          ]
        },
        {
          "id": "domestique",
          "nom": "Domestique",
          "type": "bool",
          "categorie": "Mode de vie",
          "icone": "🏠",
          "question": "Ton personnage est-il un animal domestique ?"
        },
        {
          "id": "sauvage",
          "nom": "Sauvage",
          "type": "bool",
          "categorie": "Mode de vie",
          "icone": "🌲",
          "question": "Ton personnage est-il un animal sauvage ?"
        },
        {
          "id": "rayures",
          "nom": "Rayures",
          "type": "bool",
          "categorie": "Apparence",
          "icone": "🦓",
          "question": "Ton personnage a-t-il des rayures ?"
        },
        {
          "id": "taches",
          "nom": "Taches",
          "type": "bool",
          "categorie": "Apparence",
          "icone": "🐆",
          "question": "Ton personnage a-t-il des taches ?"
        },
        {
          "id": "carnivore",
          "nom": "Carnivore",
          "type": "bool",
          "categorie": "Alimentation",
          "icone": "🍖",
          "question": "Ton personnage est-il carnivore ?"
        },
        {
          "id": "sait_voler",
          "nom": "Sait voler",
          "type": "bool",
          "categorie": "Capacités",
          "icone": "🪽",
          "question": "Ton personnage sait-il voler ?"
        },
        {
          "id": "sait_nager",
          "nom": "Sait nager",
          "type": "bool",
          "categorie": "Capacités",
          "icone": "🌊",
          "question": "Ton personnage sait-il nager ?"
        }
      ],
      "personnages": [
        {
          "id": "lion",
          "nom": "Léon le lion",
          "emoji": "🦁",
          "attributs": {
            "classe": "mammifere",
            "habitat": "savane",
            "domestique": false,
            "sauvage": true,
            "rayures": false,
            "taches": false,
            "carnivore": true,
            "sait_voler": false,
            "sait_nager": false
          }
        },
        {
          "id": "elephant",
          "nom": "Éléonore l'éléphant",
          "emoji": "🐘",
          "attributs": {
            "classe": "mammifere",
            "habitat": "savane",
            "domestique": false,
            "sauvage": true,
            "rayures": false,
            "taches": false,
            "carnivore": false,
            "sait_voler": false,
            "sait_nager": true
          }
        },
        {
          "id": "girafe",
          "nom": "Gisèle la girafe",
          "emoji": "🦒",
          "attributs": {
            "classe": "mammifere",
            "habitat": "savane",
            "domestique": false,
            "sauvage": true,
            "rayures": false,
            "taches": true,
            "carnivore": false,
            "sait_voler": false,
            "sait_nager": false
          }
        },
        {
          "id": "zebre",
          "nom": "Zia le zèbre",
          "emoji": "🦓",
          "attributs": {
            "classe": "mammifere",
            "habitat": "savane",
            "domestique": false,
            "sauvage": true,
            "rayures": true,
            "taches": false,
            "carnivore": false,
            "sait_voler": false,
            "sait_nager": false
          }
        },
        {
          "id": "tigre",
          "nom": "Tao le tigre",
          "emoji": "🐯",
          "attributs": {
            "classe": "mammifere",
            "habitat": "jungle",
            "domestique": false,
            "sauvage": true,
            "rayures": true,
            "taches": false,
            "carnivore": true,
            "sait_voler": false,
            "sait_nager": true
          }
        },
        {
          "id": "loup",
          "nom": "Lucien le loup",
          "emoji": "🐺",
          "attributs": {
            "classe": "mammifere",
            "habitat": "foret",
            "domestique": false,
            "sauvage": true,
            "rayures": false,
            "taches": false,
            "carnivore": true,
            "sait_voler": false,
            "sait_nager": true
          }
        },
        {
          "id": "renard",
          "nom": "Rouky le renard",
          "emoji": "🦊",
          "attributs": {
            "classe": "mammifere",
            "habitat": "foret",
            "domestique": false,
            "sauvage": true,
            "rayures": false,
            "taches": false,
            "carnivore": true,
            "sait_voler": false,
            "sait_nager": false
          }
        },
        {
          "id": "lapin",
          "nom": "Barnabé le lapin",
          "emoji": "🐰",
          "attributs": {
            "classe": "mammifere",
            "habitat": "ferme",
            "domestique": true,
            "sauvage": false,
            "rayures": false,
            "taches": false,
            "carnivore": false,
            "sait_voler": false,
            "sait_nager": false
          }
        },
        {
          "id": "vache",
          "nom": "Marguerite la vache",
          "emoji": "🐮",
          "attributs": {
            "classe": "mammifere",
            "habitat": "ferme",
            "domestique": true,
            "sauvage": false,
            "rayures": false,
            "taches": true,
            "carnivore": false,
            "sait_voler": false,
            "sait_nager": false
          }
        },
        {
          "id": "chien",
          "nom": "Filou le chien",
          "emoji": "🐶",
          "attributs": {
            "classe": "mammifere",
            "habitat": "ferme",
            "domestique": true,
            "sauvage": false,
            "rayures": false,
            "taches": true,
            "carnivore": true,
            "sait_voler": false,
            "sait_nager": true
          }
        },
        {
          "id": "chauve-souris",
          "nom": "Nocturne la chauve-souris",
          "emoji": "🦇",
          "attributs": {
            "classe": "mammifere",
            "habitat": "foret",
            "domestique": false,
            "sauvage": true,
            "rayures": false,
            "taches": false,
            "carnivore": true,
            "sait_voler": true,
            "sait_nager": false
          }
        },
        {
          "id": "poule",
          "nom": "Colette la poule",
          "emoji": "🐔",
          "attributs": {
            "classe": "oiseau",
            "habitat": "ferme",
            "domestique": true,
            "sauvage": false,
            "rayures": false,
            "taches": false,
            "carnivore": false,
            "sait_voler": false,
            "sait_nager": false
          }
        },
        {
          "id": "aigle",
          "nom": "Astride l'aigle",
          "emoji": "🦅",
          "attributs": {
            "classe": "oiseau",
            "habitat": "foret",
            "domestique": false,
            "sauvage": true,
            "rayures": false,
            "taches": false,
            "carnivore": true,
            "sait_voler": true,
            "sait_nager": false
          }
        },
        {
          "id": "hibou",
          "nom": "Hugo le hibou",
          "emoji": "🦉",
          "attributs": {
            "classe": "oiseau",
            "habitat": "foret",
            "domestique": false,
            "sauvage": true,
            "rayures": false,
            "taches": true,
            "carnivore": true,
            "sait_voler": true,
            "sait_nager": false
          }
        },
        {
          "id": "perroquet",
          "nom": "Coco le perroquet",
          "emoji": "🦜",
          "attributs": {
            "classe": "oiseau",
            "habitat": "jungle",
            "domestique": false,
            "sauvage": true,
            "rayures": false,
            "taches": false,
            "carnivore": false,
            "sait_voler": true,
            "sait_nager": false
          }
        },
        {
          "id": "manchot",
          "nom": "Pingo le manchot",
          "emoji": "🐧",
          "attributs": {
            "classe": "oiseau",
            "habitat": "ocean",
            "domestique": false,
            "sauvage": true,
            "rayures": false,
            "taches": false,
            "carnivore": true,
            "sait_voler": false,
            "sait_nager": true
          }
        },
        {
          "id": "flamant",
          "nom": "Flammy le flamant",
          "emoji": "🦩",
          "attributs": {
            "classe": "oiseau",
            "habitat": "savane",
            "domestique": false,
            "sauvage": true,
            "rayures": false,
            "taches": false,
            "carnivore": false,
            "sait_voler": true,
            "sait_nager": true
          }
        },
        {
          "id": "serpent",
          "nom": "Sissi le serpent",
          "emoji": "🐍",
          "attributs": {
            "classe": "reptile",
            "habitat": "foret",
            "domestique": false,
            "sauvage": true,
            "rayures": true,
            "taches": false,
            "carnivore": true,
            "sait_voler": false,
            "sait_nager": false
          }
        },
        {
          "id": "crocodile",
          "nom": "Croco le crocodile",
          "emoji": "🐊",
          "attributs": {
            "classe": "reptile",
            "habitat": "jungle",
            "domestique": false,
            "sauvage": true,
            "rayures": false,
            "taches": false,
            "carnivore": true,
            "sait_voler": false,
            "sait_nager": true
          }
        },
        {
          "id": "tortue",
          "nom": "Tully la tortue",
          "emoji": "🐢",
          "attributs": {
            "classe": "reptile",
            "habitat": "ocean",
            "domestique": true,
            "sauvage": false,
            "rayures": false,
            "taches": true,
            "carnivore": false,
            "sait_voler": false,
            "sait_nager": true
          }
        },
        {
          "id": "requin",
          "nom": "Mako le requin",
          "emoji": "🦈",
          "attributs": {
            "classe": "poisson",
            "habitat": "ocean",
            "domestique": false,
            "sauvage": true,
            "rayures": false,
            "taches": false,
            "carnivore": true,
            "sait_voler": false,
            "sait_nager": true
          }
        },
        {
          "id": "poisson-clown",
          "nom": "Clowny le poisson-clown",
          "emoji": "🐠",
          "attributs": {
            "classe": "poisson",
            "habitat": "ocean",
            "domestique": true,
            "sauvage": false,
            "rayures": true,
            "taches": false,
            "carnivore": false,
            "sait_voler": false,
            "sait_nager": true
          }
        },
        {
          "id": "abeille",
          "nom": "Zaza l'abeille",
          "emoji": "🐝",
          "attributs": {
            "classe": "insecte",
            "habitat": "foret",
            "domestique": false,
            "sauvage": true,
            "rayures": true,
            "taches": false,
            "carnivore": false,
            "sait_voler": true,
            "sait_nager": false
          }
        },
        {
          "id": "papillon",
          "nom": "Paulo le papillon",
          "emoji": "🦋",
          "attributs": {
            "classe": "insecte",
            "habitat": "foret",
            "domestique": false,
            "sauvage": true,
            "rayures": true,
            "taches": true,
            "carnivore": false,
            "sait_voler": true,
            "sait_nager": false
          }
        }
      ]
    },
    {
      "id": "star-wars",
      "nom": "Star Wars",
      "sousTitre": "Une galaxie lointaine",
      "description": "Jedi, Sith, droïdes et contrebandiers : la Force est avec celui qui saura démasquer l'autre.",
      "emoji": "⚔️",
      "palette": {
        "accent": "#ffd166",
        "accent2": "#67e8f9",
        "fond": "#071120",
        "lueur": "#67e8f9"
      },
      "attributs": [
        {
          "id": "humain",
          "nom": "Humain",
          "type": "bool",
          "categorie": "Espèce",
          "icone": "🧑",
          "question": "Ton personnage est-il humain ?"
        },
        {
          "id": "espece_non_humaine",
          "nom": "Espèce non humaine",
          "type": "bool",
          "categorie": "Espèce",
          "icone": "👽",
          "question": "Ton personnage appartient-il à une espèce non humaine ?"
        },
        {
          "id": "casque",
          "nom": "Casque",
          "type": "bool",
          "categorie": "Équipement",
          "icone": "🪖",
          "question": "Ton personnage porte-t-il un casque ?"
        },
        {
          "id": "droide",
          "nom": "Droïde",
          "type": "bool",
          "categorie": "Espèce",
          "icone": "🤖",
          "question": "Ton personnage est-il un droïde ?"
        },
        {
          "id": "sabre_laser",
          "nom": "Sabre laser",
          "type": "bool",
          "categorie": "Équipement",
          "icone": "⚔️",
          "question": "Ton personnage manie-t-il un sabre laser ?"
        },
        {
          "id": "cote_obscur",
          "nom": "Côté obscur",
          "type": "bool",
          "categorie": "Allégeance",
          "icone": "🌑",
          "question": "Ton personnage appartient-il au côté obscur ?"
        },
        {
          "id": "robe",
          "nom": "Robe",
          "type": "bool",
          "categorie": "Apparence",
          "icone": "🥋",
          "question": "Ton personnage porte-t-il une robe ?"
        },
        {
          "id": "pilote",
          "nom": "Pilote",
          "type": "bool",
          "categorie": "Capacités",
          "icone": "🚀",
          "question": "Ton personnage est-il pilote ?"
        },
        {
          "id": "force",
          "nom": "Sensible à la Force",
          "type": "bool",
          "categorie": "Capacités",
          "icone": "✨",
          "question": "Ton personnage est-il sensible à la Force ?"
        }
      ],
      "personnages": [
        {
          "id": "luke",
          "nom": "Luke Skywalker",
          "emoji": "🧑‍🌾",
          "attributs": {
            "humain": true,
            "espece_non_humaine": false,
            "casque": true,
            "droide": false,
            "sabre_laser": true,
            "cote_obscur": false,
            "robe": true,
            "pilote": true,
            "force": true
          }
        },
        {
          "id": "leia",
          "nom": "Leia Organa",
          "emoji": "👸",
          "attributs": {
            "humain": true,
            "espece_non_humaine": false,
            "casque": false,
            "droide": false,
            "sabre_laser": false,
            "cote_obscur": false,
            "robe": true,
            "pilote": false,
            "force": true
          }
        },
        {
          "id": "han",
          "nom": "Han Solo",
          "emoji": "🧑‍✈️",
          "attributs": {
            "humain": true,
            "espece_non_humaine": false,
            "casque": false,
            "droide": false,
            "sabre_laser": false,
            "cote_obscur": false,
            "robe": false,
            "pilote": true,
            "force": false
          }
        },
        {
          "id": "chewbacca",
          "nom": "Chewbacca",
          "emoji": "🐻",
          "attributs": {
            "humain": false,
            "espece_non_humaine": true,
            "casque": false,
            "droide": false,
            "sabre_laser": false,
            "cote_obscur": false,
            "robe": false,
            "pilote": true,
            "force": false
          }
        },
        {
          "id": "vador",
          "nom": "Dark Vador",
          "emoji": "🌑",
          "attributs": {
            "humain": true,
            "espece_non_humaine": false,
            "casque": true,
            "droide": false,
            "sabre_laser": true,
            "cote_obscur": true,
            "robe": true,
            "pilote": true,
            "force": true
          }
        },
        {
          "id": "yoda",
          "nom": "Yoda",
          "emoji": "🧙",
          "attributs": {
            "humain": false,
            "espece_non_humaine": true,
            "casque": false,
            "droide": false,
            "sabre_laser": true,
            "cote_obscur": false,
            "robe": true,
            "pilote": false,
            "force": true
          }
        },
        {
          "id": "r2d2",
          "nom": "R2-D2",
          "emoji": "🤖",
          "attributs": {
            "humain": false,
            "espece_non_humaine": true,
            "casque": false,
            "droide": true,
            "sabre_laser": false,
            "cote_obscur": false,
            "robe": false,
            "pilote": true,
            "force": false
          }
        },
        {
          "id": "c3po",
          "nom": "C-3PO",
          "emoji": "🟡",
          "attributs": {
            "humain": false,
            "espece_non_humaine": true,
            "casque": false,
            "droide": true,
            "sabre_laser": false,
            "cote_obscur": false,
            "robe": false,
            "pilote": false,
            "force": false
          }
        },
        {
          "id": "boba-fett",
          "nom": "Boba Fett",
          "emoji": "🪖",
          "attributs": {
            "humain": true,
            "espece_non_humaine": false,
            "casque": true,
            "droide": false,
            "sabre_laser": false,
            "cote_obscur": false,
            "robe": false,
            "pilote": true,
            "force": false
          }
        },
        {
          "id": "palpatine",
          "nom": "Palpatine",
          "emoji": "⚡",
          "attributs": {
            "humain": true,
            "espece_non_humaine": false,
            "casque": false,
            "droide": false,
            "sabre_laser": true,
            "cote_obscur": true,
            "robe": true,
            "pilote": false,
            "force": true
          }
        },
        {
          "id": "obi-wan",
          "nom": "Obi-Wan Kenobi",
          "emoji": "🧙‍♂️",
          "attributs": {
            "humain": true,
            "espece_non_humaine": false,
            "casque": false,
            "droide": false,
            "sabre_laser": true,
            "cote_obscur": false,
            "robe": true,
            "pilote": true,
            "force": true
          }
        },
        {
          "id": "rey",
          "nom": "Rey",
          "emoji": "🧝‍♀️",
          "attributs": {
            "humain": true,
            "espece_non_humaine": false,
            "casque": false,
            "droide": false,
            "sabre_laser": true,
            "cote_obscur": false,
            "robe": true,
            "pilote": true,
            "force": true
          }
        },
        {
          "id": "kylo-ren",
          "nom": "Kylo Ren",
          "emoji": "🖤",
          "attributs": {
            "humain": true,
            "espece_non_humaine": false,
            "casque": true,
            "droide": false,
            "sabre_laser": true,
            "cote_obscur": true,
            "robe": true,
            "pilote": true,
            "force": true
          }
        },
        {
          "id": "padme",
          "nom": "Padmé Amidala",
          "emoji": "👑",
          "attributs": {
            "humain": true,
            "espece_non_humaine": false,
            "casque": false,
            "droide": false,
            "sabre_laser": false,
            "cote_obscur": false,
            "robe": true,
            "pilote": true,
            "force": false
          }
        },
        {
          "id": "jabba",
          "nom": "Jabba le Hutt",
          "emoji": "🐌",
          "attributs": {
            "humain": false,
            "espece_non_humaine": true,
            "casque": false,
            "droide": false,
            "sabre_laser": false,
            "cote_obscur": false,
            "robe": false,
            "pilote": false,
            "force": false
          }
        },
        {
          "id": "stormtrooper",
          "nom": "Stormtrooper",
          "emoji": "🛡️",
          "attributs": {
            "humain": true,
            "espece_non_humaine": false,
            "casque": true,
            "droide": false,
            "sabre_laser": false,
            "cote_obscur": false,
            "robe": false,
            "pilote": false,
            "force": false
          }
        },
        {
          "id": "lando",
          "nom": "Lando Calrissian",
          "emoji": "🎲",
          "attributs": {
            "humain": true,
            "espece_non_humaine": false,
            "casque": false,
            "droide": false,
            "sabre_laser": false,
            "cote_obscur": false,
            "robe": false,
            "pilote": true,
            "force": false
          }
        },
        {
          "id": "anakin",
          "nom": "Anakin Skywalker",
          "emoji": "🏎️",
          "attributs": {
            "humain": true,
            "espece_non_humaine": false,
            "casque": true,
            "droide": false,
            "sabre_laser": true,
            "cote_obscur": false,
            "robe": true,
            "pilote": true,
            "force": true
          }
        },
        {
          "id": "mace-windu",
          "nom": "Mace Windu",
          "emoji": "🟣",
          "attributs": {
            "humain": true,
            "espece_non_humaine": false,
            "casque": false,
            "droide": false,
            "sabre_laser": true,
            "cote_obscur": false,
            "robe": true,
            "pilote": false,
            "force": true
          }
        },
        {
          "id": "ahsoka",
          "nom": "Ahsoka Tano",
          "emoji": "🧡",
          "attributs": {
            "humain": false,
            "espece_non_humaine": true,
            "casque": false,
            "droide": false,
            "sabre_laser": true,
            "cote_obscur": false,
            "robe": true,
            "pilote": true,
            "force": true
          }
        },
        {
          "id": "din-djarin",
          "nom": "Din Djarin",
          "emoji": "🪖",
          "attributs": {
            "humain": true,
            "espece_non_humaine": false,
            "casque": true,
            "droide": false,
            "sabre_laser": true,
            "cote_obscur": false,
            "robe": false,
            "pilote": true,
            "force": false
          }
        },
        {
          "id": "grogu",
          "nom": "Grogu",
          "emoji": "👽",
          "attributs": {
            "humain": false,
            "espece_non_humaine": true,
            "casque": false,
            "droide": false,
            "sabre_laser": false,
            "cote_obscur": false,
            "robe": true,
            "pilote": false,
            "force": true
          }
        },
        {
          "id": "poe",
          "nom": "Poe Dameron",
          "emoji": "🧑‍✈️",
          "attributs": {
            "humain": true,
            "espece_non_humaine": false,
            "casque": true,
            "droide": false,
            "sabre_laser": false,
            "cote_obscur": false,
            "robe": false,
            "pilote": true,
            "force": false
          }
        },
        {
          "id": "finn",
          "nom": "Finn",
          "emoji": "🧑‍🦱",
          "attributs": {
            "humain": true,
            "espece_non_humaine": false,
            "casque": true,
            "droide": false,
            "sabre_laser": false,
            "cote_obscur": false,
            "robe": false,
            "pilote": false,
            "force": false
          }
        }
      ]
    },
    {
      "id": "nourriture",
      "nom": "Nourriture",
      "sousTitre": "À table !",
      "description": "Des frites aux fruits, en passant par la pizza : un plateau gourmand pour un duel qui met l'eau à la bouche.",
      "emoji": "🍟",
      "palette": {
        "accent": "#ffcf6e",
        "accent2": "#ff7a6b",
        "fond": "#1d110b",
        "lueur": "#ff9f5a"
      },
      "attributs": [
        {
          "id": "type",
          "nom": "Famille",
          "type": "enum",
          "categorie": "Catégorie",
          "icone": "🍽️",
          "options": [
            {
              "id": "fruit",
              "nom": "Fruit",
              "question": "Ton personnage est-il un fruit ?"
            },
            {
              "id": "legume",
              "nom": "Légume",
              "question": "Ton personnage est-il un légume ?"
            },
            {
              "id": "plat",
              "nom": "Plat",
              "question": "Ton personnage est-il un plat ou une douceur ?"
            }
          ]
        },
        {
          "id": "sucre",
          "nom": "Sucré",
          "type": "bool",
          "categorie": "Saveurs",
          "icone": "🍯",
          "question": "Ton personnage est-il sucré ?"
        },
        {
          "id": "sale",
          "nom": "Salé",
          "type": "bool",
          "categorie": "Saveurs",
          "icone": "🧂",
          "question": "Ton personnage est-il salé ?"
        },
        {
          "id": "chaud",
          "nom": "Chaud",
          "type": "bool",
          "categorie": "Température",
          "icone": "🔥",
          "question": "Ton personnage se mange-t-il chaud ?"
        },
        {
          "id": "froid",
          "nom": "Froid",
          "type": "bool",
          "categorie": "Température",
          "icone": "🧊",
          "question": "Ton personnage se mange-t-il froid ?"
        },
        {
          "id": "couleur",
          "nom": "Couleur dominante",
          "type": "enum",
          "categorie": "Apparence",
          "icone": "🎨",
          "options": [
            {
              "id": "rouge",
              "nom": "Rouge",
              "question": "Sa couleur dominante est-elle le rouge ?"
            },
            {
              "id": "jaune",
              "nom": "Jaune",
              "question": "Sa couleur dominante est-elle le jaune ?"
            },
            {
              "id": "brun",
              "nom": "Brun",
              "question": "Sa couleur dominante est-elle le brun ?"
            },
            {
              "id": "vert",
              "nom": "Vert",
              "question": "Sa couleur dominante est-elle le vert ?"
            }
          ]
        },
        {
          "id": "origine",
          "nom": "Origine",
          "type": "enum",
          "categorie": "Origine",
          "icone": "🌍",
          "options": [
            {
              "id": "belgique",
              "nom": "Belgique",
              "question": "Ton personnage vient-il de Belgique ?"
            },
            {
              "id": "france",
              "nom": "France",
              "question": "Ton personnage vient-il de France ?"
            },
            {
              "id": "italie",
              "nom": "Italie",
              "question": "Ton personnage vient-il d'Italie ?"
            },
            {
              "id": "monde",
              "nom": "Ailleurs dans le monde",
              "question": "Ton personnage vient-il d'ailleurs dans le monde ?"
            }
          ]
        }
      ],
      "personnages": [
        {
          "id": "gaufre",
          "nom": "Gaufre de Liège",
          "emoji": "🧇",
          "attributs": {
            "type": "plat",
            "sucre": true,
            "sale": false,
            "chaud": true,
            "froid": false,
            "couleur": "jaune",
            "origine": "belgique"
          }
        },
        {
          "id": "frites",
          "nom": "Frites dorées",
          "emoji": "🍟",
          "attributs": {
            "type": "plat",
            "sucre": false,
            "sale": true,
            "chaud": true,
            "froid": false,
            "couleur": "jaune",
            "origine": "belgique"
          }
        },
        {
          "id": "moules",
          "nom": "Moules marinière",
          "emoji": "🦪",
          "attributs": {
            "type": "plat",
            "sucre": false,
            "sale": true,
            "chaud": true,
            "froid": false,
            "couleur": "brun",
            "origine": "france"
          }
        },
        {
          "id": "carbonnade",
          "nom": "Carbonnade flamande",
          "emoji": "🍲",
          "attributs": {
            "type": "plat",
            "sucre": false,
            "sale": true,
            "chaud": true,
            "froid": false,
            "couleur": "brun",
            "origine": "belgique"
          }
        },
        {
          "id": "cuberdon",
          "nom": "Cuberdon violet",
          "emoji": "🍬",
          "attributs": {
            "type": "plat",
            "sucre": true,
            "sale": false,
            "chaud": false,
            "froid": false,
            "couleur": "rouge",
            "origine": "belgique"
          }
        },
        {
          "id": "speculoos",
          "nom": "Spéculoos croustillant",
          "emoji": "🍪",
          "attributs": {
            "type": "plat",
            "sucre": true,
            "sale": false,
            "chaud": false,
            "froid": false,
            "couleur": "brun",
            "origine": "belgique"
          }
        },
        {
          "id": "pizza",
          "nom": "Pizza Margherita",
          "emoji": "🍕",
          "attributs": {
            "type": "plat",
            "sucre": false,
            "sale": true,
            "chaud": true,
            "froid": false,
            "couleur": "rouge",
            "origine": "italie"
          }
        },
        {
          "id": "sushi",
          "nom": "Sushi au saumon",
          "emoji": "🍣",
          "attributs": {
            "type": "plat",
            "sucre": false,
            "sale": true,
            "chaud": false,
            "froid": true,
            "couleur": "brun",
            "origine": "monde"
          }
        },
        {
          "id": "croissant",
          "nom": "Croissant au beurre",
          "emoji": "🥐",
          "attributs": {
            "type": "plat",
            "sucre": true,
            "sale": false,
            "chaud": true,
            "froid": false,
            "couleur": "jaune",
            "origine": "france"
          }
        },
        {
          "id": "chocolat",
          "nom": "Tablette de chocolat",
          "emoji": "🍫",
          "attributs": {
            "type": "plat",
            "sucre": true,
            "sale": false,
            "chaud": false,
            "froid": false,
            "couleur": "brun",
            "origine": "belgique"
          }
        },
        {
          "id": "pomme",
          "nom": "Pomme croquante",
          "emoji": "🍎",
          "attributs": {
            "type": "fruit",
            "sucre": true,
            "sale": false,
            "chaud": false,
            "froid": true,
            "couleur": "rouge",
            "origine": "france"
          }
        },
        {
          "id": "fraise",
          "nom": "Fraise des bois",
          "emoji": "🍓",
          "attributs": {
            "type": "fruit",
            "sucre": true,
            "sale": false,
            "chaud": false,
            "froid": true,
            "couleur": "rouge",
            "origine": "monde"
          }
        },
        {
          "id": "banane",
          "nom": "Banane voyageuse",
          "emoji": "🍌",
          "attributs": {
            "type": "fruit",
            "sucre": true,
            "sale": false,
            "chaud": false,
            "froid": true,
            "couleur": "jaune",
            "origine": "monde"
          }
        },
        {
          "id": "citron",
          "nom": "Citron vif",
          "emoji": "🍋",
          "attributs": {
            "type": "fruit",
            "sucre": true,
            "sale": false,
            "chaud": false,
            "froid": true,
            "couleur": "jaune",
            "origine": "monde"
          }
        },
        {
          "id": "orange",
          "nom": "Orange pressée",
          "emoji": "🍊",
          "attributs": {
            "type": "fruit",
            "sucre": true,
            "sale": false,
            "chaud": false,
            "froid": true,
            "couleur": "jaune",
            "origine": "monde"
          }
        },
        {
          "id": "raisin",
          "nom": "Raisin doré",
          "emoji": "🍇",
          "attributs": {
            "type": "fruit",
            "sucre": true,
            "sale": false,
            "chaud": false,
            "froid": true,
            "couleur": "rouge",
            "origine": "italie"
          }
        },
        {
          "id": "brocoli",
          "nom": "Brocoli vert",
          "emoji": "🥦",
          "attributs": {
            "type": "legume",
            "sucre": false,
            "sale": false,
            "chaud": false,
            "froid": true,
            "couleur": "vert",
            "origine": "italie"
          }
        },
        {
          "id": "courgette",
          "nom": "Courgette du jardin",
          "emoji": "🥒",
          "attributs": {
            "type": "legume",
            "sucre": false,
            "sale": false,
            "chaud": false,
            "froid": true,
            "couleur": "vert",
            "origine": "italie"
          }
        },
        {
          "id": "petits-pois",
          "nom": "Petits pois tendres",
          "emoji": "🫛",
          "attributs": {
            "type": "legume",
            "sucre": false,
            "sale": false,
            "chaud": false,
            "froid": true,
            "couleur": "vert",
            "origine": "monde"
          }
        },
        {
          "id": "salade",
          "nom": "Salade croquante",
          "emoji": "🥗",
          "attributs": {
            "type": "legume",
            "sucre": false,
            "sale": true,
            "chaud": false,
            "froid": true,
            "couleur": "vert",
            "origine": "france"
          }
        },
        {
          "id": "epinards",
          "nom": "Épinards frais",
          "emoji": "🥬",
          "attributs": {
            "type": "legume",
            "sucre": false,
            "sale": false,
            "chaud": false,
            "froid": true,
            "couleur": "vert",
            "origine": "france"
          }
        },
        {
          "id": "haricots-verts",
          "nom": "Haricots verts",
          "emoji": "🌱",
          "attributs": {
            "type": "legume",
            "sucre": false,
            "sale": false,
            "chaud": false,
            "froid": true,
            "couleur": "vert",
            "origine": "france"
          }
        },
        {
          "id": "tomate",
          "nom": "Tomate mûre",
          "emoji": "🍅",
          "attributs": {
            "type": "legume",
            "sucre": false,
            "sale": false,
            "chaud": false,
            "froid": true,
            "couleur": "rouge",
            "origine": "italie"
          }
        },
        {
          "id": "champignon",
          "nom": "Champignon de Paris",
          "emoji": "🍄",
          "attributs": {
            "type": "legume",
            "sucre": false,
            "sale": false,
            "chaud": false,
            "froid": true,
            "couleur": "brun",
            "origine": "italie"
          }
        }
      ]
    },
    {
      "id": "harry-potter",
      "nom": "Harry Potter",
      "sousTitre": "Magie à Poudlard",
      "description": "Sorciers, créatures et professeurs : un plateau ensorcelé où chaque détail peut trahir un secret.",
      "emoji": "⚡",
      "palette": {
        "accent": "#e7c46b",
        "accent2": "#b98cff",
        "fond": "#120a16",
        "lueur": "#b98cff"
      },
      "attributs": [
        {
          "id": "gryffondor",
          "nom": "Gryffondor",
          "type": "bool",
          "categorie": "Maison",
          "icone": "🦁",
          "question": "Ton personnage appartient-il à Gryffondor ?"
        },
        {
          "id": "serpentard",
          "nom": "Serpentard",
          "type": "bool",
          "categorie": "Maison",
          "icone": "🐍",
          "question": "Ton personnage appartient-il à Serpentard ?"
        },
        {
          "id": "professeur",
          "nom": "Professeur",
          "type": "bool",
          "categorie": "Rôle",
          "icone": "🎓",
          "question": "Ton personnage est-il professeur à Poudlard ?"
        },
        {
          "id": "ordre_phoenix",
          "nom": "Ordre du Phénix",
          "type": "bool",
          "categorie": "Allégeance",
          "icone": "🔥",
          "question": "Ton personnage fait-il partie de l'Ordre du Phénix ?"
        },
        {
          "id": "mangemort",
          "nom": "Mangemort",
          "type": "bool",
          "categorie": "Allégeance",
          "icone": "💀",
          "question": "Ton personnage a-t-il été un Mangemort ?"
        },
        {
          "id": "non_humain",
          "nom": "Non humain",
          "type": "bool",
          "categorie": "Espèce",
          "icone": "🦉",
          "question": "Ton personnage n'est-il pas humain ?"
        },
        {
          "id": "adulte",
          "nom": "Adulte",
          "type": "bool",
          "categorie": "Âge",
          "icone": "🧑",
          "question": "Ton personnage est-il adulte ?"
        },
        {
          "id": "mort",
          "nom": "Mort dans la saga",
          "type": "bool",
          "categorie": "Histoire",
          "icone": "🕯️",
          "question": "Ton personnage meurt-il dans la saga ?"
        },
        {
          "id": "animal",
          "nom": "Animal de compagnie",
          "type": "bool",
          "categorie": "Compagnons",
          "icone": "🐾",
          "question": "Ton personnage possède-t-il un animal de compagnie ?"
        },
        {
          "id": "change_forme",
          "nom": "Change de forme",
          "type": "bool",
          "categorie": "Capacités",
          "icone": "🌙",
          "question": "Ton personnage peut-il changer de forme ?"
        },
        {
          "id": "lunettes",
          "nom": "Lunettes",
          "type": "bool",
          "categorie": "Apparence",
          "icone": "👓",
          "question": "Ton personnage porte-t-il des lunettes ?"
        }
      ],
      "personnages": [
        {
          "id": "harry",
          "nom": "Harry Potter",
          "emoji": "⚡",
          "attributs": {
            "gryffondor": true,
            "serpentard": false,
            "professeur": false,
            "ordre_phoenix": true,
            "mangemort": false,
            "non_humain": false,
            "adulte": false,
            "mort": false,
            "animal": true,
            "change_forme": false,
            "lunettes": true
          }
        },
        {
          "id": "hermione",
          "nom": "Hermione Granger",
          "emoji": "📚",
          "attributs": {
            "gryffondor": true,
            "serpentard": false,
            "professeur": false,
            "ordre_phoenix": true,
            "mangemort": false,
            "non_humain": false,
            "adulte": false,
            "mort": false,
            "animal": true,
            "change_forme": false,
            "lunettes": false
          }
        },
        {
          "id": "ron",
          "nom": "Ron Weasley",
          "emoji": "🧡",
          "attributs": {
            "gryffondor": true,
            "serpentard": false,
            "professeur": false,
            "ordre_phoenix": true,
            "mangemort": false,
            "non_humain": false,
            "adulte": false,
            "mort": false,
            "animal": true,
            "change_forme": false,
            "lunettes": false
          }
        },
        {
          "id": "drago",
          "nom": "Drago Malefoy",
          "emoji": "🐍",
          "attributs": {
            "gryffondor": false,
            "serpentard": true,
            "professeur": false,
            "ordre_phoenix": false,
            "mangemort": true,
            "non_humain": false,
            "adulte": false,
            "mort": false,
            "animal": false,
            "change_forme": false,
            "lunettes": false
          }
        },
        {
          "id": "dumbledore",
          "nom": "Albus Dumbledore",
          "emoji": "🧙‍♂️",
          "attributs": {
            "gryffondor": true,
            "serpentard": false,
            "professeur": true,
            "ordre_phoenix": true,
            "mangemort": false,
            "non_humain": false,
            "adulte": true,
            "mort": true,
            "animal": true,
            "change_forme": false,
            "lunettes": true
          }
        },
        {
          "id": "voldemort",
          "nom": "Lord Voldemort",
          "emoji": "🐍",
          "attributs": {
            "gryffondor": false,
            "serpentard": true,
            "professeur": false,
            "ordre_phoenix": false,
            "mangemort": true,
            "non_humain": false,
            "adulte": true,
            "mort": true,
            "animal": true,
            "change_forme": false,
            "lunettes": false
          }
        },
        {
          "id": "rogue",
          "nom": "Severus Rogue",
          "emoji": "🧪",
          "attributs": {
            "gryffondor": false,
            "serpentard": true,
            "professeur": true,
            "ordre_phoenix": false,
            "mangemort": true,
            "non_humain": false,
            "adulte": true,
            "mort": true,
            "animal": false,
            "change_forme": false,
            "lunettes": false
          }
        },
        {
          "id": "hagrid",
          "nom": "Rubeus Hagrid",
          "emoji": "🧔",
          "attributs": {
            "gryffondor": true,
            "serpentard": false,
            "professeur": true,
            "ordre_phoenix": true,
            "mangemort": false,
            "non_humain": false,
            "adulte": true,
            "mort": false,
            "animal": true,
            "change_forme": false,
            "lunettes": false
          }
        },
        {
          "id": "sirius",
          "nom": "Sirius Black",
          "emoji": "🐺",
          "attributs": {
            "gryffondor": true,
            "serpentard": false,
            "professeur": false,
            "ordre_phoenix": true,
            "mangemort": false,
            "non_humain": false,
            "adulte": true,
            "mort": true,
            "animal": true,
            "change_forme": true,
            "lunettes": false
          }
        },
        {
          "id": "lupin",
          "nom": "Remus Lupin",
          "emoji": "🌕",
          "attributs": {
            "gryffondor": true,
            "serpentard": false,
            "professeur": true,
            "ordre_phoenix": true,
            "mangemort": false,
            "non_humain": false,
            "adulte": true,
            "mort": true,
            "animal": false,
            "change_forme": true,
            "lunettes": false
          }
        },
        {
          "id": "bellatrix",
          "nom": "Bellatrix Lestrange",
          "emoji": "🔮",
          "attributs": {
            "gryffondor": false,
            "serpentard": true,
            "professeur": false,
            "ordre_phoenix": false,
            "mangemort": true,
            "non_humain": false,
            "adulte": true,
            "mort": true,
            "animal": false,
            "change_forme": false,
            "lunettes": false
          }
        },
        {
          "id": "luna",
          "nom": "Luna Lovegood",
          "emoji": "🌙",
          "attributs": {
            "gryffondor": false,
            "serpentard": false,
            "professeur": false,
            "ordre_phoenix": true,
            "mangemort": false,
            "non_humain": false,
            "adulte": false,
            "mort": false,
            "animal": false,
            "change_forme": false,
            "lunettes": false
          }
        },
        {
          "id": "neville",
          "nom": "Neville Londubat",
          "emoji": "🌿",
          "attributs": {
            "gryffondor": true,
            "serpentard": false,
            "professeur": false,
            "ordre_phoenix": true,
            "mangemort": false,
            "non_humain": false,
            "adulte": false,
            "mort": false,
            "animal": false,
            "change_forme": false,
            "lunettes": false
          }
        },
        {
          "id": "ginny",
          "nom": "Ginny Weasley",
          "emoji": "🔥",
          "attributs": {
            "gryffondor": true,
            "serpentard": false,
            "professeur": false,
            "ordre_phoenix": true,
            "mangemort": false,
            "non_humain": false,
            "adulte": false,
            "mort": false,
            "animal": false,
            "change_forme": false,
            "lunettes": false
          }
        },
        {
          "id": "mcgonagall",
          "nom": "Minerva McGonagall",
          "emoji": "🐈",
          "attributs": {
            "gryffondor": true,
            "serpentard": false,
            "professeur": true,
            "ordre_phoenix": true,
            "mangemort": false,
            "non_humain": false,
            "adulte": true,
            "mort": false,
            "animal": false,
            "change_forme": true,
            "lunettes": false
          }
        },
        {
          "id": "dobby",
          "nom": "Dobby",
          "emoji": "🧦",
          "attributs": {
            "gryffondor": false,
            "serpentard": false,
            "professeur": false,
            "ordre_phoenix": false,
            "mangemort": false,
            "non_humain": true,
            "adulte": true,
            "mort": true,
            "animal": false,
            "change_forme": false,
            "lunettes": false
          }
        },
        {
          "id": "cedric",
          "nom": "Cedric Diggory",
          "emoji": "🦡",
          "attributs": {
            "gryffondor": false,
            "serpentard": false,
            "professeur": false,
            "ordre_phoenix": false,
            "mangemort": false,
            "non_humain": false,
            "adulte": false,
            "mort": true,
            "animal": false,
            "change_forme": false,
            "lunettes": false
          }
        },
        {
          "id": "fleur",
          "nom": "Fleur Delacour",
          "emoji": "🌸",
          "attributs": {
            "gryffondor": false,
            "serpentard": false,
            "professeur": false,
            "ordre_phoenix": false,
            "mangemort": false,
            "non_humain": false,
            "adulte": true,
            "mort": false,
            "animal": false,
            "change_forme": false,
            "lunettes": false
          }
        },
        {
          "id": "krum",
          "nom": "Viktor Krum",
          "emoji": "🦅",
          "attributs": {
            "gryffondor": false,
            "serpentard": false,
            "professeur": false,
            "ordre_phoenix": false,
            "mangemort": false,
            "non_humain": false,
            "adulte": true,
            "mort": false,
            "animal": false,
            "change_forme": false,
            "lunettes": false
          }
        },
        {
          "id": "tonks",
          "nom": "Nymphadora Tonks",
          "emoji": "🦋",
          "attributs": {
            "gryffondor": false,
            "serpentard": false,
            "professeur": false,
            "ordre_phoenix": true,
            "mangemort": false,
            "non_humain": false,
            "adulte": true,
            "mort": true,
            "animal": false,
            "change_forme": true,
            "lunettes": false
          }
        },
        {
          "id": "moody",
          "nom": "Alastor Maugrey",
          "emoji": "👁️",
          "attributs": {
            "gryffondor": false,
            "serpentard": false,
            "professeur": true,
            "ordre_phoenix": true,
            "mangemort": false,
            "non_humain": false,
            "adulte": true,
            "mort": true,
            "animal": false,
            "change_forme": false,
            "lunettes": false
          }
        },
        {
          "id": "ombrage",
          "nom": "Dolores Ombrage",
          "emoji": "🐸",
          "attributs": {
            "gryffondor": false,
            "serpentard": true,
            "professeur": true,
            "ordre_phoenix": false,
            "mangemort": false,
            "non_humain": false,
            "adulte": true,
            "mort": false,
            "animal": true,
            "change_forme": false,
            "lunettes": false
          }
        },
        {
          "id": "lucius",
          "nom": "Lucius Malefoy",
          "emoji": "🐍",
          "attributs": {
            "gryffondor": false,
            "serpentard": true,
            "professeur": false,
            "ordre_phoenix": false,
            "mangemort": true,
            "non_humain": false,
            "adulte": true,
            "mort": false,
            "animal": false,
            "change_forme": false,
            "lunettes": false
          }
        },
        {
          "id": "hedwig",
          "nom": "Hedwige",
          "emoji": "🦉",
          "attributs": {
            "gryffondor": false,
            "serpentard": false,
            "professeur": false,
            "ordre_phoenix": false,
            "mangemort": false,
            "non_humain": true,
            "adulte": true,
            "mort": true,
            "animal": false,
            "change_forme": false,
            "lunettes": false
          }
        }
      ]
    },
    {
      "id": "marvel",
      "nom": "Marvel",
      "sousTitre": "Héros et vilains",
      "description": "Avengers, Gardiens et mutants : un plateau sous tension pour démasquer le héros caché.",
      "emoji": "🕷️",
      "palette": {
        "accent": "#ff5c5c",
        "accent2": "#ffd166",
        "fond": "#16080b",
        "lueur": "#ff5c5c"
      },
      "attributs": [
        {
          "id": "humain",
          "nom": "Humain",
          "type": "bool",
          "categorie": "Espèce",
          "icone": "🧑",
          "question": "Ton personnage est-il humain ?"
        },
        {
          "id": "surhumain",
          "nom": "Surhumain",
          "type": "bool",
          "categorie": "Capacités",
          "icone": "💥",
          "question": "Ton personnage possède-t-il des capacités surhumaines ?"
        },
        {
          "id": "avengers",
          "nom": "Avengers",
          "type": "bool",
          "categorie": "Équipe",
          "icone": "🅰️",
          "question": "Ton personnage fait-il partie des Avengers ?"
        },
        {
          "id": "gardiens",
          "nom": "Gardiens de la Galaxie",
          "type": "bool",
          "categorie": "Équipe",
          "icone": "🚀",
          "question": "Ton personnage fait-il partie des Gardiens de la Galaxie ?"
        },
        {
          "id": "xmen",
          "nom": "X-Men",
          "type": "bool",
          "categorie": "Équipe",
          "icone": "❌",
          "question": "Ton personnage fait-il partie des X-Men ?"
        },
        {
          "id": "mechant",
          "nom": "Vilain",
          "type": "bool",
          "categorie": "Allégeance",
          "icone": "😈",
          "question": "Ton personnage est-il un vilain ?"
        },
        {
          "id": "cosmique",
          "nom": "Cosmique",
          "type": "bool",
          "categorie": "Origine",
          "icone": "🌌",
          "question": "Ton personnage vient-il de l'espace ou du cosmos ?"
        },
        {
          "id": "tech",
          "nom": "Technologie",
          "type": "bool",
          "categorie": "Équipement",
          "icone": "🛠️",
          "question": "Ton personnage utilise-t-il une technologie avancée ?"
        },
        {
          "id": "vole",
          "nom": "Sait voler",
          "type": "bool",
          "categorie": "Capacités",
          "icone": "🪽",
          "question": "Ton personnage sait-il voler ?"
        },
        {
          "id": "masque",
          "nom": "Masque ou casque",
          "type": "bool",
          "categorie": "Apparence",
          "icone": "🎭",
          "question": "Ton personnage porte-t-il un masque ou un casque ?"
        },
        {
          "id": "mutant",
          "nom": "Mutant",
          "type": "bool",
          "categorie": "Espèce",
          "icone": "🧬",
          "question": "Ton personnage est-il un mutant ?"
        },
        {
          "id": "arme_blanche",
          "nom": "Arme blanche",
          "type": "bool",
          "categorie": "Équipement",
          "icone": "🗡️",
          "question": "Ton personnage combat-il avec une arme blanche ?"
        }
      ],
      "personnages": [
        {
          "id": "spider-man",
          "nom": "Spider-Man",
          "emoji": "🕷️",
          "attributs": {
            "humain": true,
            "surhumain": true,
            "avengers": true,
            "gardiens": false,
            "xmen": false,
            "mechant": false,
            "cosmique": false,
            "tech": true,
            "vole": true,
            "masque": true,
            "mutant": false,
            "arme_blanche": false
          }
        },
        {
          "id": "iron-man",
          "nom": "Iron Man",
          "emoji": "🦾",
          "attributs": {
            "humain": true,
            "surhumain": false,
            "avengers": true,
            "gardiens": false,
            "xmen": false,
            "mechant": false,
            "cosmique": false,
            "tech": true,
            "vole": true,
            "masque": true,
            "mutant": false,
            "arme_blanche": false
          }
        },
        {
          "id": "captain-america",
          "nom": "Captain America",
          "emoji": "🛡️",
          "attributs": {
            "humain": true,
            "surhumain": true,
            "avengers": true,
            "gardiens": false,
            "xmen": false,
            "mechant": false,
            "cosmique": false,
            "tech": false,
            "vole": false,
            "masque": true,
            "mutant": false,
            "arme_blanche": false
          }
        },
        {
          "id": "thor",
          "nom": "Thor",
          "emoji": "⚡",
          "attributs": {
            "humain": false,
            "surhumain": true,
            "avengers": true,
            "gardiens": false,
            "xmen": false,
            "mechant": false,
            "cosmique": true,
            "tech": false,
            "vole": true,
            "masque": false,
            "mutant": false,
            "arme_blanche": false
          }
        },
        {
          "id": "hulk",
          "nom": "Hulk",
          "emoji": "💚",
          "attributs": {
            "humain": true,
            "surhumain": true,
            "avengers": true,
            "gardiens": false,
            "xmen": false,
            "mechant": false,
            "cosmique": false,
            "tech": false,
            "vole": false,
            "masque": false,
            "mutant": false,
            "arme_blanche": false
          }
        },
        {
          "id": "black-widow",
          "nom": "Black Widow",
          "emoji": "🕸️",
          "attributs": {
            "humain": true,
            "surhumain": false,
            "avengers": true,
            "gardiens": false,
            "xmen": false,
            "mechant": false,
            "cosmique": false,
            "tech": true,
            "vole": false,
            "masque": false,
            "mutant": false,
            "arme_blanche": false
          }
        },
        {
          "id": "hawkeye",
          "nom": "Hawkeye",
          "emoji": "🏹",
          "attributs": {
            "humain": true,
            "surhumain": false,
            "avengers": true,
            "gardiens": false,
            "xmen": false,
            "mechant": false,
            "cosmique": false,
            "tech": true,
            "vole": false,
            "masque": false,
            "mutant": false,
            "arme_blanche": false
          }
        },
        {
          "id": "doctor-strange",
          "nom": "Doctor Strange",
          "emoji": "🌀",
          "attributs": {
            "humain": true,
            "surhumain": true,
            "avengers": false,
            "gardiens": false,
            "xmen": false,
            "mechant": false,
            "cosmique": false,
            "tech": false,
            "vole": true,
            "masque": false,
            "mutant": false,
            "arme_blanche": false
          }
        },
        {
          "id": "black-panther",
          "nom": "Black Panther",
          "emoji": "🐆",
          "attributs": {
            "humain": true,
            "surhumain": true,
            "avengers": true,
            "gardiens": false,
            "xmen": false,
            "mechant": false,
            "cosmique": false,
            "tech": true,
            "vole": false,
            "masque": true,
            "mutant": false,
            "arme_blanche": false
          }
        },
        {
          "id": "scarlet-witch",
          "nom": "Scarlet Witch",
          "emoji": "🔮",
          "attributs": {
            "humain": true,
            "surhumain": true,
            "avengers": true,
            "gardiens": false,
            "xmen": false,
            "mechant": false,
            "cosmique": false,
            "tech": false,
            "vole": true,
            "masque": false,
            "mutant": true,
            "arme_blanche": false
          }
        },
        {
          "id": "vision",
          "nom": "Vision",
          "emoji": "👁️",
          "attributs": {
            "humain": false,
            "surhumain": true,
            "avengers": true,
            "gardiens": false,
            "xmen": false,
            "mechant": false,
            "cosmique": true,
            "tech": true,
            "vole": true,
            "masque": false,
            "mutant": false,
            "arme_blanche": false
          }
        },
        {
          "id": "loki",
          "nom": "Loki",
          "emoji": "🐍",
          "attributs": {
            "humain": false,
            "surhumain": true,
            "avengers": false,
            "gardiens": false,
            "xmen": false,
            "mechant": true,
            "cosmique": true,
            "tech": false,
            "vole": true,
            "masque": true,
            "mutant": false,
            "arme_blanche": true
          }
        },
        {
          "id": "thanos",
          "nom": "Thanos",
          "emoji": "🟣",
          "attributs": {
            "humain": false,
            "surhumain": true,
            "avengers": false,
            "gardiens": false,
            "xmen": false,
            "mechant": true,
            "cosmique": true,
            "tech": true,
            "vole": false,
            "masque": false,
            "mutant": false,
            "arme_blanche": false
          }
        },
        {
          "id": "wolverine",
          "nom": "Wolverine",
          "emoji": "🐺",
          "attributs": {
            "humain": true,
            "surhumain": true,
            "avengers": false,
            "gardiens": false,
            "xmen": true,
            "mechant": false,
            "cosmique": false,
            "tech": false,
            "vole": false,
            "masque": true,
            "mutant": true,
            "arme_blanche": true
          }
        },
        {
          "id": "professor-x",
          "nom": "Professor X",
          "emoji": "🧠",
          "attributs": {
            "humain": true,
            "surhumain": true,
            "avengers": false,
            "gardiens": false,
            "xmen": true,
            "mechant": false,
            "cosmique": false,
            "tech": true,
            "vole": false,
            "masque": false,
            "mutant": true,
            "arme_blanche": false
          }
        },
        {
          "id": "magneto",
          "nom": "Magneto",
          "emoji": "🧲",
          "attributs": {
            "humain": true,
            "surhumain": true,
            "avengers": false,
            "gardiens": false,
            "xmen": false,
            "mechant": true,
            "cosmique": false,
            "tech": true,
            "vole": true,
            "masque": true,
            "mutant": true,
            "arme_blanche": false
          }
        },
        {
          "id": "deadpool",
          "nom": "Deadpool",
          "emoji": "🗡️",
          "attributs": {
            "humain": true,
            "surhumain": true,
            "avengers": false,
            "gardiens": false,
            "xmen": true,
            "mechant": false,
            "cosmique": false,
            "tech": true,
            "vole": false,
            "masque": true,
            "mutant": true,
            "arme_blanche": true
          }
        },
        {
          "id": "captain-marvel",
          "nom": "Captain Marvel",
          "emoji": "⭐",
          "attributs": {
            "humain": false,
            "surhumain": true,
            "avengers": true,
            "gardiens": false,
            "xmen": false,
            "mechant": false,
            "cosmique": true,
            "tech": false,
            "vole": true,
            "masque": false,
            "mutant": false,
            "arme_blanche": false
          }
        },
        {
          "id": "star-lord",
          "nom": "Star-Lord",
          "emoji": "🎧",
          "attributs": {
            "humain": true,
            "surhumain": false,
            "avengers": false,
            "gardiens": true,
            "xmen": false,
            "mechant": false,
            "cosmique": true,
            "tech": true,
            "vole": true,
            "masque": true,
            "mutant": false,
            "arme_blanche": false
          }
        },
        {
          "id": "gamora",
          "nom": "Gamora",
          "emoji": "⚔️",
          "attributs": {
            "humain": false,
            "surhumain": true,
            "avengers": false,
            "gardiens": true,
            "xmen": false,
            "mechant": false,
            "cosmique": true,
            "tech": true,
            "vole": false,
            "masque": false,
            "mutant": false,
            "arme_blanche": true
          }
        },
        {
          "id": "rocket",
          "nom": "Rocket",
          "emoji": "🦝",
          "attributs": {
            "humain": false,
            "surhumain": false,
            "avengers": false,
            "gardiens": true,
            "xmen": false,
            "mechant": false,
            "cosmique": true,
            "tech": true,
            "vole": false,
            "masque": false,
            "mutant": false,
            "arme_blanche": false
          }
        },
        {
          "id": "groot",
          "nom": "Groot",
          "emoji": "🌳",
          "attributs": {
            "humain": false,
            "surhumain": true,
            "avengers": false,
            "gardiens": true,
            "xmen": false,
            "mechant": false,
            "cosmique": true,
            "tech": false,
            "vole": false,
            "masque": false,
            "mutant": false,
            "arme_blanche": false
          }
        },
        {
          "id": "ant-man",
          "nom": "Ant-Man",
          "emoji": "🐜",
          "attributs": {
            "humain": true,
            "surhumain": true,
            "avengers": true,
            "gardiens": false,
            "xmen": false,
            "mechant": false,
            "cosmique": false,
            "tech": true,
            "vole": false,
            "masque": true,
            "mutant": false,
            "arme_blanche": false
          }
        },
        {
          "id": "wasp",
          "nom": "Wasp",
          "emoji": "🐝",
          "attributs": {
            "humain": true,
            "surhumain": false,
            "avengers": true,
            "gardiens": false,
            "xmen": false,
            "mechant": false,
            "cosmique": false,
            "tech": true,
            "vole": true,
            "masque": true,
            "mutant": false,
            "arme_blanche": false
          }
        }
      ]
    },
    {
      "id": "dc-comics",
      "nom": "DC Comics",
      "sousTitre": "Justice et ténèbres",
      "description": "De Gotham à Metropolis, héros et vilains se confondent. À toi de faire la lumière sur le secret.",
      "emoji": "🦇",
      "palette": {
        "accent": "#58a6ff",
        "accent2": "#ffd166",
        "fond": "#07101d",
        "lueur": "#58a6ff"
      },
      "attributs": [
        {
          "id": "humain",
          "nom": "Humain",
          "type": "bool",
          "categorie": "Espèce",
          "icone": "🧑",
          "question": "Ton personnage est-il humain ?"
        },
        {
          "id": "surhumain",
          "nom": "Surhumain",
          "type": "bool",
          "categorie": "Capacités",
          "icone": "💥",
          "question": "Ton personnage possède-t-il des capacités surhumaines ?"
        },
        {
          "id": "justice_league",
          "nom": "Justice League",
          "type": "bool",
          "categorie": "Équipe",
          "icone": "🛡️",
          "question": "Ton personnage fait-il partie de la Justice League ?"
        },
        {
          "id": "gotham",
          "nom": "Gotham",
          "type": "bool",
          "categorie": "Origine",
          "icone": "🌃",
          "question": "Ton personnage est-il lié à Gotham City ?"
        },
        {
          "id": "mechant",
          "nom": "Vilain",
          "type": "bool",
          "categorie": "Allégeance",
          "icone": "😈",
          "question": "Ton personnage est-il un vilain ?"
        },
        {
          "id": "alien",
          "nom": "Extraterrestre",
          "type": "bool",
          "categorie": "Espèce",
          "icone": "👽",
          "question": "Ton personnage est-il extraterrestre ?"
        },
        {
          "id": "magie",
          "nom": "Magie",
          "type": "bool",
          "categorie": "Capacités",
          "icone": "✨",
          "question": "Ton personnage utilise-t-il de la magie ?"
        },
        {
          "id": "tech",
          "nom": "Technologie",
          "type": "bool",
          "categorie": "Équipement",
          "icone": "🛠️",
          "question": "Ton personnage utilise-t-il une technologie avancée ?"
        },
        {
          "id": "vole",
          "nom": "Sait voler",
          "type": "bool",
          "categorie": "Capacités",
          "icone": "🪽",
          "question": "Ton personnage sait-il voler ?"
        },
        {
          "id": "masque",
          "nom": "Masque ou casque",
          "type": "bool",
          "categorie": "Apparence",
          "icone": "🎭",
          "question": "Ton personnage porte-t-il un masque ou un casque ?"
        },
        {
          "id": "equipe_batman",
          "nom": "Famille Batman",
          "type": "bool",
          "categorie": "Équipe",
          "icone": "🦇",
          "question": "Ton personnage fait-il partie de la Bat-Famille ?"
        },
        {
          "id": "rapide",
          "nom": "Super vitesse",
          "type": "bool",
          "categorie": "Capacités",
          "icone": "💨",
          "question": "Ton personnage possède-t-il une super vitesse ?"
        }
      ],
      "personnages": [
        {
          "id": "superman",
          "nom": "Superman",
          "emoji": "🦸",
          "attributs": {
            "humain": false,
            "surhumain": true,
            "justice_league": true,
            "gotham": false,
            "mechant": false,
            "alien": true,
            "magie": false,
            "tech": false,
            "vole": true,
            "masque": false,
            "equipe_batman": false,
            "rapide": true
          }
        },
        {
          "id": "batman",
          "nom": "Batman",
          "emoji": "🦇",
          "attributs": {
            "humain": true,
            "surhumain": false,
            "justice_league": true,
            "gotham": true,
            "mechant": false,
            "alien": false,
            "magie": false,
            "tech": true,
            "vole": true,
            "masque": true,
            "equipe_batman": true,
            "rapide": false
          }
        },
        {
          "id": "wonder-woman",
          "nom": "Wonder Woman",
          "emoji": "🪢",
          "attributs": {
            "humain": false,
            "surhumain": true,
            "justice_league": true,
            "gotham": false,
            "mechant": false,
            "alien": false,
            "magie": true,
            "tech": false,
            "vole": true,
            "masque": false,
            "equipe_batman": false,
            "rapide": true
          }
        },
        {
          "id": "flash",
          "nom": "Flash",
          "emoji": "⚡",
          "attributs": {
            "humain": true,
            "surhumain": true,
            "justice_league": true,
            "gotham": false,
            "mechant": false,
            "alien": false,
            "magie": false,
            "tech": false,
            "vole": false,
            "masque": true,
            "equipe_batman": false,
            "rapide": true
          }
        },
        {
          "id": "aquaman",
          "nom": "Aquaman",
          "emoji": "🔱",
          "attributs": {
            "humain": false,
            "surhumain": true,
            "justice_league": true,
            "gotham": false,
            "mechant": false,
            "alien": false,
            "magie": false,
            "tech": false,
            "vole": false,
            "masque": false,
            "equipe_batman": false,
            "rapide": false
          }
        },
        {
          "id": "green-lantern",
          "nom": "Green Lantern",
          "emoji": "💚",
          "attributs": {
            "humain": true,
            "surhumain": true,
            "justice_league": true,
            "gotham": false,
            "mechant": false,
            "alien": false,
            "magie": false,
            "tech": true,
            "vole": true,
            "masque": true,
            "equipe_batman": false,
            "rapide": false
          }
        },
        {
          "id": "cyborg",
          "nom": "Cyborg",
          "emoji": "🤖",
          "attributs": {
            "humain": true,
            "surhumain": true,
            "justice_league": true,
            "gotham": false,
            "mechant": false,
            "alien": false,
            "magie": false,
            "tech": true,
            "vole": false,
            "masque": false,
            "equipe_batman": false,
            "rapide": false
          }
        },
        {
          "id": "martian-manhunter",
          "nom": "Martian Manhunter",
          "emoji": "👽",
          "attributs": {
            "humain": false,
            "surhumain": true,
            "justice_league": true,
            "gotham": false,
            "mechant": false,
            "alien": true,
            "magie": false,
            "tech": false,
            "vole": true,
            "masque": false,
            "equipe_batman": false,
            "rapide": false
          }
        },
        {
          "id": "supergirl",
          "nom": "Supergirl",
          "emoji": "🦸‍♀️",
          "attributs": {
            "humain": false,
            "surhumain": true,
            "justice_league": true,
            "gotham": false,
            "mechant": false,
            "alien": true,
            "magie": false,
            "tech": false,
            "vole": true,
            "masque": false,
            "equipe_batman": false,
            "rapide": true
          }
        },
        {
          "id": "nightwing",
          "nom": "Nightwing",
          "emoji": "🐦",
          "attributs": {
            "humain": true,
            "surhumain": false,
            "justice_league": false,
            "gotham": true,
            "mechant": false,
            "alien": false,
            "magie": false,
            "tech": true,
            "vole": true,
            "masque": true,
            "equipe_batman": true,
            "rapide": false
          }
        },
        {
          "id": "batgirl",
          "nom": "Batgirl",
          "emoji": "🦇",
          "attributs": {
            "humain": true,
            "surhumain": false,
            "justice_league": false,
            "gotham": true,
            "mechant": false,
            "alien": false,
            "magie": false,
            "tech": true,
            "vole": true,
            "masque": true,
            "equipe_batman": true,
            "rapide": false
          }
        },
        {
          "id": "robin",
          "nom": "Robin",
          "emoji": "🪶",
          "attributs": {
            "humain": true,
            "surhumain": false,
            "justice_league": false,
            "gotham": true,
            "mechant": false,
            "alien": false,
            "magie": false,
            "tech": true,
            "vole": true,
            "masque": true,
            "equipe_batman": true,
            "rapide": false
          }
        },
        {
          "id": "harley-quinn",
          "nom": "Harley Quinn",
          "emoji": "🎪",
          "attributs": {
            "humain": true,
            "surhumain": false,
            "justice_league": false,
            "gotham": true,
            "mechant": false,
            "alien": false,
            "magie": false,
            "tech": false,
            "vole": false,
            "masque": false,
            "equipe_batman": false,
            "rapide": false
          }
        },
        {
          "id": "joker",
          "nom": "Le Joker",
          "emoji": "🃏",
          "attributs": {
            "humain": true,
            "surhumain": false,
            "justice_league": false,
            "gotham": true,
            "mechant": true,
            "alien": false,
            "magie": false,
            "tech": true,
            "vole": false,
            "masque": true,
            "equipe_batman": false,
            "rapide": false
          }
        },
        {
          "id": "catwoman",
          "nom": "Catwoman",
          "emoji": "🐈",
          "attributs": {
            "humain": true,
            "surhumain": false,
            "justice_league": false,
            "gotham": true,
            "mechant": false,
            "alien": false,
            "magie": false,
            "tech": true,
            "vole": true,
            "masque": true,
            "equipe_batman": false,
            "rapide": false
          }
        },
        {
          "id": "poison-ivy",
          "nom": "Poison Ivy",
          "emoji": "🌿",
          "attributs": {
            "humain": true,
            "surhumain": true,
            "justice_league": false,
            "gotham": true,
            "mechant": false,
            "alien": false,
            "magie": true,
            "tech": false,
            "vole": false,
            "masque": false,
            "equipe_batman": false,
            "rapide": false
          }
        },
        {
          "id": "lex-luthor",
          "nom": "Lex Luthor",
          "emoji": "🧠",
          "attributs": {
            "humain": true,
            "surhumain": false,
            "justice_league": false,
            "gotham": false,
            "mechant": true,
            "alien": false,
            "magie": false,
            "tech": true,
            "vole": false,
            "masque": false,
            "equipe_batman": false,
            "rapide": false
          }
        },
        {
          "id": "darkseid",
          "nom": "Darkseid",
          "emoji": "🪨",
          "attributs": {
            "humain": false,
            "surhumain": true,
            "justice_league": false,
            "gotham": false,
            "mechant": true,
            "alien": true,
            "magie": false,
            "tech": true,
            "vole": false,
            "masque": false,
            "equipe_batman": false,
            "rapide": false
          }
        },
        {
          "id": "brainiac",
          "nom": "Brainiac",
          "emoji": "🛸",
          "attributs": {
            "humain": false,
            "surhumain": true,
            "justice_league": false,
            "gotham": false,
            "mechant": true,
            "alien": true,
            "magie": false,
            "tech": true,
            "vole": true,
            "masque": false,
            "equipe_batman": false,
            "rapide": false
          }
        },
        {
          "id": "deathstroke",
          "nom": "Deathstroke",
          "emoji": "🗡️",
          "attributs": {
            "humain": true,
            "surhumain": true,
            "justice_league": false,
            "gotham": false,
            "mechant": true,
            "alien": false,
            "magie": false,
            "tech": true,
            "vole": false,
            "masque": true,
            "equipe_batman": false,
            "rapide": false
          }
        },
        {
          "id": "green-arrow",
          "nom": "Green Arrow",
          "emoji": "🏹",
          "attributs": {
            "humain": true,
            "surhumain": false,
            "justice_league": true,
            "gotham": false,
            "mechant": false,
            "alien": false,
            "magie": false,
            "tech": true,
            "vole": false,
            "masque": true,
            "equipe_batman": false,
            "rapide": false
          }
        },
        {
          "id": "black-canary",
          "nom": "Black Canary",
          "emoji": "🎤",
          "attributs": {
            "humain": true,
            "surhumain": true,
            "justice_league": true,
            "gotham": false,
            "mechant": false,
            "alien": false,
            "magie": false,
            "tech": false,
            "vole": false,
            "masque": true,
            "equipe_batman": false,
            "rapide": false
          }
        },
        {
          "id": "shazam",
          "nom": "Shazam",
          "emoji": "🦸‍♂️",
          "attributs": {
            "humain": true,
            "surhumain": true,
            "justice_league": true,
            "gotham": false,
            "mechant": false,
            "alien": false,
            "magie": true,
            "tech": false,
            "vole": true,
            "masque": false,
            "equipe_batman": false,
            "rapide": true
          }
        },
        {
          "id": "raven",
          "nom": "Raven",
          "emoji": "🐦‍⬛",
          "attributs": {
            "humain": false,
            "surhumain": true,
            "justice_league": false,
            "gotham": false,
            "mechant": false,
            "alien": false,
            "magie": true,
            "tech": false,
            "vole": true,
            "masque": false,
            "equipe_batman": false,
            "rapide": false
          }
        }
      ]
    },
    {
      "id": "seigneur-des-anneaux",
      "nom": "Le Seigneur des Anneaux",
      "sousTitre": "La Terre du Milieu",
      "description": "Hobbits, elfes, magiciens et créatures de l'ombre : un plateau épique où l'Anneau change tout.",
      "emoji": "💍",
      "palette": {
        "accent": "#d8b45c",
        "accent2": "#7ee0b5",
        "fond": "#0a1510",
        "lueur": "#d8b45c"
      },
      "attributs": [
        {
          "id": "hobbit",
          "nom": "Hobbit",
          "type": "bool",
          "categorie": "Peuple",
          "icone": "🦶",
          "question": "Ton personnage est-il un hobbit ?"
        },
        {
          "id": "elfe",
          "nom": "Elfe",
          "type": "bool",
          "categorie": "Peuple",
          "icone": "🧝",
          "question": "Ton personnage est-il un elfe ?"
        },
        {
          "id": "nain",
          "nom": "Nain",
          "type": "bool",
          "categorie": "Peuple",
          "icone": "⛏️",
          "question": "Ton personnage est-il un nain ?"
        },
        {
          "id": "humain",
          "nom": "Humain",
          "type": "bool",
          "categorie": "Peuple",
          "icone": "🧑",
          "question": "Ton personnage est-il humain ?"
        },
        {
          "id": "maia",
          "nom": "Maia",
          "type": "bool",
          "categorie": "Peuple",
          "icone": "🌟",
          "question": "Ton personnage est-il un Maia ?"
        },
        {
          "id": "communaute",
          "nom": "Communauté de l'Anneau",
          "type": "bool",
          "categorie": "Allégeance",
          "icone": "🤝",
          "question": "Ton personnage fait-il partie de la Communauté de l'Anneau ?"
        },
        {
          "id": "archer",
          "nom": "Archer",
          "type": "bool",
          "categorie": "Capacités",
          "icone": "🏹",
          "question": "Ton personnage est-il un archer ?"
        },
        {
          "id": "magie",
          "nom": "Magie",
          "type": "bool",
          "categorie": "Capacités",
          "icone": "✨",
          "question": "Ton personnage pratique-t-il la magie ?"
        },
        {
          "id": "royaute",
          "nom": "Royauté",
          "type": "bool",
          "categorie": "Statut",
          "icone": "👑",
          "question": "Ton personnage est-il de sang royal ou noble ?"
        },
        {
          "id": "porteur_anneau",
          "nom": "Porteur de l'Anneau",
          "type": "bool",
          "categorie": "Histoire",
          "icone": "💍",
          "question": "Ton personnage a-t-il porté l'Anneau unique ?"
        },
        {
          "id": "barbu",
          "nom": "Barbu",
          "type": "bool",
          "categorie": "Apparence",
          "icone": "🧔",
          "question": "Ton personnage porte-t-il la barbe ?"
        },
        {
          "id": "mort",
          "nom": "Mort dans l'histoire",
          "type": "bool",
          "categorie": "Histoire",
          "icone": "🕯️",
          "question": "Ton personnage meurt-il dans l'histoire ?"
        },
        {
          "id": "cheveux_blonds",
          "nom": "Cheveux blonds",
          "type": "bool",
          "categorie": "Apparence",
          "icone": "🌾",
          "question": "Ton personnage a-t-il les cheveux blonds ou blancs ?"
        },
        {
          "id": "vieux",
          "nom": "Ancien",
          "type": "bool",
          "categorie": "Âge",
          "icone": "⏳",
          "question": "Ton personnage est-il très âgé ?"
        }
      ],
      "personnages": [
        {
          "id": "frodon",
          "nom": "Frodon Sacquet",
          "emoji": "💍",
          "attributs": {
            "hobbit": true,
            "elfe": false,
            "nain": false,
            "humain": false,
            "maia": false,
            "communaute": true,
            "archer": false,
            "magie": false,
            "royaute": false,
            "porteur_anneau": true,
            "barbu": false,
            "mort": false,
            "cheveux_blonds": false,
            "vieux": false
          }
        },
        {
          "id": "sam",
          "nom": "Sam Gamegie",
          "emoji": "🥔",
          "attributs": {
            "hobbit": true,
            "elfe": false,
            "nain": false,
            "humain": false,
            "maia": false,
            "communaute": true,
            "archer": false,
            "magie": false,
            "royaute": false,
            "porteur_anneau": true,
            "barbu": false,
            "mort": false,
            "cheveux_blonds": false,
            "vieux": false
          }
        },
        {
          "id": "merry",
          "nom": "Merry Brandebouc",
          "emoji": "🍺",
          "attributs": {
            "hobbit": true,
            "elfe": false,
            "nain": false,
            "humain": false,
            "maia": false,
            "communaute": true,
            "archer": false,
            "magie": false,
            "royaute": false,
            "porteur_anneau": false,
            "barbu": false,
            "mort": false,
            "cheveux_blonds": false,
            "vieux": false
          }
        },
        {
          "id": "pippin",
          "nom": "Pippin Touque",
          "emoji": "🌿",
          "attributs": {
            "hobbit": true,
            "elfe": false,
            "nain": false,
            "humain": false,
            "maia": false,
            "communaute": true,
            "archer": false,
            "magie": false,
            "royaute": false,
            "porteur_anneau": false,
            "barbu": false,
            "mort": false,
            "cheveux_blonds": false,
            "vieux": false
          }
        },
        {
          "id": "gandalf",
          "nom": "Gandalf",
          "emoji": "🧙",
          "attributs": {
            "hobbit": false,
            "elfe": false,
            "nain": false,
            "humain": false,
            "maia": true,
            "communaute": true,
            "archer": false,
            "magie": true,
            "royaute": false,
            "porteur_anneau": false,
            "barbu": true,
            "mort": true,
            "cheveux_blonds": true,
            "vieux": true
          }
        },
        {
          "id": "aragorn",
          "nom": "Aragorn",
          "emoji": "👑",
          "attributs": {
            "hobbit": false,
            "elfe": false,
            "nain": false,
            "humain": true,
            "maia": false,
            "communaute": true,
            "archer": true,
            "magie": false,
            "royaute": true,
            "porteur_anneau": false,
            "barbu": true,
            "mort": false,
            "cheveux_blonds": false,
            "vieux": false
          }
        },
        {
          "id": "legolas",
          "nom": "Legolas",
          "emoji": "🏹",
          "attributs": {
            "hobbit": false,
            "elfe": true,
            "nain": false,
            "humain": false,
            "maia": false,
            "communaute": true,
            "archer": true,
            "magie": false,
            "royaute": true,
            "porteur_anneau": false,
            "barbu": false,
            "mort": false,
            "cheveux_blonds": true,
            "vieux": true
          }
        },
        {
          "id": "gimli",
          "nom": "Gimli",
          "emoji": "⛏️",
          "attributs": {
            "hobbit": false,
            "elfe": false,
            "nain": true,
            "humain": false,
            "maia": false,
            "communaute": true,
            "archer": false,
            "magie": false,
            "royaute": false,
            "porteur_anneau": false,
            "barbu": true,
            "mort": false,
            "cheveux_blonds": false,
            "vieux": true
          }
        },
        {
          "id": "boromir",
          "nom": "Boromir",
          "emoji": "🛡️",
          "attributs": {
            "hobbit": false,
            "elfe": false,
            "nain": false,
            "humain": true,
            "maia": false,
            "communaute": true,
            "archer": false,
            "magie": false,
            "royaute": false,
            "porteur_anneau": false,
            "barbu": false,
            "mort": true,
            "cheveux_blonds": false,
            "vieux": false
          }
        },
        {
          "id": "galadriel",
          "nom": "Galadriel",
          "emoji": "🌟",
          "attributs": {
            "hobbit": false,
            "elfe": true,
            "nain": false,
            "humain": false,
            "maia": false,
            "communaute": false,
            "archer": false,
            "magie": true,
            "royaute": true,
            "porteur_anneau": false,
            "barbu": false,
            "mort": false,
            "cheveux_blonds": true,
            "vieux": true
          }
        },
        {
          "id": "elrond",
          "nom": "Elrond",
          "emoji": "💎",
          "attributs": {
            "hobbit": false,
            "elfe": true,
            "nain": false,
            "humain": false,
            "maia": false,
            "communaute": false,
            "archer": false,
            "magie": true,
            "royaute": true,
            "porteur_anneau": false,
            "barbu": false,
            "mort": false,
            "cheveux_blonds": false,
            "vieux": true
          }
        },
        {
          "id": "arwen",
          "nom": "Arwen",
          "emoji": "💫",
          "attributs": {
            "hobbit": false,
            "elfe": true,
            "nain": false,
            "humain": false,
            "maia": false,
            "communaute": false,
            "archer": false,
            "magie": false,
            "royaute": true,
            "porteur_anneau": false,
            "barbu": false,
            "mort": false,
            "cheveux_blonds": false,
            "vieux": true
          }
        },
        {
          "id": "saroumane",
          "nom": "Saroumane",
          "emoji": "🔮",
          "attributs": {
            "hobbit": false,
            "elfe": false,
            "nain": false,
            "humain": false,
            "maia": true,
            "communaute": false,
            "archer": false,
            "magie": true,
            "royaute": false,
            "porteur_anneau": false,
            "barbu": true,
            "mort": true,
            "cheveux_blonds": true,
            "vieux": true
          }
        },
        {
          "id": "sauron",
          "nom": "Sauron",
          "emoji": "👁️",
          "attributs": {
            "hobbit": false,
            "elfe": false,
            "nain": false,
            "humain": false,
            "maia": true,
            "communaute": false,
            "archer": false,
            "magie": true,
            "royaute": true,
            "porteur_anneau": true,
            "barbu": false,
            "mort": true,
            "cheveux_blonds": false,
            "vieux": true
          }
        },
        {
          "id": "gollum",
          "nom": "Gollum",
          "emoji": "🫥",
          "attributs": {
            "hobbit": true,
            "elfe": false,
            "nain": false,
            "humain": false,
            "maia": false,
            "communaute": false,
            "archer": false,
            "magie": false,
            "royaute": false,
            "porteur_anneau": true,
            "barbu": false,
            "mort": true,
            "cheveux_blonds": false,
            "vieux": true
          }
        },
        {
          "id": "bilbo",
          "nom": "Bilbo Sacquet",
          "emoji": "🍃",
          "attributs": {
            "hobbit": true,
            "elfe": false,
            "nain": false,
            "humain": false,
            "maia": false,
            "communaute": false,
            "archer": false,
            "magie": false,
            "royaute": false,
            "porteur_anneau": true,
            "barbu": false,
            "mort": false,
            "cheveux_blonds": false,
            "vieux": true
          }
        },
        {
          "id": "thorin",
          "nom": "Thorin Écu-de-Chêne",
          "emoji": "⚒️",
          "attributs": {
            "hobbit": false,
            "elfe": false,
            "nain": true,
            "humain": false,
            "maia": false,
            "communaute": false,
            "archer": false,
            "magie": false,
            "royaute": true,
            "porteur_anneau": false,
            "barbu": true,
            "mort": true,
            "cheveux_blonds": false,
            "vieux": true
          }
        },
        {
          "id": "tauriel",
          "nom": "Tauriel",
          "emoji": "🏹",
          "attributs": {
            "hobbit": false,
            "elfe": true,
            "nain": false,
            "humain": false,
            "maia": false,
            "communaute": false,
            "archer": true,
            "magie": false,
            "royaute": false,
            "porteur_anneau": false,
            "barbu": false,
            "mort": false,
            "cheveux_blonds": false,
            "vieux": true
          }
        },
        {
          "id": "eowyn",
          "nom": "Éowyn",
          "emoji": "🐎",
          "attributs": {
            "hobbit": false,
            "elfe": false,
            "nain": false,
            "humain": true,
            "maia": false,
            "communaute": false,
            "archer": false,
            "magie": false,
            "royaute": true,
            "porteur_anneau": false,
            "barbu": false,
            "mort": false,
            "cheveux_blonds": true,
            "vieux": false
          }
        },
        {
          "id": "eomer",
          "nom": "Éomer",
          "emoji": "🏇",
          "attributs": {
            "hobbit": false,
            "elfe": false,
            "nain": false,
            "humain": true,
            "maia": false,
            "communaute": false,
            "archer": false,
            "magie": false,
            "royaute": true,
            "porteur_anneau": false,
            "barbu": false,
            "mort": false,
            "cheveux_blonds": true,
            "vieux": false
          }
        },
        {
          "id": "faramir",
          "nom": "Faramir",
          "emoji": "🏹",
          "attributs": {
            "hobbit": false,
            "elfe": false,
            "nain": false,
            "humain": true,
            "maia": false,
            "communaute": false,
            "archer": true,
            "magie": false,
            "royaute": false,
            "porteur_anneau": false,
            "barbu": false,
            "mort": false,
            "cheveux_blonds": false,
            "vieux": false
          }
        },
        {
          "id": "denethor",
          "nom": "Denethor",
          "emoji": "🔥",
          "attributs": {
            "hobbit": false,
            "elfe": false,
            "nain": false,
            "humain": true,
            "maia": false,
            "communaute": false,
            "archer": false,
            "magie": false,
            "royaute": false,
            "porteur_anneau": false,
            "barbu": true,
            "mort": true,
            "cheveux_blonds": false,
            "vieux": true
          }
        },
        {
          "id": "grima",
          "nom": "Grima Langue-de-Serpent",
          "emoji": "🐍",
          "attributs": {
            "hobbit": false,
            "elfe": false,
            "nain": false,
            "humain": true,
            "maia": false,
            "communaute": false,
            "archer": false,
            "magie": false,
            "royaute": false,
            "porteur_anneau": false,
            "barbu": false,
            "mort": true,
            "cheveux_blonds": false,
            "vieux": false
          }
        },
        {
          "id": "tom-bombadil",
          "nom": "Tom Bombadil",
          "emoji": "🎩",
          "attributs": {
            "hobbit": false,
            "elfe": false,
            "nain": false,
            "humain": false,
            "maia": false,
            "communaute": false,
            "archer": false,
            "magie": true,
            "royaute": false,
            "porteur_anneau": false,
            "barbu": true,
            "mort": false,
            "cheveux_blonds": false,
            "vieux": true
          }
        }
      ]
    }
  ]
};
