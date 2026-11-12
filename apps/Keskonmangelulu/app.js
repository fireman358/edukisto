/* ===== Keskonmange Lulu ? — version web ===== */

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const ORDRE_CATEGORIES = ["Végétarien", "Poulet", "Viande Rouge", "Poisson", "Crustacés", "Porc", "Pâtes", "Crasses", "À commander", "Propositions Perso"];

const LOGO_INLINE = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTQiIGZpbGw9IiNEMzU0MDAiLz48Y2lyY2xlIGN4PSIzMiIgY3k9IjMzIiByPSIxNy41IiBmaWxsPSIjRkZGIi8+PGNpcmNsZSBjeD0iMzIiIGN5PSIzMyIgcj0iMTIiIGZpbGw9IiNGOUY5RjYiLz48ZyBmaWxsPSIjRkZGIj48cmVjdCB4PSIxNC40IiB5PSIyMyIgd2lkdGg9IjEuNCIgaGVpZ2h0PSIxMCIgcng9Ii43Ii8+PHJlY3QgeD0iMTIuMiIgeT0iMjMiIHdpZHRoPSIxLjQiIGhlaWdodD0iNyIgcng9Ii43Ii8+PHJlY3QgeD0iMTYuNiIgeT0iMjMiIHdpZHRoPSIxLjQiIGhlaWdodD0iNyIgcng9Ii43Ii8+PHJlY3QgeD0iMTIuMiIgeT0iMjguNiIgd2lkdGg9IjUuOCIgaGVpZ2h0PSIxNCIgcng9IjIuOSIvPjxyZWN0IHg9IjEzLjUiIHk9IjQxLjUiIHdpZHRoPSIzLjIiIGhlaWdodD0iMi42IiByeD0iMS4zIiB0cmFuc2Zvcm09InJvdGF0ZSgxNCAxNSA0Mi44KSIvPjxyZWN0IHg9IjEzLjUiIHk9IjQzLjgiIHdpZHRoPSIzLjIiIGhlaWdodD0iMi42IiByeD0iMS4zIiB0cmFuc2Zvcm09InJvdGF0ZSgtMTQgMTUgNDUuMSkiLz48cGF0aCBkPSJNNDkgMjNoMS44djcuMmwtLjkgMi0uOS0yeiIvPjxyZWN0IHg9IjQ5IiB5PSIzMS41IiB3aWR0aD0iMS44IiBoZWlnaHQ9IjEyLjUiIHJ4PSIuOSIvPjwvZz48ZyBmaWxsPSIjRDM1NDAwIj48Y2lyY2xlIGN4PSIyNi41IiBjeT0iMzEiIHI9IjEuNiIvPjxjaXJjbGUgY3g9IjMyIiBjeT0iMjcuNSIgcj0iMS42Ii8+PGNpcmNsZSBjeD0iMzcuNSIgY3k9IjMxIiByPSIxLjYiLz48Y2lyY2xlIGN4PSIzMCIgY3k9IjM3IiByPSIxLjYiLz48Y2lyY2xlIGN4PSIzNCIgY3k9IjM3IiByPSIxLjYiLz48L2c+PC9zdmc+";

const DEFAULT_PLATS = [
  // --- REPAS VÉGÉTARIEN ---
  [1, "Chili sin carne avec haricots rouges et maïs", "Végétarien", "pas de limite"],
  [2, "Pâtes complètes aux légumes et fromage", "Végétarien", "pas de limite"],
  [3, "Omelette aux légumes (quiche)", "Végétarien", "pas de limite"],
  [4, "Wok de légumes et nouilles", "Végétarien", "pas de limite"],
  [5, "Gratin de légumes et fromage", "Végétarien", "pas de limite"],
  [6, "Pizza végétale maison", "Végétarien", "pas de limite"],
  [7, "Poêlée de pommes de terre, œufs et légumes", "Végétarien", "pas de limite"],
  // --- REPAS AVEC POULET ---
  [8, "Poulet grillé, frites et compote (ou haricots sauce tomate)", "Poulet", "1 fois max"],
  [9, "Salade César légère au poulet", "Poulet", "1 fois max"],
  [10, "Wrap au poulet, crudités et sauce", "Poulet", "1 fois max"],
  [11, "Poulet curry léger avec riz basmati et courgettes", "Poulet", "1 fois max"],
  [12, "Wok de poulet aux légumes et nouilles (ou riz)", "Poulet", "1 fois max"],
  [13, "Fajitas de poulet avec poivrons et tortillas complètes", "Poulet", "1 fois max"],
  [14, "Poulet à la tomate avec pâtes", "Poulet", "1 fois max"],
  [15, "Brochettes de poulet et légumes", "Poulet", "1 fois max"],
  [16, "Soupe de légumes avec morceaux de poulet", "Poulet", "1 fois max"],
  [17, "Omelette au poulet, légumes", "Poulet", "1 fois max"],
  // --- REPAS AVEC VIANDE ROUGE ---
  [18, "Steak grillé, frites et haricots blancs sauce tomate", "Viande Rouge", "1 fois max"],
  [19, "Bœuf sauté avec légumes et riz complet", "Viande Rouge", "1 fois max"],
  [20, "Chili maison avec bœuf maigre et pain", "Viande Rouge", "1 fois max"],
  [21, "Boulettes de bœuf maison, sauce tomate et autres légumes", "Viande Rouge", "1 fois max"],
  [22, "Steak haché 5% MG et légumes", "Viande Rouge", "1 fois max"],
  [23, "Fajitas de bœuf avec poivrons et tortillas complètes", "Viande Rouge", "1 fois max"],
  [24, "Poivrons (ou tomates) farcis au bœuf maigre et riz", "Viande Rouge", "1 fois max"],
  [25, "Brochettes de bœuf et légumes", "Viande Rouge", "1 fois max"],
  [26, "Bœuf mijoté avec carottes et pommes de terre", "Viande Rouge", "1 fois max"],
  [27, "Burger maison avec steak maigre, pain complet et salade", "Viande Rouge", "1 fois max"],
  // --- REPAS AVEC POISSON ---
  [28, "Dos de cabillaud, riz basmati et épinards", "Poisson", "1 fois max"],
  [29, "Pavé de saumon rôti au four et purée de patates douces", "Poisson", "1 fois max"],
  [30, "Filets de colin en papillote avec légumes du soleil", "Poisson", "1 fois max"],
  [31, "Steak de thon grillé et poêlée de courgettes", "Poisson", "1 fois max"],
  [32, "Brandade de morue légère et salade verte", "Poisson", "1 fois max"],
  [33, "Sardines grillées, citron et pommes de terre nature", "Poisson", "1 fois max"],
  // --- REPAS AVEC CRUSTACÉS ---
  [34, "Spaghettis aux crevettes et ail", "Crustacés", "1 fois max"],
  [35, "Poêlée de gambas, poivrons et riz basmati", "Crustacés", "1 fois max"],
  [36, "Salade d'avocat, pamplemousse et crevettes", "Crustacés", "1 fois max"],
  [37, "Risotto crémeux aux fruits de mer", "Crustacés", "1 fois max"],
  // --- VIANDE DE PORC ---
  [38, "Filet mignon de porc, légumes rôtis et pommes de terre", "Porc", "1 fois max"],
  [39, "Wok de porc aux légumes et nouilles complètes", "Porc", "1 fois max"],
  [40, "Porc au curry léger avec riz basmati", "Porc", "1 fois max"],
  [41, "Brochettes de porc et légumes", "Porc", "1 fois max"],
  [42, "Porc à la tomate avec pâtes complètes", "Porc", "1 fois max"],
  [43, "Porc mariné au citron et herbes avec pâtes grecques", "Porc", "1 fois max"],
  [44, "Rôti de porc avec carottes, poireaux et pommes de terre", "Porc", "1 fois max"],
  [45, "Wrap complet au porc, crudités et sauce", "Porc", "1 fois max"],
  [46, "Porc façon asiatique avec tomate, poivrons et riz", "Porc", "1 fois max"],
  // --- REPAS DE PÂTES ---
  [47, "Pâtes bolognaise", "Pâtes", "1 fois max"],
  [48, "Pâtes carbonara", "Pâtes", "1 fois max"],
  [49, "Pâtes au pesto", "Pâtes", "1 fois max"],
  [50, "Pâtes aux légumes grillés", "Pâtes", "1 fois max"],
  [51, "Pâtes jambon-fromage", "Pâtes", "1 fois max"],
  [52, "Pâtes sauce tomate et mozzarella", "Pâtes", "1 fois max"],
  [53, "Pâtes au poulet, légumes et crème légère", "Pâtes", "1 fois max"],
  [54, "Pâtes façon chili avec bœuf haché et haricots rouges", "Pâtes", "1 fois max"],
  [55, "Pâtes à la ricotta et aux épinards", "Pâtes", "1 fois max"],
  [56, "Pâtes aux boulettes de viande et sauce tomate", "Pâtes", "1 fois max"],
  [57, "Pâtes au poulet curry", "Pâtes", "1 fois max"],
  [58, "Pâtes aux légumes provençaux", "Pâtes", "1 fois max"],
  [59, "Gratin de pâtes au jambon et légumes", "Pâtes", "1 fois max"],
  // --- REPAS CRASSES ---
  [60, "Pizza", "Crasses", "1 fois max"],
  [61, "Hamburger + frites", "Crasses", "1 fois max"],
  [62, "Hot-dogs", "Crasses", "1 fois max"],
  [63, "Croque-monsieur", "Crasses", "1 fois max"],
  [64, "Nuggets de poulet + potatoes", "Crasses", "1 fois max"],
  [65, "Tacos", "Crasses", "1 fois max"],
  [66, "Kebab", "Crasses", "1 fois max"],
  [67, "Lasagnes", "Crasses", "1 fois max"],
  [68, "Cordons bleus (poulet croquant) + frites", "Crasses", "1 fois max"],
  [69, "Raviolis améliorés", "Crasses", "1 fois max"],
  [70, "Chinois", "Crasses", "1 fois max"],
  [71, "Pittas", "Crasses", "1 fois max"],
  // --- REPAS À COMMANDER ---
  [72, "Friterie", "À commander", "seulement si pas de 'crasses'"],
  [73, "Kebab", "À commander", "seulement si pas de 'crasses'"],
  [74, "Tacos", "À commander", "seulement si pas de 'crasses'"],
  [75, "Pad thaï", "À commander", "seulement si pas de 'crasses'"],
  [76, "Chinois", "À commander", "seulement si pas de 'crasses'"],
  [77, "Indien", "À commander", "seulement si pas de 'crasses'"],
  [78, "Libanais", "À commander", "seulement si pas de 'crasses'"],
  [79, "Quick", "À commander", "seulement si pas de 'crasses'"],
  [80, "McDonald's", "À commander", "seulement si pas de 'crasses'"],
  [81, "Burger King", "À commander", "seulement si pas de 'crasses'"]
].map(([id, nom, categorie, limite]) => ({ id, nom, categorie, limite, isSelected: false, jourAttribue: null }));

/* ===== Persistance (remplace DataStore) ===== */

const STORAGE_KEY = "keskonmange_state";   // plats + semaine + portions + mémoire
const INSTALL_KEY = "keskonmange_install_date";
const PREMIUM_KEY = "keskonmange_is_premium";
const SETTINGS_KEY = "keskonmange_settings";
const TRIAL_DAYS = 30;
const DATA_VERSION = 3;

const DEFAULT_IDS = new Set(DEFAULT_PLATS.map(p => p.id));

/* Ancien format (séparateurs "|" et ";;") : on sait encore le lire, on ne l'écrit plus. */
function parseLegacyPlats(savedStr) {
  const out = [];
  for (const item of String(savedStr).split(";;")) {
    const parts = item.split("|");
    if (parts.length < 6) continue;
    const id = parseInt(parts[0], 10);
    if (isNaN(id)) continue;
    out.push({
      id, nom: parts[1], categorie: parts[2], limite: parts[3],
      isSelected: parts[4] === "true",
      jourAttribue: parts[5] || null
    });
  }
  return out;
}

/* Reconstruit la liste : plats par défaut (moins les supprimés, avec les
   personnalisations sauvegardées) + plats perso. Les suppressions tiennent. */
function restaurerPlats(saved) {
  const supprimes = new Set(saved.supprimes || []);
  const overrides = new Map((saved.plats || []).map(p => [p.id, p]));
  const plats = DEFAULT_PLATS
    .filter(p => !supprimes.has(p.id))
    .map(p => ({ ...p, ...(overrides.get(p.id) || {}) }));
  for (const p of saved.plats || []) {
    if (!DEFAULT_IDS.has(p.id)) plats.push({ ...p });
  }
  return plats;
}

function chargerDonnees() {
  const base = {
    plats: DEFAULT_PLATS.map(p => ({ ...p })),
    supprimes: [],
    semaine: lundiISO(),
    portions: {},
    nombrePersonnes: 4,
    historique: []
  };
  let raw = null;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { /* stockage bloqué */ }
  if (!raw) return base;

  try {
    const saved = JSON.parse(raw);
    if (saved && typeof saved === "object" && saved.v >= DATA_VERSION) {
      return {
        plats: restaurerPlats(saved),
        supprimes: saved.supprimes || [],
        semaine: saved.semaine || lundiISO(),
        portions: saved.portions || {},
        nombrePersonnes: saved.nombrePersonnes || 4,
        historique: saved.historique || []
      };
    }
  } catch (e) { /* ancien format texte : on migre plus bas */ }

  const legacy = parseLegacyPlats(raw);
  if (!legacy.length) return base;
  const parId = new Map(legacy.map(p => [p.id, p]));
  const plats = DEFAULT_PLATS.map(p => parId.get(p.id) || { ...p });
  legacy.forEach(p => { if (!DEFAULT_IDS.has(p.id)) plats.push(p); });
  return { ...base, plats };
}

function loadSettings() {
  const defaults = {
    memoireSemaines: 1,
    equilibreParfait: true,
    frequences: { "Végétarien": -1, "Poulet": 1, "Viande Rouge": 1, "Poisson": 1, "Crustacés": 1, "Porc": 1, "Pâtes": 1, "Crasses": 1, "À commander": 1 }
  };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const saved = raw ? JSON.parse(raw) : {};
    const frequences = { ...defaults.frequences, ...(saved.frequences || {}) };
    // 0 était un état impossible produit par l'ancien bouton + : on le répare.
    Object.keys(frequences).forEach(c => {
      if (typeof frequences[c] !== "number" || frequences[c] === 0) frequences[c] = -1;
    });
    return { ...defaults, ...saved, frequences };
  } catch (e) { return defaults; }
}
function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)); }

function getTrialStatus() {
  if (localStorage.getItem(PREMIUM_KEY) === "true") return "PREMIUM";
  const install = parseInt(localStorage.getItem(INSTALL_KEY) || "0", 10);
  if (!install) return "TRIAL_ACTIVE";
  const days = Math.floor((Date.now() - install) / 86400000);
  return days <= TRIAL_DAYS ? "TRIAL_ACTIVE" : "TRIAL_EXPIRED";
}
function daysRemaining() {
  const install = parseInt(localStorage.getItem(INSTALL_KEY) || "0", 10);
  if (!install) return TRIAL_DAYS;
  return Math.max(0, TRIAL_DAYS - Math.floor((Date.now() - install) / 86400000));
}

/* ===== État global ===== */

const donnees = chargerDonnees();

let state = {
  plats: donnees.plats,
  supprimes: donnees.supprimes,
  semaine: donnees.semaine,
  portions: donnees.portions,
  nombrePersonnes: donnees.nombrePersonnes,
  historique: donnees.historique,
  ecran: "main",
  settings: loadSettings(),
  trial: getTrialStatus()
};

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      v: DATA_VERSION,
      plats: state.plats,
      supprimes: state.supprimes,
      semaine: state.semaine,
      portions: state.portions,
      nombrePersonnes: state.nombrePersonnes,
      historique: state.historique
    }));
  } catch (e) { console.warn("Sauvegarde impossible :", e); }
}

function setPlats(plats) {
  state.plats = plats;
  persist();
  render();
}

/* ===== Semaine de référence ===== */

function isoJour(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function lundiISO(date = new Date()) {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return isoJour(d);
}

function dateDeSemaine(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function libelleSemaine(iso) {
  const lundi = dateDeSemaine(iso);
  const dimanche = new Date(lundi);
  dimanche.setDate(dimanche.getDate() + 6);
  const court = new Intl.DateTimeFormat("fr-BE", { day: "numeric", month: "short" });
  const complet = new Intl.DateTimeFormat("fr-BE", { day: "numeric", month: "short", year: "numeric" });
  return `${court.format(lundi)} – ${complet.format(dimanche)}`;
}

/* Au changement de semaine : on archive les plats choisis (mémoire) puis on
   remet le planning à zéro. La mémoire ne sert à rien si on ne le fait pas. */
function archiverSemaine() {
  const ids = state.plats.filter(p => p.isSelected).map(p => p.id);
  if (!ids.length) return false;
  state.historique = state.historique.filter(h => h.semaine !== state.semaine);
  state.historique.unshift({ semaine: state.semaine, ids });
  state.historique = state.historique.slice(0, 12);
  return true;
}

function nouvelleSemaine() {
  const courante = lundiISO();
  if (state.semaine === courante) return false;
  archiverSemaine();
  state.semaine = courante;
  state.plats = state.plats.map(p => ({ ...p, isSelected: false, jourAttribue: null }));
  return true;
}

function resetSemaine() {
  setPlats(state.plats.map(p => ({ ...p, isSelected: false, jourAttribue: null })));
}

/* ===== Logique métier ===== */

/* Fréquences : -1 = illimité, 1..6 = nombre de plats max par semaine. */
function freqDe(categorie) {
  const f = state.settings.frequences[categorie];
  return typeof f === "number" ? f : -1;
}

function libelleFrequence(categorie) {
  const f = freqDe(categorie);
  return f < 0 ? "illimité" : `${f} fois max`;
}

function categoriePleine(categorie) {
  const f = freqDe(categorie);
  if (f < 0) return false;
  const pris = state.plats.filter(p => p.isSelected && p.categorie === categorie).length;
  return pris >= f;
}

function exclusiviteActive() {
  return state.settings.equilibreParfait !== false;
}

/* Mémoire anti-répétition : plats des N semaines précédant celle affichée. */
function historiqueRetenu() {
  const n = Number(state.settings.memoireSemaines) || 0;
  if (n <= 0) return [];
  const limite = dateDeSemaine(state.semaine);
  limite.setDate(limite.getDate() - 7 * n);
  return state.historique.filter(h => h.semaine !== state.semaine && dateDeSemaine(h.semaine) >= limite);
}

function platDansMemoire(plat) {
  const hist = historiqueRetenu();
  return hist.some(h => h.ids.includes(plat.id));
}

/* Explication affichée à l'utilisateur quand un plat est grisé. */
function raisonNonSelectionnable(plat) {
  if (plat.isSelected) return "";
  if (platDansMemoire(plat)) {
    const n = state.settings.memoireSemaines;
    return `Déjà au menu les ${n} dernière${n > 1 ? "s" : ""} semaine${n > 1 ? "s" : ""} (mémoire anti-répétition)`;
  }
  if (exclusiviteActive()) {
    if (plat.categorie === "Crasses" && state.plats.some(p => p.isSelected && p.categorie === "À commander"))
      return "« À commander » est déjà au menu : les deux ne se cumulent pas";
    if (plat.categorie === "À commander" && state.plats.some(p => p.isSelected && p.categorie === "Crasses"))
      return "« Crasses » est déjà au menu : les deux ne se cumulent pas";
  }
  if (categoriePleine(plat.categorie))
    return `${plat.categorie} : ${libelleFrequence(plat.categorie)} par semaine`;
  return "";
}

function platSelectionnable(plat) {
  if (plat.isSelected) return true;
  return raisonNonSelectionnable(plat) === "";
}

function semaineMagique() {
  const utilisees = {};
  const estDispo = p => {
    if (p.isSelected) return false;
    if (platDansMemoire(p)) return false;
    if (exclusiviteActive()) {
      if (p.categorie === "Crasses" && (utilisees["À commander"] || 0) > 0) return false;
      if (p.categorie === "À commander" && (utilisees["Crasses"] || 0) > 0) return false;
    }
    const f = freqDe(p.categorie);
    if (f >= 0 && (utilisees[p.categorie] || 0) >= f) return false;
    return true;
  };

  const liste = state.plats.map(p => ({ ...p, isSelected: false, jourAttribue: null }));
  for (const jour of JOURS) {
    const dispos = liste.filter(estDispo);
    if (!dispos.length) break;
    const choisi = dispos[Math.floor(Math.random() * dispos.length)];
    const idx = liste.findIndex(p => p.id === choisi.id);
    liste[idx] = { ...choisi, isSelected: true, jourAttribue: jour };
    utilisees[choisi.categorie] = (utilisees[choisi.categorie] || 0) + 1;
  }

  const places = liste.filter(p => p.isSelected).length;
  if (!places) {
    toast("Aucun plat disponible : vérifie la mémoire et les fréquences");
    return;
  }
  setPlats(liste);
  toast(`✨ Semaine générée : ${places} repas`);
}

/* ===== Utilitaires UI ===== */

const app = document.getElementById("app");
const modalRoot = document.getElementById("modal-root");

function esc(s) {
  return String(s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

function closeModal() { modalRoot.innerHTML = ""; }

let toastTimer = null;
function toast(msg) {
  document.querySelectorAll(".toast").forEach(t => t.remove());
  clearTimeout(toastTimer);
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  toastTimer = setTimeout(() => el.remove(), 2500);
}

async function partagerTexte(texte, succesMsg) {
  if (navigator.share) {
    try { await navigator.share({ text: texte }); return; } catch (e) { if (e.name === "AbortError") return; }
  }
  try {
    await navigator.clipboard.writeText(texte);
    toast(succesMsg || "📋 Copié dans le presse-papiers !");
  } catch {
    prompt("Copie ton texte :", texte);
  }
}

function ouvrirRecherche(query) {
  window.open("https://www.google.com/search?q=" + encodeURIComponent(query), "_blank", "noopener");
}

/* ===== Installation PWA ===== */

let deferredPrompt = null;
let pwaInstalled = false;

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  if (state.ecran === "main") renderMain();
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  pwaInstalled = true;
  toast("📱 App installée sur ton appareil !");
  render();
});

function estDejaInstallee() {
  return pwaInstalled || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
}

function plateformeNom() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Mac/i.test(ua)) return "mac";
  return "pc";
}

function instructionsInstall() {
  switch (plateformeNom()) {
    case "ios":
      return {
        titre: "📱 Sur iPhone / iPad",
        etapes: [
          "Ouvre cette page dans <b>Safari</b> (pas Chrome)",
          "Touche le bouton <b>Partager</b> (carré avec une flèche ↑) dans la barre Safari",
          "Fais défiler et touche <b>« Sur l'écran d'accueil »</b>",
          "Touche <b>« Ajouter »</b> en haut à droite"
        ]
      };
    case "android":
      return {
        titre: "🤖 Sur Android",
        etapes: [
          "Ouvre le menu du navigateur (les <b>3 points ⋮</b>)",
          "Touche <b>« Installer l'application »</b> ou <b>« Ajouter à l'écran d'accueil »</b>",
          "Confirme avec <b>« Installer »</b>"
        ]
      };
    case "mac":
      return {
        titre: "🍎 Sur Mac",
        etapes: [
          "Dans Safari : menu <b>Fichier → Ajouter au Dock</b>",
          "Dans Chrome : icône <b>Installer</b> dans la barre d'adresse, ou menu ⋮ → <b>Installer cette page comme application</b>"
        ]
      };
    default:
      return {
        titre: "💻 Sur PC",
        etapes: [
          "Dans Chrome / Edge : clique sur l'icône <b>⊕ Installer</b> dans la barre d'adresse",
          "Ou menu <b>⋮ → Cast, enregistrer et partager → Installer cette page comme application</b>"
        ]
      };
  }
}

function installerApp() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
  } else {
    openInstallDialog();
  }
}

function openInstallDialog() {
  const info = instructionsInstall();
  modalRoot.innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <h3>${info.titre}</h3>
        <p class="hint">Mettre Keskônmange sur ton accueil :</p>
        <ol style="margin:0;padding-left:22px;line-height:1.9">
          ${info.etapes.map(e => `<li>${e}</li>`).join("")}
        </ol>
        <p style="font-size:0.78rem;color:var(--gray);margin-top:14px">Une fois installée, l'app s'ouvre plein écran comme une vraie app, sans barre de navigateur, et fonctionne même hors-ligne.</p>
        <button class="btn" style="width:100%;margin-top:6px" onclick="closeModal()">Compris !</button>
      </div>
    </div>`;
}

/* ===== Écrans ===== */

function renderPaywall() {
  app.innerHTML = `
    <div class="paywall">
      <h2>⏳ Période d'essai expirée</h2>
      <p>Tes ${TRIAL_DAYS} jours d'essai gratuits de Keskônmange Lulu ? sont terminés.<br><br>
      Pour continuer à organiser tes menus et générer tes listes de courses sans limite,
      débloque la version définitive !</p>
      <button class="btn" onclick="setPremium()">🔓 Débloquer l'application (4,99 €)</button>
      <p class="note">Paiement unique · Zéro abonnement · À vie</p>
    </div>`;
}

function setPremium() {
  localStorage.setItem(PREMIUM_KEY, "true");
  state.trial = "PREMIUM";
  render();
}

function renderMain() {
  const parCategorie = new Map();
  for (const p of state.plats) {
    if (!parCategorie.has(p.categorie)) parCategorie.set(p.categorie, []);
    parCategorie.get(p.categorie).push(p);
  }
  const cats = [...parCategorie.keys()].sort((a, b) => {
    const ia = ORDRE_CATEGORIES.indexOf(a), ib = ORDRE_CATEGORIES.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  let trialLabel = "";
  if (state.trial === "TRIAL_ACTIVE") trialLabel = `⏳ Période d'essai : ${daysRemaining()} jour${daysRemaining() > 1 ? "s" : ""} restant${daysRemaining() > 1 ? "s" : ""}`;

  let listHtml = "";
  for (const cat of cats) {
    const liste = parCategorie.get(cat);
    listHtml += `<div class="category-title">• ${esc(cat)} <span class="cat-limit">(${esc(libelleFrequence(cat))})</span></div>`;
    liste.forEach((p, i) => {
      const raison = p.isSelected ? "" : raisonNonSelectionnable(p);
      const ok = !raison;
      listHtml += `
        <div class="plat-card ${p.isSelected ? "selected" : ""} ${ok ? "" : "disabled"}"
             role="button" tabindex="0" aria-disabled="${ok ? "false" : "true"}"
             title="${esc(raison)}"
             onclick="openPlatDialog(${p.id})"
             onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openPlatDialog(${p.id})}">
          <span class="plat-name">${i + 1}. ${esc(p.nom)}</span>
          ${p.isSelected && p.jourAttribue ? `<span class="badge">${esc(p.jourAttribue)}</span>` : ""}
        </div>`;
    });
  }

  const memo = Number(state.settings.memoireSemaines) || 0;

  app.innerHTML = `
    <header class="appbar">
      <div class="appbar-brand">
        <img src="${LOGO_INLINE}" alt="">
        <span>Keskônmange Lulu ?</span>
      </div>
      <div class="appbar-actions">
        <button class="icon-btn" aria-label="Paramètres" title="Paramètres" onclick="go('settings')">⚙️</button>
      </div>
    </header>
    <div class="page-head">
      <p class="week-line"><span class="week-label">📆 ${esc(libelleSemaine(state.semaine))}</span>${memo > 0 ? `<span class="memo-pill" title="Mémoire anti-répétition active">🧠 ${memo} sem.</span>` : ""}</p>
    </div>
    <div class="actions-row">
      <button class="btn accent" onclick="semaineMagique()">🎰 Magique</button>
      <button class="btn ghost" onclick="go('recap')">📅 Récap</button>
      <button class="btn ghost" onclick="go('courses')">🛒 Courses</button>
      <button class="btn ghost" onclick="openPersoDialog()">+ Perso</button>
      <button class="btn ghost" id="btn-cloud" title="Clic : publier · Appui long : modifier la configuration Cloud" onclick="publierCloud()" oncontextmenu="event.preventDefault(); modaleSyncConfigCloud()">☁&#xFE0F; Publier</button>
    </div>
    ${listHtml}
    ${!estDejaInstallee() ? `
    <div class="footer-credits"><span class="sig-line">──</span> <a href="https://edukisto.win/" target="_blank" rel="noopener" title="edukisto — relier & orienter" style="color:#0e7490;text-decoration:none"><svg width="14" height="14" viewBox="0 0 64 64" style="vertical-align:-2px"><path d="M32 3l5.2 18.2 10.8-5.2-5.2 10.8L61 32l-18.2 5.2 5.2 10.8-10.8-5.2L32 61l-5.2-18.2-10.8 5.2 5.2-10.8L3 32l18.2-5.2-5.2-10.8 10.8 5.2z" fill="currentColor"/></svg> edukisto</a> <span class="sig-line">──</span> · <button class="link-btn install-link" onclick="installerApp()">📲 Installer l'app</button></div>` : `
    <div class="footer-credits"><span class="sig-line">──</span> <a href="https://edukisto.win/" target="_blank" rel="noopener" title="edukisto — relier & orienter" style="color:#0e7490;text-decoration:none"><svg width="14" height="14" viewBox="0 0 64 64" style="vertical-align:-2px"><path d="M32 3l5.2 18.2 10.8-5.2-5.2 10.8L61 32l-18.2 5.2 5.2 10.8-10.8-5.2L32 61l-5.2-18.2-10.8 5.2 5.2-10.8L3 32l18.2-5.2-5.2-10.8 10.8 5.2z" fill="currentColor"/></svg> edukisto</a> <span class="sig-line">──</span></div>`}
    ${trialLabel ? `<div class="footer-trial">${trialLabel}</div>` : ""}
  `;
}

function renderRecap() {
  const joursPris = Object.fromEntries(JOURS.map(j => [j, state.plats.find(p => p.jourAttribue === j)]));

  const joursHtml = JOURS.map(jour => {
    const plat = joursPris[jour];
    const nb = state.portions[jour] ?? state.nombrePersonnes;
    if (!plat) {
      return `
        <div class="recap-day empty">
          <div class="day-line">
            <span class="day-name">${jour}</span>
            <span class="day-meal">Rien de prévu</span>
          </div>
        </div>`;
    }
    return `
      <div class="recap-day">
        <div class="day-line">
          <span class="day-name">${jour}</span>
          <span class="day-meal">${esc(plat.nom)}</span>
        </div>
        <div class="divider"></div>
        <div class="day-actions">
          <div class="counter">
            <button class="btn-round" onclick="setPortion('${jour}', ${nb - 1})">−</button>
            <span class="count">${nb} pers.</span>
            <button class="btn-round" onclick="setPortion('${jour}', ${nb + 1})">+</button>
          </div>
          <button class="btn accent small" onclick="chercherRecette(${plat.id}, '${jour}')">🍳 Recette &amp; Ingrédients</button>
        </div>
      </div>`;
  }).join("");

  app.innerHTML = `
    <div class="back-header">
      <div class="title-block">
        <h2 style="color:var(--primary)">Mon Menu</h2>
        <p class="subtitle">Planning validé &amp; Recettes · ${esc(libelleSemaine(state.semaine))}</p>
      </div>
      <button class="btn ghost" onclick="go('main')">⬅️ Retour</button>
    </div>
    <div class="row-2">
      <button class="btn" onclick="partagerMenu()">📤 Partager le menu</button>
      <button class="btn outline danger" onclick="viderSemaine()">🔄 Vider</button>
    </div>
    ${joursHtml}
  `;
}

function setPortion(jour, n) {
  if (n < 1 || n > 20) return;
  state.portions[jour] = n;
  persist();
  render();
}

/* Vide le planning : confirmation d'abord, la mémoire n'est pas touchée. */
function viderSemaine() {
  if (!confirm("Vider le planning de cette semaine ?")) return;
  resetSemaine();
  go("main");
}

function chercherRecette(id, jour) {
  const plat = state.plats.find(p => p.id === id);
  if (!plat) return;
  const nb = state.portions[jour] ?? state.nombrePersonnes;
  const query = plat.categorie === "À commander"
    ? `Informations et menu pour commander : ${plat.nom}`
    : `Donne-moi la recette détaillée, les étapes et les ingrédients précis avec quantités pour ${nb} personnes pour : ${plat.nom}`;
  ouvrirRecherche(query);
}

function partagerMenu() {
  let text = "🍽️ *Mon Menu de la Semaine*\n\n";
  for (const jour of JOURS) {
    const plat = state.plats.find(p => p.jourAttribue === jour);
    const nom = plat ? plat.nom : "Rien de prévu";
    const nb = state.portions[jour] ?? state.nombrePersonnes;
    text += `• *${jour}* (${nb} pers.) : ${nom}\n`;
  }
  text += "\n✨ *Proposé par edukisto* (via Keskônmange)";
  partagerTexte(text);
}

function renderCourses() {
  const selectionnes = state.plats.filter(p => p.isSelected);
  const parCategorie = new Map();
  for (const p of selectionnes) {
    if (!parCategorie.has(p.categorie)) parCategorie.set(p.categorie, []);
    parCategorie.get(p.categorie).push(p);
  }
  const cats = [...parCategorie.keys()].sort((a, b) => {
    const ia = ORDRE_CATEGORIES.indexOf(a), ib = ORDRE_CATEGORIES.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  let listHtml = "";
  for (const cat of cats) {
    listHtml += `<div class="shopping-cat">• Rayon / Type : ${esc(cat)}</div>`;
    for (const p of parCategorie.get(cat)) {
      listHtml += `
        <div class="shopping-item">
          <span>${esc(p.nom)}</span>
          ${p.jourAttribue ? `<span class="badge shopping-badge">${esc(p.jourAttribue)}</span>` : ""}
        </div>`;
    }
  }

  app.innerHTML = `
    <div class="back-header">
      <div class="title-block">
        <h2 style="color:var(--shopping)">Liste de Courses</h2>
        <p class="subtitle">Basée sur tes menus de la semaine</p>
      </div>
      <button class="btn ghost" onclick="go('main')">⬅️ Retour</button>
    </div>
    <div class="card settings-row" style="margin-bottom:12px">
      <span style="font-weight:700">Nombre de convives :</span>
      <div class="counter">
        <button class="btn-round" onclick="setPersonnes(${state.nombrePersonnes - 1})">−</button>
        <span class="count" style="color:var(--shopping)">${state.nombrePersonnes} pers.</span>
        <button class="btn-round" onclick="setPersonnes(${state.nombrePersonnes + 1})">+</button>
      </div>
    </div>
    <button class="btn accent" style="width:100%;margin-bottom:10px" ${selectionnes.length ? "" : "disabled"} onclick="chercherIngredients()">🔍 Trouver les ingrédients et quantités (IA)</button>
    <button class="btn ghost" style="width:100%;margin-bottom:16px" onclick="partagerCourses()">📤 Partager la liste de courses</button>
    ${selectionnes.length === 0
      ? `<div class="empty-state">Aucun plat planifié pour l'instant.<br>Sélectionne des repas ou utilise le mode Magique !</div>`
      : listHtml}
  `;
}

function setPersonnes(n) {
  if (n < 1 || n > 20) return;
  state.nombrePersonnes = n;
  persist();
  render();
}

function chercherIngredients() {
  const selectionnes = state.plats.filter(p => p.isSelected);
  if (!selectionnes.length) return;
  const noms = selectionnes.map(p => p.nom).join(", ");
  ouvrirRecherche(`Donne-moi la liste de courses détaillée avec des quantités précises (en grammes, litres ou unités) pour ${state.nombrePersonnes} personnes pour préparer ces plats : ${noms}, regroupée par rayons de supermarché. Si l'un des plats est un repas à commander ou à emporter, n'inclus aucun ingrédient pour ce plat.`);
}

function partagerCourses() {
  const selectionnes = state.plats.filter(p => p.isSelected);
  const parCategorie = new Map();
  for (const p of selectionnes) {
    if (!parCategorie.has(p.categorie)) parCategorie.set(p.categorie, []);
    parCategorie.get(p.categorie).push(p);
  }
  let text = `🛒 *Liste de Courses de la Semaine* (${state.nombrePersonnes} pers.)\n\n`;
  if (!selectionnes.length) {
    text += "Aucun plat sélectionné pour le moment.";
  } else {
    for (const [cat, liste] of parCategorie) {
      text += `• *${cat.toUpperCase()}* :\n`;
      for (const p of liste) {
        text += ` - ${p.nom}${p.jourAttribue ? ` (${p.jourAttribue})` : ""}\n`;
      }
    }
  }
  text += "\n✨ *Généré par edukisto* (via Keskônmange)";
  partagerTexte(text);
}

function renderSettings() {
  const s = state.settings;
  const freqRows = Object.keys(s.frequences).map(cat => `
    <div class="card settings-row" style="padding:10px 12px">
      <span style="font-size:0.95rem;font-weight:500">${esc(cat)}</span>
      <div class="counter">
        <button class="btn-round" onclick="setFreq('${esc(cat)}', -1)">−</button>
        <span class="count">${esc(libelleFrequence(cat))}</span>
        <button class="btn-round" onclick="setFreq('${esc(cat)}', 1)">+</button>
      </div>
    </div>`).join("");

  const memoCount = historiqueRetenu().length;

  app.innerHTML = `
    <div class="back-header">
      <div class="title-block">
        <h2 style="color:var(--primary)">Paramètres</h2>
        <p class="subtitle">Le cerveau de Lulu · semaine du ${esc(libelleSemaine(state.semaine))}</p>
      </div>
      <button class="btn" onclick="go('main')">✅ Terminé</button>
    </div>
    <div class="card settings-row">
      <div class="label">
        <b>Mémoire Anti-Répétition</b>
        <span>Bloque les plats des N dernières semaines${memoCount ? ` · ${memoCount} semaine${memoCount > 1 ? "s" : ""} en mémoire` : ""}</span>
      </div>
      <div class="counter">
        <button class="btn-round" onclick="setMemoire(${s.memoireSemaines - 1})">−</button>
        <span class="count">${s.memoireSemaines} sem.</span>
        <button class="btn-round" onclick="setMemoire(${s.memoireSemaines + 1})">+</button>
      </div>
    </div>
    <div class="card settings-row">
      <div class="label">
        <b>L'équilibre parfait</b>
        <span>Interdire Crasses et À commander la même semaine</span>
      </div>
      <label class="switch">
        <input type="checkbox" ${s.equilibreParfait ? "checked" : ""} onchange="setEquilibre(this.checked)">
        <span class="track"></span>
      </label>
    </div>
    <div class="card settings-row">
      <div class="label">
        <b>Semaine en cours</b>
        <span>${esc(libelleSemaine(state.semaine))} · le planning repart à zéro chaque lundi</span>
      </div>
      <button class="btn outline small" onclick="effacerMemoire()">Effacer la mémoire</button>
    </div>
    <div class="category-title" style="margin-top:14px">Fréquence autorisée par semaine :</div>
    ${freqRows}
    <div style="height:24px"></div>
  `;
}

function setMemoire(n) {
  if (n < 0) return;
  state.settings.memoireSemaines = Math.min(n, 8);
  saveSettings();
  persist();
  render();
}

function effacerMemoire() {
  if (!state.historique.length) { toast("La mémoire est déjà vide"); return; }
  if (!confirm("Effacer l'historique des semaines passées ?")) return;
  state.historique = [];
  persist();
  render();
  toast("🧠 Mémoire effacée");
}

function setEquilibre(v) {
  state.settings.equilibreParfait = v;
  saveSettings();
  render();
}

/* -1 = illimité. Le bouton − depuis 1 revient à illimité, + depuis illimité passe à 1. */
function setFreq(cat, delta) {
  const actuel = freqDe(cat);
  let n = actuel < 0 ? (delta > 0 ? 1 : -1) : actuel + delta;
  if (n < 1) n = -1;
  if (n > 6) n = 6;
  state.settings.frequences[cat] = n;
  saveSettings();
  render();
}

/* ===== Dialogues ===== */

function openPersoDialog() {
  modalRoot.innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <h3>Nouvelle idée de plat</h3>
        <p class="hint">Entre le nom de ton plat :</p>
        <input type="text" id="nom-perso" placeholder="Ex: Couscous maison">
        <div class="modal-row">
          <button class="btn outline" onclick="closeModal()">Annuler</button>
          <button class="btn" onclick="addPlatPerso()">Ajouter</button>
        </div>
      </div>
    </div>`;
  document.getElementById("nom-perso").focus();
}

function addPlatPerso() {
  const input = document.getElementById("nom-perso");
  const nom = input.value.trim();
  if (!nom) return;
  // Les plats perso gardent toujours un id au-dessus des 81 plats d'origine,
  // même si l'utilisateur a supprimé les premiers : sinon la restauration les perd.
  const nouvelId = Math.max(81, ...state.plats.map(p => p.id), ...state.supprimes) + 1;
  setPlats([...state.plats, { id: nouvelId, nom, categorie: "Propositions Perso", limite: "pas de limite", isSelected: false, jourAttribue: null }]);
  closeModal();
  toast("✅ Plat ajouté !");
}

function openPlatDialog(id) {
  const plat = state.plats.find(p => p.id === id);
  if (!plat) return;

  // Une carte grisée doit rester inerte : on explique pourquoi au lieu de laisser passer.
  if (!plat.isSelected) {
    const raison = raisonNonSelectionnable(plat);
    if (raison) { toast("🚫 " + raison); return; }
  }

  const joursBtns = JOURS.map(jour => {
    const estActuel = plat.jourAttribue === jour;
    const dejaPris = state.plats.some(p => p.jourAttribue === jour && p.id !== plat.id);
    const cls = estActuel ? "current" : dejaPris ? "taken" : "";
    const label = estActuel ? `${jour} (Sélectionné)` : dejaPris ? `${jour} (Déjà pris)` : jour;
    return `<button class="day-btn ${cls}" ${dejaPris && !estActuel ? "disabled" : ""} onclick="assignerJour(${plat.id}, '${jour}')">${label}</button>`;
  }).join("");

  modalRoot.innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <h3 id="dialog-title">Planifier : ${esc(plat.nom)}</h3>
        <div id="edit-zone" style="display:none">
          <p class="hint">Modifier le nom du plat :</p>
          <input type="text" id="nom-modifie" value="${esc(plat.nom)}">
          <button class="btn" style="width:100%;margin-bottom:10px" onclick="saveNom(${plat.id})">Enregistrer le nouveau nom</button>
          <hr style="border:none;border-top:1px solid #eee;margin:6px 0">
        </div>
        <p class="hint">1. Choisir un jour :</p>
        ${joursBtns}
        <div class="modal-row" style="margin-top:10px">
          <button class="btn outline" onclick="toggleEdit(event)">✏️ Modifier nom</button>
          <button class="btn outline danger" onclick="supprimerPlat(${plat.id})">🗑️ Supprimer</button>
        </div>
        <div class="close-row">
          ${plat.isSelected ? `<button class="link-btn danger" onclick="retirerPlanning(${plat.id})">Retirer du planning</button>` : "<span></span>"}
          <button class="link-btn" onclick="closeModal()">Fermer</button>
        </div>
      </div>
    </div>`;
}

function toggleEdit(evt) {
  const zone = document.getElementById("edit-zone");
  const btn = evt.target.closest("button");
  const visible = zone.style.display !== "none";
  zone.style.display = visible ? "none" : "block";
  btn.textContent = visible ? "✏️ Modifier nom" : "Fermer édition";
  if (!visible) document.getElementById("nom-modifie").focus();
}

function saveNom(id) {
  const input = document.getElementById("nom-modifie");
  const nom = input.value.trim();
  if (!nom) return;
  setPlats(state.plats.map(p => p.id === id ? { ...p, nom } : p));
  openPlatDialog(id);
  toast("✅ Nom modifié !");
}

function assignerJour(id, jour) {
  setPlats(state.plats.map(p => {
    if (p.id === id) return { ...p, isSelected: true, jourAttribue: jour };
    if (p.jourAttribue === jour) return { ...p, isSelected: false, jourAttribue: null };
    return p;
  }));
  closeModal();
}

function retirerPlanning(id) {
  setPlats(state.plats.map(p => p.id === id ? { ...p, isSelected: false, jourAttribue: null } : p));
  closeModal();
}

function supprimerPlat(id) {
  const plat = state.plats.find(p => p.id === id);
  if (!plat) return;
  if (!confirm(`Supprimer « ${plat.nom} » de la liste ?`)) return;
  if (DEFAULT_IDS.has(id) && !state.supprimes.includes(id)) state.supprimes.push(id);
  setPlats(state.plats.filter(p => p.id !== id));
  closeModal();
  toast("🗑️ Plat supprimé");
}

/* ===== Rendu principal ===== */

function go(ecran) {
  state.ecran = ecran;
  window.scrollTo(0, 0);
  render();
}

function render() {
  if (state.trial === "TRIAL_EXPIRED") {
    renderPaywall();
    return;
  }
  switch (state.ecran) {
    case "settings": renderSettings(); break;
    case "recap": renderRecap(); break;
    case "courses": renderCourses(); break;
    default: renderMain();
  }
  initBoutonCloud();
}

/* ===== Initialisation ===== */

(function init() {
  if (!localStorage.getItem(INSTALL_KEY)) {
    localStorage.setItem(INSTALL_KEY, String(Date.now()));
  }
  state.trial = getTrialStatus();
  const nouvelle = nouvelleSemaine();
  if (nouvelle) persist();
  render();
  if (nouvelle) toast("🔄 Nouvelle semaine : planning remis à zéro, l'ancien est en mémoire");
})();

/* ===== Publication Cloud (eCalendar Family) ===== */

async function publierCloud() {
  let cfg = syncChargerConfig("repas");
  if (!cfg || !cfg.url) {
    cfg = await modaleSyncConfig();
    if (!cfg) return;
  }
  // La semaine publiée est celle affichée, pas forcément la semaine civile.
  const lundi = dateDeSemaine(state.semaine);
  const planning = {};
  const sansJour = [];
  state.plats.filter(p => p.isSelected).forEach(p => {
    if (!p.jourAttribue) { sansJour.push(p.id); return; }
    const idx = JOURS.indexOf(p.jourAttribue);
    if (idx < 0) { sansJour.push(p.id); return; }
    const d = new Date(lundi); d.setDate(d.getDate() + idx);
    planning[isoJour(d)] = p.id;
  });
  const donnees = {
    planning,
    sansJour,
    plats: state.plats.map(p => ({ id: p.id, nom: p.nom, categorie: p.categorie })),
    semaine: state.semaine
  };
  const boutons = document.querySelectorAll('button.btn');
  let cible = null;
  boutons.forEach(b => { if (b.textContent.includes("Publier")) { cible = b; b.textContent = "⏳ Publication…"; } });
  try {
    await syncPublier("repas", "repas", donnees);
    toast("Publié vers le Cloud ☁️ — visible sur eCalendar Family");
  } catch (e) {
    toast("Publication échouée : " + e.message + " — appui long sur ☁️ pour corriger la config");
  }
  if (cible) cible.textContent = "☁️ Publier";
}

function modaleSyncConfigCloud() {
  modaleSyncConfig().then(() => {});
}

function initBoutonCloud() {
  const b = document.getElementById("btn-cloud");
  if (!b || b.dataset.init) return;
  b.dataset.init = "1";
  let t = null;
  b.addEventListener("touchstart", () => {
    t = setTimeout(() => modaleSyncConfig().then(() => {}), 800);
  }, { passive: true });
  b.addEventListener("touchend", () => clearTimeout(t));
}

function modaleSyncConfig() {
  const cfg = syncChargerConfig("repas") || { url: "", jeton: "" };
  const html = `<div style="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:400;display:flex;align-items:center;justify-content:center;padding:16px">
    <div style="background:#3d3d3d;color:#fff;border-radius:8px;padding:20px;max-width:520px;width:100%">
      <h2 style="margin:0 0 12px">☁️ Configuration du Cloud (cal-sync)</h2>
      <label style="display:block;font-size:.85em;margin:10px 0 4px">URL du Cloud (worker cal-sync)</label>
      <input id="sc-url" style="width:100%;padding:10px;border-radius:8px;border:1px solid #4a4a4a;background:#333;color:#fff" placeholder="https://sync.edukisto.win" value="${cfg.url || "https://sync.edukisto.win"}">
      <label style="display:block;font-size:.85em;margin:10px 0 4px">Jeton secret de la famille</label>
      <input id="sc-jeton" style="width:100%;padding:10px;border-radius:8px;border:1px solid #4a4a4a;background:#333;color:#fff" placeholder="Même mot de passe familial que partout" value="${cfg.jeton}">
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
        <button id="sc-annuler" style="padding:10px 16px;border:none;border-radius:8px;background:#4a4a4a;color:#fff;cursor:pointer">Annuler</button>
        <button id="sc-ok" style="padding:10px 16px;border:none;border-radius:8px;background:var(--primary);color:var(--ink);font-weight:600;cursor:pointer">Enregistrer et publier</button>
      </div>
    </div></div>`;
  const div = document.createElement("div");
  div.innerHTML = html;
  document.getElementById("modal-root").appendChild(div);
  return new Promise(resolve => {
    div.querySelector("#sc-annuler").onclick = () => { div.remove(); resolve(null); };
    div.querySelector("#sc-ok").onclick = async () => {
      const btnOk = div.querySelector("#sc-ok");
      const c = { url: div.querySelector("#sc-url").value.trim().replace(/\/+$/, ""), jeton: div.querySelector("#sc-jeton").value.trim() };
      if (!c.url || !c.jeton) { toast("Remplissez les 2 champs."); return; }
      btnOk.textContent = "⏳ Vérification…";
      const err = await syncVerifier("repas", c);
      if (err) { btnOk.textContent = "Enregistrer et publier"; toast(err); return; }
      syncSauverConfig("repas", c);
      div.remove();
      resolve(c);
    };
  });
}
