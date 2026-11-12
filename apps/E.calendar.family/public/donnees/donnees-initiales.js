/* Données initiales — eCalendar Famille (edukisto)
   Repas repris de Keskonmange Lulu, fériés belges réels, structure compatible avec l'import JSON de CaldemandCo. */

const FERIES_BE = {
  2026: [
    ["2026-01-01", "Nouvel An"], ["2026-04-06", "Lundi de Pâques"],
    ["2026-05-01", "Fête du Travail"], ["2026-05-14", "Ascension"],
    ["2026-05-25", "Lundi de Pentecôte"], ["2026-07-21", "Fête Nationale"],
    ["2026-08-15", "Assomption"], ["2026-11-01", "Toussaint"],
    ["2026-11-11", "Armistice"], ["2026-12-25", "Noël"]
  ],
  2027: [
    ["2027-01-01", "Nouvel An"], ["2027-03-29", "Lundi de Pâques"],
    ["2027-05-01", "Fête du Travail"], ["2027-05-06", "Ascension"],
    ["2027-05-17", "Lundi de Pentecôte"], ["2027-07-21", "Fête Nationale"],
    ["2027-08-15", "Assomption"], ["2027-11-01", "Toussaint"],
    ["2027-11-11", "Armistice"], ["2027-12-25", "Noël"]
  ]
};

const VACANCES_SCOLAIRES_BE = [
  ["2026-02-16", "2026-03-01", "Vacances de Carnaval"],
  ["2026-04-06", "2026-04-19", "Vacances de Pâques"],
  ["2026-07-01", "2026-08-31", "Grandes Vacances"],
  ["2026-10-26", "2026-11-08", "Vacances de Toussaint"],
  ["2026-12-21", "2027-01-03", "Vacances de Noël"]
];

/* Plats — repris de Keskonmange Lulu (repas.edukisto.win) */
const PLATS_INITIAUX = [
  ["Chili sin carne avec haricots rouges et maïs", "Végétarien"],
  ["Pâtes complètes aux légumes et fromage", "Végétarien"],
  ["Omelette aux légumes (quiche)", "Végétarien"],
  ["Wok de légumes et nouilles", "Végétarien"],
  ["Gratin de légumes et fromage", "Végétarien"],
  ["Pizza végétale maison", "Végétarien"],
  ["Poêlée de pommes de terre, œufs et légumes", "Végétarien"],
  ["Poulet grillé, frites et compote (ou haricots sauce tomate)", "Poulet"],
  ["Salade César légère au poulet", "Poulet"],
  ["Wrap au poulet, crudités et sauce", "Poulet"],
  ["Poulet curry léger avec riz basmati et courgettes", "Poulet"],
  ["Wok de poulet aux légumes et nouilles (ou riz)", "Poulet"],
  ["Fajitas de poulet avec poivrons et tortillas complètes", "Poulet"],
  ["Poulet à la tomate avec pâtes", "Poulet"],
  ["Brochettes de poulet et légumes", "Poulet"],
  ["Soupe de légumes avec morceaux de poulet", "Poulet"],
  ["Omelette au poulet, légumes", "Poulet"],
  ["Steak grillé, frites et haricots blancs sauce tomate", "Viande Rouge"],
  ["Bœuf sauté avec légumes et riz complet", "Viande Rouge"],
  ["Chili maison avec bœuf maigre et pain", "Viande Rouge"],
  ["Boulettes de bœuf maison, sauce tomate et autres légumes", "Viande Rouge"],
  ["Steak haché 5% MG et légumes", "Viande Rouge"],
  ["Fajitas de bœuf avec poivrons et tortillas complètes", "Viande Rouge"],
  ["Poivrons (ou tomates) farcis au bœuf maigre et riz", "Viande Rouge"],
  ["Brochettes de bœuf et légumes", "Viande Rouge"],
  ["Bœuf mijoté avec carottes et pommes de terre", "Viande Rouge"],
  ["Burger maison avec steak maigre, pain complet et salade", "Viande Rouge"],
  ["Dos de cabillaud, riz basmati et épinards", "Poisson"],
  ["Pavé de saumon rôti au four et purée de patates douces", "Poisson"],
  ["Filets de colin en papillote avec légumes du soleil", "Poisson"],
  ["Steak de thon grillé et poêlée de courgettes", "Poisson"],
  ["Brandade de morue légère et salade verte", "Poisson"],
  ["Sardines grillées, citron et pommes de terre nature", "Poisson"],
  ["Spaghettis aux crevettes et ail", "Crustacés"],
  ["Poêlée de gambas, poivrons et riz basmati", "Crustacés"],
  ["Salade d'avocat, pamplemousse et crevettes", "Crustacés"],
  ["Risotto crémeux aux fruits de mer", "Crustacés"],
  ["Filet mignon de porc, légumes rôtis et pommes de terre", "Porc"],
  ["Wok de porc aux légumes et nouilles complètes", "Porc"],
  ["Porc au curry léger avec riz basmati", "Porc"],
  ["Brochettes de porc et légumes", "Porc"],
  ["Porc à la tomate avec pâtes complètes", "Porc"],
  ["Porc mariné au citron et herbes avec pâtes grecques", "Porc"],
  ["Rôti de porc avec carottes, poireaux et pommes de terre", "Porc"],
  ["Wrap complet au porc, crudités et sauce", "Porc"],
  ["Porc façon asiatique avec tomate, poivrons et riz", "Porc"],
  ["Pâtes bolognaise", "Pâtes"],
  ["Pâtes carbonara", "Pâtes"],
  ["Pâtes au pesto", "Pâtes"],
  ["Pâtes aux légumes grillés", "Pâtes"],
  ["Pâtes jambon-fromage", "Pâtes"],
  ["Pâtes sauce tomate et mozzarella", "Pâtes"],
  ["Pâtes au poulet, légumes et crème légère", "Pâtes"],
  ["Pâtes façon chili avec bœuf haché et haricots rouges", "Pâtes"],
  ["Pâtes à la ricotta et aux épinards", "Pâtes"],
  ["Pâtes aux boulettes de viande et sauce tomate", "Pâtes"],
  ["Pâtes au poulet curry", "Pâtes"],
  ["Pâtes aux légumes provençaux", "Pâtes"],
  ["Gratin de pâtes au jambon et légumes", "Pâtes"],
  ["Pizza", "Crasses"],
  ["Hamburger + frites", "Crasses"],
  ["Hot-dogs", "Crasses"],
  ["Croque-monsieur", "Crasses"],
  ["Nuggets de poulet + potatoes", "Crasses"],
  ["Tacos", "Crasses"],
  ["Kebab", "Crasses"],
  ["Lasagnes", "Crasses"],
  ["Cordons bleus (poulet croquant) + frites", "Crasses"],
  ["Raviolis améliorés", "Crasses"],
  ["Chinois", "Crasses"],
  ["Pittas", "Crasses"],
  ["Friterie", "À commander"],
  ["Kebab", "À commander"],
  ["Tacos", "À commander"],
  ["Pad thaï", "À commander"],
  ["Chinois", "À commander"],
  ["Indien", "À commander"],
  ["Libanais", "À commander"],
  ["Quick", "À commander"],
  ["McDonald's", "À commander"],
  ["Burger King", "À commander"]
].map(([nom, categorie]) => ({
  id: "p" + Math.random().toString(36).slice(2, 9),
  nom, categorie
}));

const CATEGORIES_PLATS = [
  "Végétarien", "Poulet", "Viande Rouge", "Poisson", "Crustacés",
  "Porc", "Pâtes", "Crasses", "À commander", "Propositions Perso"
];

/* Types d'événements familiaux (codes couleurs edukisto) */
const TYPES_EVENEMENTS = [
  { id: "rdv", label: "Rendez-vous", couleur: "#0e7490", emoji: "🩺" },
  { id: "ecole", label: "École / Garderie", couleur: "#2ecc71", emoji: "🏫" },
  { id: "sport", label: "Sport / Activité", couleur: "#38bdf8", emoji: "⚽" },
  { id: "travail", label: "Travail", couleur: "#b085f5", emoji: "💼" },
  { id: "famille", label: "Famille / Sortie", couleur: "#f59e0b", emoji: "👨‍👩‍👧‍👦" },
  { id: "perso", label: "Personnel", couleur: "#ef5b7c", emoji: "⭐" }
];

const ETIQUETTES_TACHES = ["Maison", "Enfants", "Courses", "Admin", "Jardin", "Autre"];
const POINTS_PAR_TACHE = { facile: 5, moyen: 10, difficile: 20 };
