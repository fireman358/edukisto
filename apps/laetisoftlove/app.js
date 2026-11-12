/* ===== Espace Manager — Soft Love by Nadine ===== */
"use strict";

const STORAGE_KEY = "softlove-manager-faq-v1";
const AUTH_KEY = "softlove-manager-auth-v1";
const HASH_COACH = "1fa8ed21d21fe92bee3e429cb9c08ba67b700b7f91362fec1874975bd0f24c5c";
const HASH_MANAGER = "da0dbb3aa640e44b6f94e372745d2f7d94df53896ae2725103240a58ebedb105";
let IS_MANAGER = false;

/* ---------- Synchronisation cloud (Cloudflare D1, via /api/sync) ----------
   Les donnees sont servies par la Pages Function functions/api/sync.js,
   reliee a la base D1 "laetisoftlove". Mode local (localStorage) inchangé. */
const SYNC_API = "/api/sync";
const SB_SYNC_ENABLED = true;

function sbSecret() { return IS_MANAGER ? HASH_MANAGER : HASH_COACH; }

async function sbLoad(key) {
  const res = await fetch(SYNC_API + "?key=" + encodeURIComponent(key), {
    headers: { "x-app-secret": sbSecret() }
  });
  if (!res.ok) throw new Error("Sync " + res.status);
  const j = await res.json();
  return j.data;
}

async function sbSave(key, data) {
  const res = await fetch(SYNC_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-app-secret": sbSecret() },
    body: JSON.stringify({ key: key, data: data })
  });
  if (!res.ok) throw new Error("Sync " + res.status);
}

function setSync(state) {
  const badge = document.getElementById("syncBadge");
  if (!badge) return;
  if (!SB_SYNC_ENABLED) { badge.textContent = "📴 local"; badge.title = "Mode local — synchro non configurée"; return; }
  if (state === "online") { badge.textContent = "☁️ sync"; badge.title = "Synchronisé avec le cloud"; }
  else if (state === "saving") { badge.textContent = "⏳ sync…"; badge.title = "Synchronisation…"; }
  else { badge.textContent = "📴 hors-ligne"; badge.title = "Pas de connexion — données locales"; }
}

/* ---------- Accès : mot de passe équipe (2 niveaux) ---------- */
async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function initAuth() {
  const unlock = () => {
    document.getElementById("loginScreen").classList.add("hidden");
    try { sessionStorage.setItem(AUTH_KEY, IS_MANAGER ? "manager" : "coach"); } catch (e) {}
  };
  const applyRole = () => {
    document.body.classList.toggle("role-manager", IS_MANAGER);
    document.body.classList.toggle("role-coach", !IS_MANAGER);
  };
  try {
    const saved = sessionStorage.getItem(AUTH_KEY);
    if (saved === "manager" || saved === "coach") {
      IS_MANAGER = saved === "manager";
      applyRole();
      unlock();
      return;
    }
  } catch (e) {}
  const attempt = async () => {
    const pass = document.getElementById("loginPass").value;
    const h = await sha256(pass);
    if (h === HASH_MANAGER) { IS_MANAGER = true; applyRole(); unlock(); }
    else if (h === HASH_COACH) { IS_MANAGER = false; applyRole(); unlock(); }
    else {
      document.getElementById("loginError").classList.remove("hidden");
      document.getElementById("loginPass").value = "";
      document.getElementById("loginPass").focus();
    }
  };
  document.getElementById("loginBtn").addEventListener("click", attempt);
  document.getElementById("loginPass").addEventListener("keydown", (e) => { if (e.key === "Enter") attempt(); });
}
initAuth();
document.getElementById("year").textContent = new Date().getFullYear();

/* ---------- FAQ par défaut, issue des guides Soft Love ---------- */
const DEFAULT_FAQ = [
  { id: "d19", category: "Carrière & Revenus", question: "Combien peut-on gagner en tant que Love Coach ?", answer: "En moyenne : 2 démos/mois ≈ 300 €, 4 démos/mois ≈ 600 €, 10 démos/mois ≈ 1 400 €. Travailler depuis chez soi permet de plus de déduire une partie des charges du domicile des impôts.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d20", category: "Carrière & Revenus", question: "Comment fonctionne le kit de lancement ?", answer: "Le kit de lancement (valeur 300 €) est disponible à un prix préférentiel de 150 €, sans commission et non comptabilisé dans les challenges. Il doit être commandé au plus tard 30 jours avant la réunion d'annonce. Le kit devient définitivement vôtre après 2 990 € de ventes totales. Il existe aussi le challenge du kit complémentaire : 80 € le jour de la réunion d'annonce, et si vous réalisez au moins 1 940 € de ventes dans les 60 jours, vous remportez un bon d'achat de 225 €.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d21", category: "Carrière & Revenus", question: "Quelles sont les conditions pour bénéficier des bons d'achat mensuels ?", answer: "1) Avoir effectué au minimum une démonstration au cours du mois précédent. 2) Avoir laissé des avis sur les produits déjà reçus ou achetés avec le code LC50. 3) Envoyer la proposition de votre panier par e-mail à votre Manager, en respectant les priorités : d'abord la collection Soft Love, ensuite les produits à mettre en avant communiqués par la Manager, puis vos produits préférés de l'onglet « Cadeaux Love Coach » (sextoys 1×/an, consommables 2×/an si active au moins 11 mois sur les 12 précédents ; choisir la variation avec le plus de stock). Le code est actif jusqu'au 14 à 23 h 59 dans « Mes codes promos » du Front Office.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d22", category: "Carrière & Revenus", question: "Quelles sont les évolutions de carrière possibles ?", answer: "Ambassadeur / marraine : bon d'achat de 60 € dès le 1er recrutement, 100 € au 2e, 140 € au 3e puis 140 € par recrutement subséquent (minimum 1 recrutement tous les 3 mois). Love Coach Expert : un pourcentage sur les ventes de son équipe, avec le soutien de la manager. Manager : développer et coacher son équipe, avec accès aux informations de l'équipe dans le back office. Le Nouvel An Soft Love est accessible avec 10 000 € de CA ou 3 recrutements.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d23", category: "Démos", question: "Quels sont les types de démos Soft Love ?", answer: "En plus des ventes en ligne : 1) La présentation à domicile chez l'hôte — vous vous rendez chez votre hôtesse, accueillez ses amis et leur faites découvrir les produits dans un cadre convivial ; les commandes se font individuellement et dans une pièce à part pour garantir la confidentialité. 2) Les présentations virtuelles par visioconférence. 3) Les lives sur les réseaux sociaux.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d24", category: "Démos", question: "Comment bien démarrer son activité ?", answer: "Planifiez et datez 4 à 6 démonstrations pour démarrer, en incluant les deux premières en tant qu'hôtesse pour acquérir de l'expérience. Visez en moyenne 2 reprises de démos par démo (dont l'hôte) ; une porte ouverte par mois est possible. Définissez vos objectifs avec votre manager, participez aux formations, utilisez une liste de contacts à jour, communiquez régulièrement avec l'hôtesse avant l'atelier et photographiez votre table en début de présentation.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d25", category: "Démos", question: "Que trouve-t-on dans le Back Office ?", answer: "Le Back Office (softlove.eu/soadmin) centralise : l'onglet Commandes (suivi des commandes clientes, livraison et paiement), la Liste des démos (enregistrement, notes de suivi, liens et clôture), la Gestion Love Coach (statistiques, objectifs et performances mensuelles) et l'onglet Commissions (statut et paiement). Le Front Office affiche le stock des produits en temps réel. Une fois Leader, vous accédez aussi aux informations de votre équipe pour le coaching.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d9", category: "Démos", question: "Je reçois une demande de démo transférée par Soft Love : quand dois-je contacter la cliente ?", answer: "Le jour du transfert si la demande est reçue avant 20 h, ou le lendemain au plus tard. Sans réponse à l'appel : envoyez un SMS et un e-mail ; toujours rien : un e-mail le lendemain au plus tard.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d10", category: "Démos", question: "Quel est le planning de suivi d'une démo ?", answer: "J-3 mois : appel + e-mail récapitulatif + message de motivation. J-2 mois : appel, conseils invitations, supports. J-1 mois : création du groupe avec l'hôtesse et tous les participants (présentation des produits, jeux, animations) et prévoir une pièce séparée pour les commandes. J-15 jours : lancement des préventes dans le groupe. J-7 jours : appel avec l'hôtesse, relance conviviale, vérification de la pièce. J-1 jour : encouragement, rappel de l'horaire, confirmation du déroulement.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d36", category: "Démos", question: "Quand et comment prévenir l'hôtesse par mail ?", answer: "Un rappel 15 jours avant la démo (le lien démo devient actif), une confirmation la veille (recommander d'envoyer le lien à ceux qui ne peuvent pas venir), un remerciement le lendemain, puis une proposition de nouvelle collaboration environ une semaine après. Tous ces modèles de mails sont disponibles dans l'onglet Contact & Modèles.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d13", category: "Démos", question: "La cliente ne peut pas tout prendre car elle n'a pas les moyens, que proposer ?", answer: "Proposez-lui une démo chez elle ! Elle pourra obtenir des produits en cadeaux grâce aux ventes réalisées, sans aucune obligation d'achat de sa part — juste un moment convivial entre amies. Donnez-lui le guide hôte et répondez à ses questions.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d14", category: "Produits", question: "Comment fixer une date pour une nouvelle démo ?", answer: "La technique en 3 étapes : 1) Quel mois te conviendrait ? 2) Plutôt au début ou à la fin du mois ? 3) Quel jour de la semaine te convient le mieux ?", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d16", category: "Événements", question: "Comment fonctionnent les forfaits animation pour anniversaire, EVJF/EVG ou baby shower ?", answer: "Le forfait animation est de 50 €, offert si le total des ventes atteint 350 €. Sinon, après la clôture de la démo, l'hôte commande une carte cadeau de 50 € sur la référence de la Love Coach qui a réalisé l'animation. Dans tous les cas, l'hôte bénéficie de 10 % des ventes en cadeaux.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d17", category: "Événements", question: "Quelles sont les conditions du cadeau événement ?", answer: "Anniversaire : démo dans le mois avant ou après la date d'anniversaire + 350 € de ventes, justificatif = carte d'identité. EVJF/EVG : démo dans le mois avant le mariage + 350 € de ventes, justificatif = document prouvant le mariage (faire-part, réservation...). Baby shower : 350 € de ventes, justificatif = document prouvant la grossesse (échographie, certificat médical). Le cadeau est choisi dans le document interne et mentionné dans la note de la commande qui fait partir la démo.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d11", category: "Démos", question: "Comment se passe la clôture d'une démo selon son montant ?", answer: "Moins de 250 € : l'hôte commande dans la démo avec la note « Pour faire partir la démo – Réf. de la démo : ... » et choisit la livraison de la démo. Entre 250 € et 350 € : idem, plus un cadeau surprise ajouté automatiquement. Plus de 350 € : l'hôte clôture la démo, reçoit automatiquement un code promo et commande ses cadeaux sur l'e-boutique avec ce code, en ajoutant la note et en choisissant la livraison.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d12", category: "Démos", question: "Comment obtenir les cadeaux anniversaire, EVJF ou reprise ?", answer: "Remplir le formulaire de contact sur le site et joindre la preuve. Anniversaire : valable 1 mois avant ou après la date, preuve = carte d'identité. EVJF : faire-part, maximum 1 mois avant le mariage. Reprise : avoir déjà commandé dans une démo Soft Love depuis moins de 6 mois (ou moins d'1 an si vous étiez l'hôte), en indiquant la référence de la démo initiale dans la note de commande.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d1", category: "Commandes points", question: "Quelle est la deadline pour envoyer mon mail de commande points ?", answer: "Le mail doit être envoyé à Nadine au plus tard le 12 du mois. Recommandation : l'envoyer pour le 10 afin qu'il puisse être traité sereinement.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d2", category: "Commandes points", question: "Que dois-je inclure dans mon mail de commande points ?", answer: "1) Les captures des commandes passées depuis votre dernière commande points (kit de départ si concerné, colis et tous les produits reçus) intégrées directement dans le corps du mail. 2) Tous les avis des produits reçus, dans le même ordre. 3) Votre panier souhaité en indiquant la formule choisie et en vérifiant le stock et les priorités.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d3", category: "Commandes points", question: "Quelle est la différence entre la formule 4 % et la formule 2 % ?", answer: "Formule 4 % : idéale pour compléter votre table de démonstration — 1 cosmétique par type de produit et par année (2×/an si 2 démos/mois sur les 12 derniers mois), 1 exemplaire par sextoy. Formule 2 % : idéale quand votre table est déjà complète — possibilité de commander différents parfums ou couleurs d'un même produit (une fois par an et par parfum/couleur), 1 exemplaire par sextoy.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d4", category: "Commandes points", question: "Faut-il toujours joindre les captures des avis produits ?", answer: "Non. Si vous avez une commande LCS0 d'un minimum de 150 € payée dans votre point 1, vous n'avez pas besoin de mettre les captures des avis. Sinon, les avis doivent être déposés dès réception de la commande.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d15", category: "Commandes points", question: "Puis-je utiliser les produits obtenus grâce aux points pour moi ?", answer: "Non. Ils sont exclusivement destinés à votre activité de Love Coach : jamais à titre privé, ni offerts, ni revendus. Ils doivent impérativement rester présents sur votre table de démonstration et être présentés lors de toutes vos démonstrations jusqu'à leur retrait officiel du catalogue. Des vérifications régulières sont effectuées via les photos de tables.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d18", category: "Échanges & SAV", question: "Un client signale un produit défectueux : quelle est la procédure SAV ?", answer: "Le produit doit être déclaré défectueux dans les délais de garantie (voir CGV en vigueur). 1) Organiser au plus vite un rendez-vous en visio pour comprendre le problème, vérifier l'utilisation et identifier si le produit semble réellement défectueux. 2) S'il ne semble pas défectueux : expliquer les conseils d'utilisation ; si le problème persiste, une nouvelle analyse pourra être faite. 3) S'il semble défectueux : demander une vidéo montrant le défaut et faire compléter au client le formulaire SAV en ligne — vous recevez une copie par e-mail que vous transférez au bureau. 4) Organiser la récupération : en main propre (chez le client ou via une Love Coach habitant plus proche) ou envoi par étiquette de retour (frais pris en charge par la Love Coach, déductibles, inclus dans les 24,2 % à 36 % de commissions). Bien emballer le produit et conserver le numéro de suivi. 5) Le bureau analyse puis renvoie un produit neuf ou équivalent dans vos points si le défaut est confirmé.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d5", category: "Échanges & SAV", question: "Un client veut échanger un produit : quel est le délai ?", answer: "La demande doit être faite dans les 24 h après la livraison. Passé ce délai, aucun échange ni bon à valoir n'est possible.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d6", category: "Échanges & SAV", question: "Y a-t-il un remboursement possible en démo ?", answer: "Non, pas de remboursement en démo. Un bon à valoir est proposé, utilisable lors d'une prochaine commande selon les conditions en vigueur. Hors démo (commande classique), un remboursement est possible selon les conditions générales de vente.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d7", category: "Échanges & SAV", question: "Quelles sont les règles d'échange selon le type de produit ?", answer: "Sextoys : si le scellé est retiré ou la boîte ouverte, plus d'échange possible. Cosmétiques : si la pompe a été activée (même une fois), plus d'échange ; le produit doit être non ouvert et intact. Culottes : aucun échange. Autre lingerie (soutiens-gorge, bodys...) : échange uniquement si non portée et dans son emballage d'origine, avec analyse à la réception. Autres produits : non utilisés, non ouverts, emballage d'origine.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d8", category: "Échanges & SAV", question: "Où le client doit-il renvoyer le produit ?", answer: "Le retour se fait aux frais du client vers l'un des deux points : le point relais Mondial Relais Déco Attitude de Corbais OU le distributeur Bpost Jaurdinia de Mont-Saint-Guibert. Une analyse est toujours faite à la réception.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d29", category: "Produits", question: "Quel lubrifiant utiliser avec un plug anal ?", answer: "Il est préférable d'utiliser un lubrifiant à base d'eau : les lubrifiants à base de silicone peuvent endommager certains matériaux. Commencez par des plugs de petite taille et augmentez progressivement ; insérez lentement avec beaucoup de lubrifiant, sans forcer, et arrêtez en cas de douleur. Nettoyez à l'eau tiède et au savon doux avant et après chaque utilisation (ou avec le nettoyant Soft Love pour jouets).", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d30", category: "Produits", question: "Comment utiliser les boules de Geisha / Kegels ?", answer: "Les boules de Geisha (Kegels) renforcent les muscles pelviens, améliorent la santé sexuelle, préviennent l'incontinence et augmentent la sensibilité. Insérez-les doucement dans le vagin et contractez les muscles pelviens pour les maintenir ; portez-les quelques minutes par jour selon votre confort. La version Soft Love propose 4 billes de 3 poids différents pour une progression adaptée.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d31", category: "Produits", question: "Comment fonctionne la mousse de massage crpitante ?", answer: "Secouez bien le flacon, déposez une petite quantité de mousse, appliquez en mouvements circulaires et massez doucement — la mousse hydrate et nourrit pendant le massage (pas de rinçage nécessaire). À utiliser sur tout le corps sauf les parties intimes. Elle n'est pas comestible. Faites un test sur une petite zone de peau en cas d'allergie ; en cas de réaction, cessez l'utilisation et consultez un professionnel de santé.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d32", category: "Produits", question: "Les stimulants effet chaud/frais sont-ils adaptés à tous ?", answer: "Les stimulants à effet chaud produisent une sensation de chaleur apaisante, les effets frais une fraîcheur vivifiante ; le stimulant 3 en 1 combine les deux. Les effets (picotements grâce à l'extrait de Jambu) durent de quelques minutes à une heure selon la personne. Faites un test sur une petite zone de peau ; en cas de réaction allergique, arrêtez immédiatement. Compatible avec les sextoys en silicone (test préalable conseillé sur une petite zone du sextoy).", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d33", category: "Produits", question: "Les pailles et moules en silicone sont-ils réutilisables ?", answer: "Oui : les pailles en forme de pénis sont réutilisables (plastique alimentaire sans BPA ni phtalates) — bien les nettoyer entre chaque utilisation et éviter les boissons chaudes. Les moules en silicone (gâteau, glaçons) se nettoient à la main ou au lave-vaisselle à l'eau chaude avec du savon doux ; bien les sécher. Ils sont durables et réutilisables de nombreuses fois.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d34", category: "Produits", question: "Les jeux érotiques conviennent-ils aux débutants et à tous les publics ?", answer: "Oui, les jeux érotiques Soft Love sont conçus pour être inclusifs (tous genres et orientations) et accessibles aux débutants — une introduction ludique à l'exploration de la sensualité. Parfaits pour les EVJF, EVG, soirées entre amis et événements festifs entre adultes consentants.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d26", category: "Recrutement", question: "Faut-il une expérience en vente pour rejoindre Soft Love ?", answer: "Non. Soft Love offre une formation complète à tous ses nouveaux Love Coachs. Tout ce dont vous avez besoin, c'est de la motivation et de la passion pour les produits. Vous bénéficiez de formations continues, d'outils marketing, d'un kit de démarrage et d'une communauté de soutien — jamais seule dans l'aventure !", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d27", category: "Recrutement", question: "Quels sont les avantages du réseau de marraines ?", answer: "En tant qu'ambassadeur/marraine, chaque recrutement qualifié est récompensé : bon d'achat de 60 € dès le premier, 100 € pour le deuxième, 140 € pour le troisième puis 140 € pour chaque recrutement subséquent, tant qu'il y a un minimum d'un recrutement tous les trois mois.", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d28", category: "Recrutement", question: "Comment surmonter les objections lors d'un recrutement ?", answer: "Écoutez les préoccupations et répondez avec des informations claires et positives. Si la personne s'inquiète de son manque d'expérience, expliquez que la formation Soft Love la préparera. Si le temps est un problème, mettez en avant la flexibilité horaire (temps plein ou partiel, c'est elle qui décide).", created: "2024-01-01", updated: "2024-01-01" },
  { id: "d35", category: "Recrutement", question: "Comment promouvoir Soft Love sur les réseaux sociaux ?", answer: "Créez des profils professionnels complets (photo, bio, liens officiels), publiez 3 à 4 fois par semaine en variant les contenus (vidéos, tutoriels, témoignages, stories, sondages). Hashtags : #SoftLove #BienÊtre #SoinPersonnel #BeautéNaturelle. Répondez rapidement aux commentaires et MP, mesurez vos performances avec Facebook Insights / Instagram Analytics et ajustez votre stratégie.", created: "2024-01-01", updated: "2024-01-01" }
];

/* ---------- État ---------- */
let faqs = load();
let editingId = null;
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length) return data;
    }
  } catch (e) { /* fallback défaut */ }
  return [...DEFAULT_FAQ];
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(faqs)); } catch (e) {}
  if (SB_SYNC_ENABLED && IS_MANAGER) { setSync("saving"); sbSave("faq", faqs).then(() => setSync("online")).catch(() => setSync("offline")); }
}

/* ---------- Onglets ---------- */
document.querySelectorAll("#tabs .tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#tabs .tab").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    btn.classList.add("active");
    $("#view-" + btn.dataset.view).classList.add("active");
  });
});

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
}

/* ---------- Rendu FAQ ---------- */
const CATEGORY_ORDER = ["Général", "Commandes points", "Démos", "Échanges & SAV", "Événements", "Produits", "Recrutement", "Carrière & Revenus"];

function uniqueCategories() {
  const set = new Set(faqs.map((f) => f.category || "Général"));
  CATEGORY_ORDER.forEach((c) => set.add(c));
  return [...set];
}

function renderCategoryFilter() {
  const sel = $("#faqCategory");
  const current = sel.value;
  sel.innerHTML = '<option value="">Toutes catégories</option>' +
    uniqueCategories().map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
  sel.value = current;
}

function matches(f) {
  const q = $("#faqSearch").value.trim().toLowerCase();
  const cat = $("#faqCategory").value;
  if (cat && (f.category || "Général") !== cat) return false;
  if (!q) return true;
  return (f.question + " " + f.answer).toLowerCase().includes(q);
}

function renderFaq() {
  renderCategoryFilter();
  const list = $("#faqList");
  list.innerHTML = "";
  const visible = faqs.filter(matches);
  $("#faqEmpty").style.display = visible.length ? "none" : "block";
  visible.forEach((f) => {
    const item = document.createElement("div");
    item.className = "faq-item" + (editingId === f.id ? " editing" : "");
    item.dataset.id = f.id;
    const date = f.updated ? "Modifié le " + f.updated : "Ajouté le " + (f.created || "");
    const isCustom = String(f.id || "").startsWith("f");
    const newBadge = isCustom ? ' <span class="badge badge-new">Nouveau</span>' : "";
    item.innerHTML = `
      <div class="faq-q" role="button" tabindex="0" aria-expanded="false">
        <span class="faq-cat">${esc(f.category || "Général")}</span>
        <h4>${esc(f.question)}${newBadge}</h4>
        <span class="chev">▶</span>
      </div>
      <div class="faq-a">
        <div class="faq-a-inner">
          <div>${esc(f.answer)}</div>
          <div class="faq-meta">
            <span class="date">${esc(date)}</span>
            <button class="icon-btn edit-btn" title="Modifier">✏️ Modifier</button>
            <button class="icon-btn del-btn" title="Supprimer">🗑 Supprimer</button>
          </div>
        </div>
      </div>`;
    const head = item.querySelector(".faq-q");
    const toggle = () => {
      const panel = item.querySelector(".faq-a");
      const open = item.classList.toggle("open");
      head.setAttribute("aria-expanded", open);
      panel.style.maxHeight = open ? panel.scrollHeight + "px" : "0";
    };
    head.addEventListener("click", (e) => {
      if (e.target.closest(".icon-btn")) return;
      toggle();
    });
    head.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
    });
    item.querySelector(".edit-btn").addEventListener("click", () => startEdit(f));
    item.querySelector(".del-btn").addEventListener("click", () => {
      if (confirm("Supprimer cette question ?")) {
        faqs = faqs.filter((x) => x.id !== f.id);
        if (editingId === f.id) resetForm();
        save();
        renderFaq();
        toast("Question supprimée");
      }
    });
    list.appendChild(item);
  });
}

/* ---------- Formulaire ---------- */
function resetForm() {
  editingId = null;
  $("#newQuestion").value = "";
  $("#newAnswer").value = "";
  $("#newCategory").value = "Général";
  $("#faqFormTitle").textContent = "➕ Ajouter une question";
  $("#cancelEdit").classList.add("hidden");
}

function startEdit(f) {
  editingId = f.id;
  $("#newQuestion").value = f.question;
  $("#newAnswer").value = f.answer;
  $("#newCategory").value = f.category || "Général";
  $("#faqFormTitle").textContent = "✏️ Modifier la question";
  $("#cancelEdit").classList.remove("hidden");
  document.getElementById("view-faq").scrollIntoView({ behavior: "smooth" });
  renderFaq();
}

$("#saveFaq").addEventListener("click", () => {
  const question = $("#newQuestion").value.trim();
  const answer = $("#newAnswer").value.trim();
  const category = $("#newCategory").value;
  if (!question || !answer) { toast("Question et réponse obligatoires"); return; }
  const today = new Date().toISOString().slice(0, 10);
  if (editingId) {
    const f = faqs.find((x) => x.id === editingId);
    if (f) { Object.assign(f, { question, answer, category, updated: today }); }
    toast("Question mise à jour");
  } else {
    faqs.push({ id: "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), question, answer, category, created: today, updated: "" });
    toast("Question ajoutée");
  }
  resetForm();
  save();
  renderFaq();
});

$("#cancelEdit").addEventListener("click", () => { resetForm(); renderFaq(); });
$("#faqSearch").addEventListener("input", renderFaq);
$("#faqCategory").addEventListener("change", renderFaq);

/* ---------- Export / Import ---------- */
$("#exportFaq").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(faqs, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "soft-love-faq.json";
  a.click();
  URL.revokeObjectURL(a.href);
});

$("#importFaq").addEventListener("click", () => $("#importFile").click());
$("#importFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data) || !data.every((d) => d.question && d.answer)) throw new Error("format");
      const existing = new Set(faqs.map((f) => (f.question + "|" + f.answer).toLowerCase()));
      let added = 0;
      data.forEach((d) => {
        const key = (d.question + "|" + d.answer).toLowerCase();
        if (!existing.has(key)) {
          faqs.unshift({ id: "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), question: d.question, answer: d.answer, category: d.category || "Général", created: d.created || new Date().toISOString().slice(0, 10), updated: d.updated || "" });
          added++;
        }
      });
      save();
      renderFaq();
      toast(added + " question(s) importée(s)");
    } catch (err) {
      toast("Fichier invalide");
    }
    e.target.value = "";
  };
  reader.readAsText(file);
});

/* ---------- Équipe (manager uniquement) ---------- */
const TEAM_KEY = "softlove-manager-team-v1";
const TEAM_FIELDS = [
  /* Etape 1 : comptes & acces */
  { key: "nom", label: "Nom", type: "text", required: true },
  { key: "prenom", label: "Prénom", type: "text", required: true },
  { key: "email", label: "E-mail", type: "email" },
  { key: "tel", label: "Téléphone", type: "tel" },
  { key: "lieu", label: "Lieu", type: "text" },
  { key: "identification", label: "Identification", type: "text" },
  { key: "mail", label: "Création mail", type: "check" },
  { key: "fbPro", label: "Création Facebook pro", type: "check" },
  { key: "eboutique", label: "Compte e-boutique", type: "check" },
  { key: "fbPrive", label: "Rajout Facebook privé", type: "check" },
  { key: "groupeSL", label: "Groupe Soft Love", type: "check" },
  { key: "teamLaeti", label: "Team Laeti", type: "check" },
  { key: "byNadine", label: "Groupe By Nadine", type: "check" },
  { key: "coaching", label: "Groupe coaching", type: "check" },
  /* Etape 2 : RA & supports */
  { key: "ra", label: "Date RA (min. 540 €)", type: "date" },
  { key: "raEncodee", label: "RA encodée", type: "check" },
  { key: "convention", label: "Date signature convention", type: "date" },
  { key: "carteVisite", label: "Carte de visite", type: "check" },
  { key: "rollup", label: "Roll up", type: "check" },
  { key: "flyer", label: "Flyer", type: "check" },
  { key: "lettrage", label: "Lettrage voiture", type: "check" },
  /* Etape 3 : formations */
  { key: "formationBO", label: "Formation back-office", type: "level" },
  { key: "formationProd", label: "Formation produit", type: "level" },
  { key: "formationPres", label: "Formation présentation produits", type: "level" },
  { key: "formationPrecommande", label: "Formation pré-commande", type: "level" },
  { key: "formationGroupe", label: "Formation groupe démo", type: "level" },
  { key: "formationHotesse", label: "Formation préparation hôtesse", type: "level" },
  /* Etape 4 : communaute */
  { key: "nadineFb", label: "Ajout Nadine Facebook", type: "check" },
  { key: "map", label: "Ajout sur la map", type: "check" },
  { key: "extra", label: "Informations complémentaires", type: "textarea" },
  /* Stade final */
  { key: "prete", label: "Prêt(e)", type: "check" }
];
const STEP1 = ["mail", "fbPro", "eboutique", "fbPrive", "groupeSL", "teamLaeti", "byNadine", "coaching"];
const STEP2 = ["raEncodee", "carteVisite", "rollup", "flyer", "lettrage"];
const STEP3 = ["formationBO", "formationProd", "formationPres", "formationPrecommande", "formationGroupe", "formationHotesse"];
const STEP4 = ["nadineFb", "map"];
function lvlClass(v) { if (v === null || v === undefined) return "none"; if (v >= 8) return "high"; if (v >= 4) return "mid"; return "low"; }
let team = loadTeam();
let editingCoachId = null;

function loadTeam() {
  try {
    const raw = localStorage.getItem(TEAM_KEY);
    if (raw) { const d = JSON.parse(raw); if (Array.isArray(d)) return d; }
  } catch (e) {}
  return [];
}
function saveTeam() {
  try { localStorage.setItem(TEAM_KEY, JSON.stringify(team)); } catch (e) {}
  if (SB_SYNC_ENABLED && IS_MANAGER) { setSync("saving"); sbSave("team", team).then(() => setSync("online")).catch(() => setSync("offline")); }
}

function coachMatches(c) {
  const q = document.getElementById("teamSearch").value.trim().toLowerCase();
  if (!q) return true;
  return [c.nom, c.prenom, c.email, c.tel, c.extra].filter(Boolean).join(" ").toLowerCase().includes(q);
}

function renderTeam() {
  const list = document.getElementById("teamList");
  list.innerHTML = "";
  const visible = team.filter(coachMatches);
  document.getElementById("teamEmpty").style.display = visible.length ? "none" : "block";
  // stats
  const pretes = team.filter((c) => c.prete).length;
  document.getElementById("teamStats").innerHTML =
    `<span class="team-stat">👩‍💼 ${team.length} Love Coach${team.length > 1 ? "s" : ""}</span>` +
    (team.length ? `<span class="team-stat">✅ ${pretes} prêt${pretes > 1 ? "s" : ""}(e)</span>` +
    `<span class="team-stat">🚧 ${team.length - pretes} en parcours</span>` : "");
  visible.forEach((c) => {
    const card = document.createElement("div");
    card.className = "team-card" + (c.prete ? " done" : "");
    card.dataset.id = c.id;
    const chips = [];
    if (c.prete) chips.push('<span class="team-chip on">Prêt(e) ✅</span>');
    else chips.push('<span class="team-chip">En parcours 🚧</span>');
    if (c.ra) chips.push(`<span class="team-chip">📅 RA : ${esc(c.ra)}</span>`);
    if (c.convention) chips.push(`<span class="team-chip">✍️ Conv. : ${esc(c.convention)}</span>`);
    card.innerHTML = `
      <div class="team-card-head" role="button" tabindex="0" aria-expanded="false">
        <span class="team-card-name">${esc(c.prenom)} ${esc(c.nom)}</span>
        ${chips.join("")}
        <span class="chev">▶</span>
      </div>
      <div class="team-card-body">
        <div class="team-card-inner">
          <div class="team-grid">
            <div class="team-field"><label>E-mail</label><div>${esc(c.email || "—")}</div></div>
            <div class="team-field"><label>Téléphone</label><div>${esc(c.tel || "—")}</div></div>
            <div class="team-field"><label>📅 Date RA <small>(min. 540 €)</small></label><div>${esc(c.ra || "—")}</div></div>
            <div class="team-field"><label>✍️ Signature convention</label><div>${esc(c.convention || "—")}</div></div>
            <div class="team-field"><label>📍 Lieu</label><div>${esc(c.lieu || "—")}</div></div>
            <div class="team-field"><label>🆔 Identification</label><div>${esc(c.identification || "—")}</div></div>
          </div>
          <div class="team-check-grid">
            <p class="team-step-title">① Comptes &amp; accès</p>
            ${TEAM_FIELDS.filter((f) => f.type === "check" && STEP1.includes(f.key)).map((f) =>
              `<span class="${c[f.key] ? "ok" : "ko"}">${c[f.key] ? "☑" : "☐"} ${f.label}</span>`).join("")}
            <p class="team-step-title">② RA &amp; supports</p>
            ${TEAM_FIELDS.filter((f) => f.type === "check" && STEP2.includes(f.key)).map((f) =>
              `<span class="${c[f.key] ? "ok" : "ko"}">${c[f.key] ? "☑" : "☐"} ${f.label}</span>`).join("")}
            <p class="team-step-title">③ Formations</p>
            ${TEAM_FIELDS.filter((f) => f.type === "level" && STEP3.includes(f.key)).map((f) =>
              `<span class="lvl ${lvlClass(c[f.key])}">${f.label.replace("Formation ", "")} : <b>${c[f.key] === null || c[f.key] === undefined ? "—" : c[f.key]}/10</b></span>`).join("")}
            <p class="team-step-title">④ Communauté</p>
            ${TEAM_FIELDS.filter((f) => f.type === "check" && STEP4.includes(f.key)).map((f) =>
              `<span class="${c[f.key] ? "ok" : "ko"}">${c[f.key] ? "☑" : "☐"} ${f.label}</span>`).join("")}
          </div>
          <div class="team-prete-display ${c.prete ? "on" : ""}">${c.prete ? "★ PRÊT(E) ✔ — stade final atteint ★" : "○ Pas encore prêt(e) — parcours en cours ○"}</div>
          ${c.extra ? `<div class="team-field" style="margin-top:12px"><label>Informations complémentaires</label><div>${esc(c.extra)}</div></div>` : ""}
          <div class="team-card-meta">
            <span class="date">Ajoutée le ${esc(c.created || "")}</span>
            <button class="icon-btn edit-btn" title="Modifier">✏️ Modifier</button>
            <button class="icon-btn del-btn" title="Supprimer">🗑 Supprimer</button>
          </div>
        </div>
      </div>`;
    const head = card.querySelector(".team-card-head");
    const toggle = () => {
      const body = card.querySelector(".team-card-body");
      const open = card.classList.toggle("open");
      head.setAttribute("aria-expanded", open);
      body.style.maxHeight = open ? body.scrollHeight + "px" : "0";
    };
    head.addEventListener("click", (e) => { if (e.target.closest(".icon-btn")) return; toggle(); });
    head.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
    card.querySelector(".edit-btn").addEventListener("click", () => startEditCoach(c));
    card.querySelector(".del-btn").addEventListener("click", () => {
      if (confirm(`Supprimer ${c.prenom} ${c.nom} de l'équipe ?`)) {
        team = team.filter((x) => x.id !== c.id);
        if (editingCoachId === c.id) resetCoachForm();
        saveTeam();
        renderTeam();
        toast("Love Coach supprimée");
      }
    });
    list.appendChild(card);
  });
}

const CF_ID_MAP = { fbPrive: "fb-prive", fbPro: "fb-pro", groupeSL: "groupe-sl", formationBO: "formation-bo", formationProd: "formation-prod", teamLaeti: "team-laeti", byNadine: "by-nadine", formationPres: "formation-pres", raEncodee: "ra-encodee", carteVisite: "carte-visite", rollup: "rollup", flyer: "flyer", lettrage: "lettrage", formationPrecommande: "formation-precommande", formationGroupe: "formation-groupe", formationHotesse: "formation-hotesse", nadineFb: "nadine-fb", map: "map" };

function resetCoachForm() {
  editingCoachId = null;
  TEAM_FIELDS.forEach((f) => {
    const el = document.getElementById("cf-" + (CF_ID_MAP[f.key] || f.key));
    if (el) { if (f.type === "check") el.checked = false; else el.value = ""; }
  });
  document.getElementById("teamFormTitle").textContent = "➕ Ajouter une Love Coach";
  document.getElementById("cancelCoach").classList.add("hidden");
}

function startEditCoach(c) {
  editingCoachId = c.id;
  TEAM_FIELDS.forEach((f) => {
    const el = document.getElementById("cf-" + (CF_ID_MAP[f.key] || f.key));
    if (el) { if (f.type === "check") el.checked = !!c[f.key]; else el.value = c[f.key] || ""; }
  });
  document.getElementById("teamFormTitle").textContent = `✏️ Modifier ${c.prenom} ${c.nom}`;
  document.getElementById("cancelCoach").classList.remove("hidden");
  document.getElementById("view-team").scrollIntoView({ behavior: "smooth" });
  renderTeam();
}

function getCoachFormValues() {
  const values = {};
  TEAM_FIELDS.forEach((f) => {
    const el = document.getElementById("cf-" + (CF_ID_MAP[f.key] || f.key));
    if (f.type === "check") values[f.key] = !!el.checked;
    else if (f.type === "level") values[f.key] = el.value === "" ? null : parseInt(el.value, 10);
    else values[f.key] = el.value.trim();
  });
  return values;
}

document.getElementById("saveCoach").addEventListener("click", () => {
  const v = getCoachFormValues();
  if (!v.nom || !v.prenom) { toast("Nom et prénom obligatoires"); return; }
  const today = new Date().toISOString().slice(0, 10);
  if (editingCoachId) {
    const c = team.find((x) => x.id === editingCoachId);
    if (c) { Object.assign(c, v, { updated: today }); }
    toast("Fiche mise à jour");
  } else {
    team.push({ id: "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), created: today, updated: "", ...v });
    toast("Love Coach ajoutée");
  }
  resetCoachForm();
  saveTeam();
  renderTeam();
});

document.getElementById("cancelCoach").addEventListener("click", () => { resetCoachForm(); renderTeam(); });
document.getElementById("teamSearch").addEventListener("input", renderTeam);

document.getElementById("pushCloud").addEventListener("click", pushToCloud);
document.getElementById("pullCloud").addEventListener("click", pullFromCloud);

/* Export / Import équipe */
document.getElementById("exportTeam").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(team, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "soft-love-equipe.json";
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById("importTeam").addEventListener("click", () => document.getElementById("importTeamFile").click());
document.getElementById("importTeamFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data) || !data.every((d) => d.nom && d.prenom)) throw new Error("format");
      const existing = new Set(team.map((c) => (c.nom + "|" + c.prenom).toLowerCase()));
      let added = 0;
      data.forEach((d) => {
        if (!existing.has((d.nom + "|" + d.prenom).toLowerCase())) {
          team.push({ id: "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), created: new Date().toISOString().slice(0, 10), updated: "", ...d });
          added++;
        }
      });
      saveTeam();
      renderTeam();
      toast(added + " fiche(s) importée(s)");
    } catch (err) { toast("Fichier invalide"); }
    e.target.value = "";
  };
  reader.readAsText(file);
});

/* ---------- Copier les modèles ---------- */
document.querySelectorAll(".copy-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const text = btn.closest(".tpl").querySelector("pre").textContent;
    try {
      await navigator.clipboard.writeText(text);
      toast("Modèle copié !");
    } catch (err) {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      toast("Modèle copié !");
    }
  });
});

/* ---------- Init ---------- */
renderFaq();
renderTeam();
setSync(SB_SYNC_ENABLED ? "online" : "local");

async function syncFromCloud(verbose) {
  if (!SB_SYNC_ENABLED) return;
  try {
    const [cloudFaq, cloudTeam] = await Promise.all([sbLoad("faq"), sbLoad("team")]);
    console.log("[sync] cloud faq:", Array.isArray(cloudFaq) ? cloudFaq.length + " entrées" : cloudFaq);
    console.log("[sync] cloud team:", Array.isArray(cloudTeam) ? cloudTeam.length + " fiches" : cloudTeam);
    if (cloudFaq && Array.isArray(cloudFaq) && cloudFaq.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudFaq));
      faqs = cloudFaq; renderFaq();
      if (verbose) toast("FAQ synchronisée ☁️");
    }
    if (cloudTeam && Array.isArray(cloudTeam) && cloudTeam.length) {
      localStorage.setItem(TEAM_KEY, JSON.stringify(cloudTeam));
      team = cloudTeam; renderTeam();
      if (verbose) toast("équipe synchronisée ☁️ (" + cloudTeam.length + " fiches)");
    } else if (verbose) toast("☁️ Aucune fiche dans le cloud");
    setSync("online");
  } catch (e) { console.error("[sync] erreur:", e); setSync("offline"); if (verbose) toast("Synchro impossible : " + e.message); }
}

/* Bouton de secours : pousser les donnees LOCALES vers le cloud */
async function pushToCloud() {
  if (!SB_SYNC_ENABLED) { toast("Synchro non configurée"); return; }
  setSync("saving");
  try {
    await sbSave("faq", faqs);
    await sbSave("team", team);
    setSync("online");
    toast("Données poussées vers le cloud ☁️ (" + team.length + " fiches équipe)");
  } catch (e) { console.error("[push] erreur:", e); setSync("offline"); toast("Push impossible : " + e.message); }
}

/* Bouton : tirer les donnees du cloud (ecrase le local) */
async function pullFromCloud() { setSync("saving"); await syncFromCloud(true); setSync(SB_SYNC_ENABLED ? "online" : "local"); }
syncFromCloud(false);
window.addEventListener("online", () => syncFromCloud(false));
