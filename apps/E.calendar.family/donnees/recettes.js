/* ===== Recettes : ingrédients par personne pour chaque plat =====
   Format : { "nom du plat": [["ingrédient", quantité par personne, "unité"], ...] }
   Les plats « À commander » n'ont pas d'ingrédients (repas livré). */

const INGREDIENTS_PLATS = {
  /* ===== Végétarien ===== */
  "Chili sin carne avec haricots rouges et maïs": [
    ["haricots rouges (boîte)", 0.5, "boîte"], ["maïs (boîte)", 0.25, "boîte"],
    ["tomates concassées (boîte)", 0.5, "boîte"], ["oignon", 0.5, "pièce"],
    ["poivron rouge", 0.5, "pièce"], ["riz", 80, "g"],
    ["épices chili", 1, "pincée"], ["bouillon de légumes", 0.25, "cube"]
  ],
  "Pâtes complètes aux légumes et fromage": [
    ["pâtes complètes", 100, "g"], ["courgette", 0.5, "pièce"], ["carotte", 1, "pièce"],
    ["oignon", 0.5, "pièce"], ["fromage râpé", 30, "g"], ["huile d'olive", 1, "c. à s."]
  ],
  "Omelette aux légumes (quiche)": [
    ["œufs", 2, "pièce"], ["pâte brisée", 0.25, "pâte"], ["crème fraîche légère", 2, "c. à s."],
    ["courgette", 0.5, "pièce"], ["oignon", 0.5, "pièce"], ["fromage râpé", 20, "g"]
  ],
  "Wok de légumes et nouilles": [
    ["nouilles chinoises", 90, "g"], ["brocoli", 0.25, "pièce"], ["carotte", 1, "pièce"],
    ["poivron", 0.5, "pièce"], ["sauce soja", 1.5, "c. à s."], ["huile de sésame", 1, "c. à c."]
  ],
  "Gratin de légumes et fromage": [
    ["pommes de terre", 250, "g"], ["courgette", 0.5, "pièce"], ["crème légère", 3, "c. à s."],
    ["fromage râpé", 40, "g"], ["noix de muscade", 1, "pincée"], ["lait", 5, "c. à s."]
  ],
  "Pizza végétale maison": [
    ["pâte à pizza", 0.5, "pâte"], ["tomates concassées", 3, "c. à s."], ["mozzarella", 50, "g"],
    ["champignons", 50, "g"], ["poivron", 0.5, "pièce"], ["olives", 8, "pièce"], ["origan", 1, "pincée"]
  ],
  "Poêlée de pommes de terre, œufs et légumes": [
    ["pommes de terre", 250, "g"], ["œufs", 2, "pièce"], ["oignon", 0.5, "pièce"],
    ["lardons fumés ou tofu", 40, "g"], ["haricots verts", 80, "g"], ["huile d'olive", 1, "c. à s."]
  ],

  /* ===== Poulet ===== */
  "Poulet grillé, frites et compote (ou haricots sauce tomate)": [
    ["pilons de poulet", 2, "pièce"], ["pommes de terre à frites", 250, "g"],
    ["compote (pot)", 0.25, "pot"], ["haricots blancs (boîte)", 0.5, "boîte"],
    ["tomates concassées", 3, "c. à s."], ["épices grill", 1, "pincée"]
  ],
  "Salade César légère au poulet": [
    ["blanc de poulet", 130, "g"], ["laitue romaine", 0.5, "pièce"], ["croûtons", 30, "g"],
    ["parmesan", 15, "g"], ["yaourt grec", 2, "c. à s."], ["moutarde", 1, "c. à c."],
    ["citron", 0.25, "pièce"]
  ],
  "Wrap au poulet, crudités et sauce": [
    ["tortilla complète", 1.5, "pièce"], ["blanc de poulet", 120, "g"], ["carotte", 0.5, "pièce"],
    ["concombre", 0.25, "pièce"], ["tomate", 0.5, "pièce"], ["yaourt", 2, "c. à s."], ["menthe", 1, "pincée"]
  ],
  "Poulet curry léger avec riz basmati et courgettes": [
    ["blanc de poulet", 140, "g"], ["riz basmati", 80, "g"], ["courgette", 0.5, "pièce"],
    ["lait de coco léger", 5, "c. à s."], ["curry en poudre", 1, "c. à c."], ["oignon", 0.5, "pièce"]
  ],
  "Wok de poulet aux légumes et nouilles (ou riz)": [
    ["blanc de poulet", 130, "g"], ["nouilles chinoises", 80, "g"], ["brocoli", 0.25, "pièce"],
    ["poivron", 0.5, "pièce"], ["champignons", 50, "g"], ["sauce soja", 2, "c. à s."]
  ],
  "Fajitas de poulet avec poivrons et tortillas complètes": [
    ["blanc de poulet", 130, "g"], ["tortillas complètes", 2, "pièce"], ["poivron", 0.5, "pièce"],
    ["oignon rouge", 0.5, "pièce"], ["épices fajitas", 1, "sachet"], ["yaourt", 2, "c. à s."]
  ],
  "Poulet à la tomate avec pâtes": [
    ["blanc de poulet", 120, "g"], ["pâtes", 100, "g"], ["tomates concassées (boîte)", 0.5, "boîte"],
    ["oignon", 0.5, "pièce"], ["basilic", 1, "pincée"], ["parmesan", 15, "g"]
  ],
  "Brochettes de poulet et légumes": [
    ["blanc de poulet", 140, "g"], ["poivron", 0.5, "pièce"], ["courgette", 0.5, "pièce"],
    ["oignon rouge", 0.5, "pièce"], ["huile d'olive", 1, "c. à s."], ["herbes de Provence", 1, "pincée"],
    ["riz", 70, "g"]
  ],
  "Soupe de légumes avec morceaux de poulet": [
    ["blanc de poulet", 100, "g"], ["carotte", 1, "pièce"], ["poireau", 0.5, "pièce"],
    ["pommes de terre", 100, "g"], ["céleri", 0.5, "branche"], ["bouillon de volaille", 0.5, "cube"]
  ],
  "Omelette au poulet, légumes": [
    ["œufs", 2.5, "pièce"], ["blanc de poulet", 80, "g"], ["petits pois", 50, "g"],
    ["oignon", 0.5, "pièce"], ["fromage râpé", 15, "g"]
  ],

  /* ===== Viande Rouge ===== */
  "Steak grillé, frites et haricots blancs sauce tomate": [
    ["steak de bœuf", 1, "pièce"], ["pommes de terre à frites", 250, "g"],
    ["haricots blancs (boîte)", 0.5, "boîte"], ["tomates concassées", 3, "c. à s."], ["poivre/sel", 1, "pincée"]
  ],
  "Bœuf sauté avec légumes et riz complet": [
    ["bœuf à stir-fry", 120, "g"], ["riz complet", 80, "g"], ["brocoli", 0.25, "pièce"],
    ["carotte", 1, "pièce"], ["sauce soja", 2, "c. à s."], ["gingembre", 1, "c. à c."], ["oignon", 0.5, "pièce"]
  ],
  "Chili maison avec bœuf maigre et pain": [
    ["bœuf haché maigre", 120, "g"], ["haricots rouges (boîte)", 0.4, "boîte"],
    ["tomates concassées (boîte)", 0.5, "boîte"], ["oignon", 0.5, "pièce"],
    ["pain complet", 1.5, "tranche"], ["épices chili", 1, "pincée"]
  ],
  "Boulettes de bœuf maison, sauce tomate et autres légumes": [
    ["bœuf haché maigre", 120, "g"], ["œuf", 0.5, "pièce"], ["chapelure", 2, "c. à s."],
    ["tomates concassées (boîte)", 0.5, "boîte"], ["courgette", 0.5, "pièce"], ["oignon", 0.5, "pièce"]
  ],
  "Steak haché 5% MG et légumes": [
    ["steak haché 5%", 1.5, "pièce"], ["haricots verts", 100, "g"], ["carotte", 1, "pièce"],
    ["tomate", 0.5, "pièce"], ["huile d'olive", 1, "c. à s."]
  ],
  "Fajitas de bœuf avec poivrons et tortillas complètes": [
    ["bœuf à stir-fry", 120, "g"], ["tortillas complètes", 2, "pièce"], ["poivron", 0.5, "pièce"],
    ["oignon rouge", 0.5, "pièce"], ["épices fajitas", 1, "sachet"], ["yaourt", 2, "c. à s."]
  ],
  "Poivrons (ou tomates) farcis au bœuf maigre et riz": [
    ["poivron", 1, "pièce"], ["bœuf haché maigre", 100, "g"], ["riz", 50, "g"],
    ["tomates concassées", 3, "c. à s."], ["oignon", 0.5, "pièce"], ["parmesan", 10, "g"]
  ],
  "Brochettes de bœuf et légumes": [
    ["bœuf à brochette", 130, "g"], ["poivron", 0.5, "pièce"], ["champignons", 50, "g"],
    ["oignon rouge", 0.5, "pièce"], ["huile d'olive", 1, "c. à s."], ["riz", 70, "g"]
  ],
  "Bœuf mijoté avec carottes et pommes de terre": [
    ["bœuf à braiser", 140, "g"], ["carotte", 1.5, "pièce"], ["pommes de terre", 200, "g"],
    ["oignon", 0.5, "pièce"], ["bouillon de bœuf", 0.5, "cube"], ["laurier", 1, "feuille"]
  ],
  "Burger maison avec steak maigre, pain complet et salade": [
    ["steak haché maigre", 1, "pièce"], ["pain à burger complet", 1, "pièce"],
    ["laitue", 2, "feuille"], ["tomate", 0.5, "pièce"], ["cornichons", 2, "pièce"],
    ["fromage à burger", 1, "tranche"], ["pommes de terre à frites", 150, "g"]
  ],

  /* ===== Poisson ===== */
  "Dos de cabillaud, riz basmati et épinards": [
    ["dos de cabillaud", 1, "pièce"], ["riz basmati", 80, "g"],
    ["épinards frais ou surgelés", 120, "g"], ["citron", 0.5, "pièce"], ["beurre", 1, "c. à c."],
    ["lait", 4, "c. à s."]
  ],
  "Pavé de saumon rôti au four et purée de patates douces": [
    ["pavé de saumon", 1, "pièce"], ["patates douces", 200, "g"],
    ["crème légère", 2, "c. à s."], ["citron", 0.5, "pièce"], ["aneth", 1, "pincée"]
  ],
  "Filets de colin en papillote avec légumes du soleil": [
    ["filet de colin", 1.5, "pièce"], ["courgette", 0.5, "pièce"], ["tomate", 0.5, "pièce"],
    ["oignon", 0.5, "pièce"], ["huile d'olive", 1, "c. à s."], ["herbes de Provence", 1, "pincée"]
  ],
  "Steak de thon grillé et poêlée de courgettes": [
    ["steak de thon", 1, "pièce"], ["courgette", 1, "pièce"], ["ail", 1, "gousse"],
    ["huile d'olive", 1, "c. à s."], ["citron", 0.5, "pièce"], ["riz", 60, "g"]
  ],
  "Brandade de morue lègère et salade verte": [
    ["morue (filet)", 130, "g"], ["pommes de terre", 150, "g"], ["lait", 5, "c. à s."],
    ["ail", 1, "gousse"], ["huile d'olive", 1, "c. à s."], ["laitue", 0.5, "pièce"]
  ],
  "Sardines grillées, citron et pommes de terre nature": [
    ["sardines fraîches", 4, "pièce"], ["pommes de terre", 200, "g"],
    ["citron", 0.5, "pièce"], ["persil", 1, "pincée"], ["huile d'olive", 1, "c. à s."]
  ],

  /* ===== Crustacés ===== */
  "Spaghettis aux crevettes et ail": [
    ["spaghettis", 100, "g"], ["crevettes", 100, "g"], ["ail", 2, "gousse"],
    ["huile d'olive", 1.5, "c. à s."], ["persil", 1, "pincée"], ["piment", 1, "pincée"]
  ],
  "Poêlée de gambas, poivrons et riz basmati": [
    ["gambas", 8, "pièce"], ["riz basmati", 80, "g"], ["poivron", 0.5, "pièce"],
    ["ail", 2, "gousse"], ["tomates cerises", 5, "pièce"], ["coriandre", 1, "pincée"]
  ],
  "Salade d'avocat, pamplemousse et crevettes": [
    ["avocat", 0.5, "pièce"], ["pamplemousse", 0.5, "pièce"], ["crevettes", 80, "g"],
    ["laitue", 0.25, "pièce"], ["mayonnaise légère", 1, "c. à s."], ["citron", 0.25, "pièce"]
  ],
  "Risotto crémeux aux fruits de mer": [
    ["riz arborio", 90, "g"], ["fruits de mer (mélange)", 100, "g"],
    ["bouillon de poisson", 0.5, "cube"], ["oignon", 0.5, "pièce"],
    ["parmesan", 20, "g"], ["vin blanc", 2, "c. à s."], ["petits pois", 30, "g"]
  ],

  /* ===== Porc ===== */
  "Filet mignon de porc, légumes rôtis et pommes de terre": [
    ["filet mignon de porc", 130, "g"], ["pommes de terre", 180, "g"],
    ["carotte", 1, "pièce"], ["oignon", 0.5, "pièce"], ["huile d'olive", 1, "c. à s."],
    ["romarin", 1, "pincée"]
  ],
  "Wok de porc aux légumes et nouilles complètes": [
    ["filet de porc", 130, "g"], ["nouilles complètes", 80, "g"], ["brocoli", 0.25, "pièce"],
    ["poivron", 0.5, "pièce"], ["sauce soja", 2, "c. à s."], ["gingembre", 1, "c. à c."]
  ],
  "Porc au curry léger avec riz basmati": [
    ["filet de porc", 130, "g"], ["riz basmati", 80, "g"], ["oignon", 0.5, "pièce"],
    ["lait de coco léger", 5, "c. à s."], ["curry en poudre", 1, "c. à c."], ["pomme", 0.25, "pièce"]
  ],
  "Brochettes de porc et légumes": [
    ["filet de porc", 140, "g"], ["poivron", 0.5, "pièce"], ["courgette", 0.5, "pièce"],
    ["oignon rouge", 0.5, "pièce"], ["huile d'olive", 1, "c. à s."], ["riz", 70, "g"]
  ],
  "Porc à la tomate avec pâtes complètes": [
    ["filet de porc", 120, "g"], ["pâtes complètes", 100, "g"],
    ["tomates concassées (boîte)", 0.5, "boîte"], ["oignon", 0.5, "pièce"], ["basilic", 1, "pincée"]
  ],
  "Porc mariné au citron et herbes avec pâtes grecques": [
    ["filet de porc", 130, "g"], ["pâtes (type grecques)", 90, "g"], ["citron", 0.5, "pièce"],
    ["origan", 1, "c. à c."], ["huile d'olive", 1.5, "c. à s."], ["tomate", 0.5, "pièce"],
    ["feta", 30, "g"]
  ],
  "Rôti de porc avec carottes, poireaux et pommes de terre": [
    ["rôti de porc", 140, "g"], ["carotte", 1, "pièce"], ["poireau", 0.5, "pièce"],
    ["pommes de terre", 180, "g"], ["bouillon de volaille", 0.5, "cube"], ["thym", 1, "pincée"]
  ],
  "Wrap complet au porc, crudités et sauce": [
    ["tortilla complète", 1.5, "pièce"], ["filet de porc", 110, "g"], ["carotte", 0.5, "pièce"],
    ["concombre", 0.25, "pièce"], ["tomate", 0.5, "pièce"], ["yaourt", 2, "c. à s."], ["menthe", 1, "pincée"]
  ],
  "Porc façon asiatique avec tomate, poivrons et riz": [
    ["filet de porc", 130, "g"], ["riz", 80, "g"], ["poivron", 0.5, "pièce"],
    ["tomates concassées", 3, "c. à s."], ["sauce soja", 1.5, "c. à s."], ["miel", 1, "c. à c."],
    ["ail", 1, "gousse"]
  ],

  /* ===== Pâtes ===== */
  "Pâtes bolognaise": [
    ["pâtes", 100, "g"], ["bœuf haché maigre", 90, "g"],
    ["tomates concassées (boîte)", 0.5, "boîte"], ["oignon", 0.5, "pièce"],
    ["carotte", 0.5, "pièce"], ["parmesan", 15, "g"], ["basilic", 1, "pincée"]
  ],
  "Pâtes carbonara": [
    ["pâtes", 100, "g"], ["lardons fumés", 50, "g"], ["œufs", 1, "pièce"],
    ["parmesan", 20, "g"], ["poivre", 1, "pincée"], ["crème légère (option)", 1, "c. à s."]
  ],
  "Pâtes au pesto": [
    ["pâtes", 100, "g"], ["pesto (pot)", 0.15, "pot"], ["pignons de pin", 1, "c. à c."],
    ["parmesan", 10, "g"], ["courgette (option)", 0.25, "pièce"]
  ],
  "Pâtes aux légumes grillés": [
    ["pâtes", 100, "g"], ["aubergine", 0.25, "pièce"], ["courgette", 0.5, "pièce"],
    ["poivron", 0.5, "pièce"], ["huile d'olive", 1.5, "c. à s."], ["parmesan", 10, "g"]
  ],
  "Pâtes jambon-fromage": [
    ["pâtes", 100, "g"], ["jambon blanc", 1.5, "tranche"], ["crème légère", 3, "c. à s."],
    ["fromage râpé", 30, "g"], ["muscade", 1, "pincée"]
  ],
  "Pâtes sauce tomate et mozzarella": [
    ["pâtes", 100, "g"], ["tomates concassées (boîte)", 0.5, "boîte"],
    ["mozzarella", 60, "g"], ["ail", 1, "gousse"], ["basilic", 1, "pincée"], ["parmesan", 10, "g"]
  ],
  "Pâtes au poulet, légumes et crème légère": [
    ["pâtes", 100, "g"], ["blanc de poulet", 100, "g"], ["petits pois", 50, "g"],
    ["carotte", 0.5, "pièce"], ["crème légère", 3, "c. à s."], ["parmesan", 10, "g"]
  ],
  "Pâtes façon chili avec bœuf haché et haricots rouges": [
    ["pâtes", 100, "g"], ["bœuf haché maigre", 90, "g"], ["haricots rouges (boîte)", 0.3, "boîte"],
    ["tomates concassées", 4, "c. à s."], ["oignon", 0.5, "pièce"], ["épices chili", 1, "pincée"]
  ],
  "Pâtes à la ricotta et aux épinards": [
    ["pâtes", 100, "g"], ["ricotta", 60, "g"], ["épinards frais", 100, "g"],
    ["ail", 1, "gousse"], ["parmesan", 15, "g"], ["huile d'olive", 1, "c. à s."]
  ],
  "Pâtes aux boulettes de viande et sauce tomate": [
    ["pâtes", 100, "g"], ["boulettes de viande", 6, "pièce"],
    ["tomates concassées (boîte)", 0.5, "boîte"], ["oignon", 0.5, "pièce"], ["parmesan", 15, "g"]
  ],
  "Pâtes au poulet curry": [
    ["pâtes", 100, "g"], ["blanc de poulet", 100, "g"], ["crème légère", 3, "c. à s."],
    ["curry en poudre", 1, "c. à c."], ["oignon", 0.5, "pièce"], ["pomme", 0.25, "pièce"]
  ],
  "Pâtes aux légumes provençaux": [
    ["pâtes", 100, "g"], ["courgette", 0.5, "pièce"], ["aubergine", 0.25, "pièce"],
    ["tomate", 0.5, "pièce"], ["herbes de Provence", 1, "c. à c."], ["huile d'olive", 1, "c. à s."],
    ["parmesan", 10, "g"]
  ],
  "Gratin de pâtes au jambon et légumes": [
    ["pâtes", 100, "g"], ["jambon blanc", 1.5, "tranche"], ["crème légère", 4, "c. à s."],
    ["brocoli", 0.25, "pièce"], ["fromage râpé", 40, "g"], ["lait", 4, "c. à s."]
  ],

  /* ===== Crasses (plats simples, ingrédients achetés) ===== */
  "Pizza": [["pizza (surgelée ou pâte + garniture)", 1, "pièce"]],
  "Hamburger + frites": [
    ["pain à burger", 1, "pièce"], ["steak haché", 1, "pièce"], ["fromage à burger", 1, "tranche"],
    ["frites surgelées", 150, "g"], ["ketchup", 1, "c. à s."]
  ],
  "Hot-dogs": [
    ["pain à hot-dog", 1.5, "pièce"], ["saucisse de francfort", 1.5, "pièce"],
    ["moutarde", 1, "c. à c."], ["oignon frit", 1, "c. à s."]
  ],
  "Croque-monsieur": [
    ["pain de mie complet", 2, "tranche"], ["jambon blanc", 1, "tranche"],
    ["fromage à croque", 2, "tranche"], ["beurre", 1, "c. à c."], ["béchamel (option)", 1, "c. à s."]
  ],
  "Nuggets de poulet + potatoes": [
    ["nuggets de poulet", 8, "pièce"], ["pommes de terre à potatoes", 180, "g"],
    ["sauce barbecue", 1, "c. à s."], ["laitue", 1, "feuille"]
  ],
  "Tacos": [
    ["tortilla tacos", 1, "pièce"], ["viande hachée à tacos", 100, "g"],
    ["épices tacos", 0.5, "sachet"], ["cheddar râpé", 30, "g"], ["salsa", 2, "c. à s."], ["crème fraîche", 1, "c. à s."]
  ],
  "Kebab": [
    ["pain pita", 1, "pièce"], ["kebab (viande)", 130, "g"], ["laitue", 1, "feuille"],
    ["tomate", 0.5, "pièce"], ["oignon rouge", 0.25, "pièce"], ["sauce blanche", 2, "c. à s."]
  ],
  "Lasagnes": [
    ["plaques à lasagnes", 4, "pièce"], ["bœuf haché", 100, "g"],
    ["tomates concassées (boîte)", 0.5, "boîte"], ["béchamel", 4, "c. à s."],
    ["mozzarella", 50, "g"], ["parmesan", 15, "g"]
  ],
  "Cordons bleus (poulet croquant) + frites": [
    ["cordons bleus", 1.5, "pièce"], ["pommes de terre à frites", 200, "g"],
    ["haricots verts", 80, "g"]
  ],
  "Raviolis améliorés": [
    ["raviolis (boîte/surgelés)", 0.5, "paquet"], ["tomates concassées", 3, "c. à s."],
    ["fromage râpé", 20, "g"], ["basilic", 1, "pincée"], ["crème (option)", 1, "c. à s."]
  ],
  "Chinois": [["chinois (boulangerie ou surgelé)", 1, "pièce"]],
  "Pittas": [
    ["pain pita", 1.5, "pièce"], ["falafel ou poulet", 4, "pièce"], ["houmous", 2, "c. à s."],
    ["laitue", 1, "feuille"], ["tomate", 0.5, "pièce"], ["concombre", 0.25, "pièce"]
  ]
};
