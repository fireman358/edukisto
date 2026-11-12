"use strict";
/* ===== Edukisto Home — application ===== */

const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const JOURS_COURTS = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

const state = {
    d: null,
    vueMois: new Date().getMonth(),
    vueAnnee: new Date().getFullYear(),
    repasSemaineDebut: null,
    cloud: { calfam: null, repas: null },
    cloudCharge: false
};

/* ============ Utilitaires ============ */
function $(s, el) { return (el || document).querySelector(s); }
function elSafe(sel) {
    /* Compatible même très vieux navigateurs (pas de Proxy) :
       objet factice absorbant toute utilisation sans erreur */
    const el = document.querySelector(sel);
    if (el) return el;
    return {
        onclick: null, onchange: null, oninput: null,
        style: {}, value: "", checked: false, textContent: "",
        innerHTML: "", addEventListener: function () { },
        classList: { add: function () { }, remove: function () { }, toggle: function () { } }
    };
}
function $$(s, el) { return [...(el || document).querySelectorAll(s)]; }
function esc(t) { return String(t === undefined || t === null ? "" : t).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }
function isoDate(dt) { return dt.getFullYear() + "-" + String(dt.getMonth()+1).padStart(2,"0") + "-" + String(dt.getDate()).padStart(2,"0"); }
function parseISO(s) { const [y,m,j] = s.split("-").map(Number); return new Date(y, m-1, j); }
function uid() { return Math.random().toString(36).slice(2,10); }
function toast(msg, err) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.toggle("err", !!err);
    t.classList.remove("hidden");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.add("hidden"), 2600);
}
function save() {
    state.d._derniereModif = Date.now();
    sauverDonnees(state.d);
    /* Sync live : publier en arrière-plan (silencieux, sans blocage) */
    if (typeof syncAutoPublier === "function") syncAutoPublier();
}

/* ============ Init ============ */
document.addEventListener("DOMContentLoaded", () => {
    state.d = chargerDonnees();
    if (!state.d.dateInstallation) {
        state.d.dateInstallation = new Date().toISOString();
        save();
    }
    state.repasSemaineDebut = debutSemaine(new Date());

    /* Compatibilité TV anciennes : chaque init isolé — un plantage
       (ex: navigateur sans API) ne casse jamais les onglets */
    const inits = [initTabs, initGestion, initPin, initLicence, restaurerOnglet];
    for (const init of inits) {
        try { init(); } catch (e) { console.warn("init échoué :", e); }
    }
    // Migration : radios par défaut si absentes (anciennes données)
    if (!state.d.radios || !state.d.radios.length) {
        const def = donneesDefaut();
        state.d.radios = def.radios;
        save();
    }
    /* Migration demandée : le rituel « dormir sans problème » (doublon de
       « se coucher à l'heure ») devient « m'habiller » */
    state.d.taches.forEach(t => {
        if (t.titre && t.titre.trim().toLowerCase() === "dormir sans probleme") {
            t.titre = "M'habiller";
        }
    });
    // Migration tâches : ancien faitPar {membreId: "date"} → {membreId: {date: true}} ; points → etoiles
    state.d.taches.forEach(t => {
        if (t.points && !t.etoiles) t.etoiles = Math.max(1, Math.min(5, Math.round(t.points / 5)));
        delete t.points;
        if (t.faitPar) {
            Object.keys(t.faitPar).forEach(mid => {
                const v = t.faitPar[mid];
                if (typeof v === "string") {
                    t.faitPar[mid] = { [v]: true };
                }
            });
        }
    });
    // Migration : ancien icsURL unique -> multi-sources
    if (state.d.icsURL && !(state.d.icsSources || []).length) {
        state.d.icsSources = [{ id: uid(), url: state.d.icsURL, nom: "Google", couleur: "#7dd3fc" }];
        state.d.evenementsICS = (state.d.evenementsICS || []).map(e => ({ ...e, sourceId: state.d.icsSources[0].id, sourceNom: "Google", couleur: "#7dd3fc" }));
        delete state.d.icsURL;
        save();
    }
    initCalendrier();
    initRepas();
    initTaches();
    initListes();
    initPhotos();
    initReglages();
    initKiosque();
    initSync();
    initHorloge();
    initMural();
    /* Mode mural : toute interaction réaffiche l'en-tête */
    ["click", "touchstart", "mousemove", "keydown", "wheel"].forEach(ev =>
        document.addEventListener(ev, () => { if (muralActif) enteteMuralMontrer(); }, { passive: true }));
    /* Démarrage automatique en mode mural si configuré (tablette dédiée) */
    if (state.d.reglages.muralAuto) {
        setTimeout(() => { if (!muralActif) demarrerMural(); }, 800);
    }
    initMeteo();
    initMusiques();
    initFondApp();
    initRadios();

    // Version de l'application — lisible dans le header (et dans la console)
async function afficherVersion() {
    try {
        const r = await fetch("version.txt", { cache: "no-store" });
        const v = (await r.text()).trim();
        const el = document.getElementById("app-version");
        if (el) el.textContent = "v" + v.replace(/^v/, "");
        console.log("Edukisto Home " + v);
    } catch (e) { /* version.txt inaccessible */ }
}
afficherVersion();

    const rendus = [rendreAujourdhui, rendreCalendrier, rendreRepas, rendreTaches, rendreListes, rendrePhotos, rendreMembres, appliquerSombre, cloudBoucle, initHorloge, initMural, initMeteo, initMusiques, initRadios, initSync];
    for (const r of rendus) {
        try { r(); } catch (e) { console.warn("rendu/init échoué :", e); }
    }
});

const ONGLER_CLE = "ecalfam-onglet";

function initTabs() {
    $$("#main-tabs .tab").forEach(b => b.addEventListener("click", () => {
        if (vueProtegee(b.dataset.view) && pinActif() && Date.now() >= pinDeverrouilleJusquA) {
            demanderPin(() => b.click(), "🔒 Entrez le code PIN pour accéder à Gestion/Réglages :");
            return;
        }
        $$("#main-tabs .tab").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        $$(".view").forEach(v => v.classList.remove("active"));
        $("#view-" + b.dataset.view).classList.add("active");
        try { localStorage.setItem(ONGLER_CLE, b.dataset.view); } catch (e) { }
        if (b.dataset.view === "aujourdhui") rendreAujourdhui();
        if (b.dataset.view === "calendrier") rendreCalendrier();
        if (b.dataset.view === "repas") rendreRepas();
        if (b.dataset.view === "taches") rendreTaches();
        if (b.dataset.view === "gestion") rendreGestion();
        if (b.dataset.view === "listes") rendreListes();
    }));
}

/* Jingle d'anniversaire : une fois par jour max */
function rappelJingleJoue(iso) {
    try {
        const dejoue = localStorage.getItem("ecalfam-jingle") === iso;
        localStorage.setItem("ecalfam-jingle", iso);
        return dejoue;
    } catch (e) { return false; }
}

/* ============ Aujourd'hui ============ */
function aujourdhuiISO() { return isoDate(new Date()); }

function annivPourDate(dt, anneeCible) {
    const locaux = state.d.anniversaires.filter(a => a.mois === dt.getMonth()+1 && a.jour === dt.getDate());
    const cloud = cloudApplatir(state.cloud.calfam && state.cloud.calfam.donnees && state.cloud.calfam.donnees.anniversaires)
        .filter(a => a && typeof a === "object" && a.mois === dt.getMonth()+1 && a.jour === dt.getDate())
        .map(a => ({ ...a, type: a.type || "naissance" }));
    const vus = new Set(locaux.map(a => a.nom + a.jour + a.mois));
    return locaux.concat(cloud.filter(a => !vus.has(a.nom + a.jour + a.mois)))
        .map(a => {
            let age = null;
            if (a.annee) age = anneeCible - a.annee;
            return { ...a, age };
        });
}

function feriesDuJour(iso) {
    const locales = (state.d.jours_feries[+iso.slice(0,4)] || []).filter(f => (Array.isArray(f) ? f[0] : f.date) === iso)
        .map(f => Array.isArray(f) ? f[1] : f.label);
    const calfam = state.cloud.calfam && state.cloud.calfam.donnees || null;
    if (!calfam) return locales;
    const cloud = cloudApplatir(calfam.jours_feries).filter(f => (Array.isArray(f) ? f[0] : f.date) === iso)
        .map(f => Array.isArray(f) ? f[1] : f.label);
    return [...new Set([...locales, ...cloud])];
}

function enVacances(iso) {
    const dt = parseISO(iso);
    const dansPeriode = v => {
        const deb = parseISO(Array.isArray(v) ? v[0] : v.debut);
        const fin = parseISO(Array.isArray(v) ? v[1] : v.fin);
        return dt >= deb && dt <= fin;
    };
    const locales = (state.d.vacances_scolaires || []).find(dansPeriode);
    if (locales) return locales;
    const calfam = state.cloud.calfam && state.cloud.calfam.donnees || null;
    if (!calfam) return null;
    return cloudApplatir(calfam.vacances).find(dansPeriode) || null;
}

/* Normalise une collection qui peut être : tableau, objet {annee: [...]},
   ou objet {annee: {mois: [...]}} — retourne toujours un tableau plat d'items. */
function cloudApplatir(v) {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (typeof v === "object") { var r = []; Object.values(v).forEach(function (x) { r = r.concat(cloudApplatir(x)); }); return r; }
    return [];
}

function evenementsDuJour(iso) {
    const calfam = state.cloud.calfam && state.cloud.calfam.donnees || null;
    const evsCalfam = [];
    if (calfam) {
        cloudApplatir(calfam.evenements_speciaux || calfam.evenements).forEach(e => {
            if (!e || typeof e !== "object") return;
            const d = e.date || (e.annee && e.mois && e.jour ? e.annee + "-" + String(e.mois).padStart(2, "0") + "-" + String(e.jour).padStart(2, "0") : null);
            if (d) evsCalfam.push({ id: "cf-" + (d + (e.libelle || e.nom || "")), titre: (e.libelle || e.nom || "Événement") + (e.icon ? " " + e.icon : ""), type: "famille", debut: d, fin: null, cloud: true });
        });
        /* Les jours fériés ne sont PAS ajoutés comme événements :
           ils sont déjà affichés par feriesDuJour (badge 🎉) — sinon doublon. */
    }
    const tous = [...state.d.evenements, ...(state.d.evenementsICS || []), ...evsCalfam]
        .filter(e => e.debut === iso || (e.fin && e.debut <= iso && e.fin >= iso));
    /* Dédoublonnage : même jour + même titre ≈ même événement */
    const vus = new Set();
    return tous.filter(e => {
        const cle = e.debut + "|" + e.titre.replace(/\s+/g, " ").trim().toLowerCase();
        if (vus.has(cle)) return false;
        vus.add(cle);
        return true;
    });
}

function restaurerOnglet() {
    try {
        const dernier = localStorage.getItem(ONGLER_CLE);
        if (dernier && dernier !== "aujourdhui") {
            const btn = document.querySelector(`#main-tabs .tab[data-view="${dernier}"]`);
            if (btn) btn.click();
        }
    } catch (e) { }
}

function rappelSauvegarde() {
    const derniere = state.d.derniereSauvegarde || 0;
    const jours = Math.floor((Date.now() - derniere) / 86400000);
    const el = $("#rappel-sauvegarde");
    if (!el) return;
    if (derniere && jours < 7) { el.innerHTML = ""; return; }
    el.innerHTML = `<div class="card" style="border-color: var(--orange)">
        💾 ${derniere ? "Dernière sauvegarde il y a " + jours + " jour(s)." : "Aucune sauvegarde encore."}
        Pensez à sauvegarder : <button class="btn btn-mini" onclick="exporterEtMarquer()">💾 Fichier</button>
        ${syncChargerConfig("ecal") && syncChargerConfig("ecal").url ? '<button class="btn btn-mini" onclick="sauvegarderCloudEtMarquer()">☁️ Cloud</button>' : ""}
    </div>`;
}

function exporterEtMarquer() {
    state.d.derniereSauvegarde = Date.now();
    save();
    exporter();
}

async function sauvegarderCloudEtMarquer() {
    state.d.derniereSauvegarde = Date.now();
    save();
    await sauvegarderCloud();
}

function rendreAujourdhui() {
    const dt = new Date(), iso = aujourdhuiISO();
    const opts = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
    $("#header-date").textContent = dt.toLocaleDateString("fr-BE", opts);

    const annivs = annivPourDate(dt, dt.getFullYear());
    const fer = feriesDuJour(iso);
    const vac = enVacances(iso);
    const evs = evenementsDuJour(iso);

    let html = `<div class="hero-sous">`;
    annivs.forEach(a => html += `<span class="badge">${a.type === "mariage" ? "💍" : a.type === "rencontre" ? "❤️" : "🎂"} ${esc(a.nom)}${a.age != null ? " (" + a.age + " ans)" : ""}</span>`);
    if (annivs.length && !rappelJingleJoue(aujourdhuiISO())) jingleAnniversaire();
    fer.forEach(f => html += `<span class="badge">🎉 ${esc(f)}</span>`);
    if (vac) html += `<span class="badge">🏖️ ${esc(Array.isArray(vac) ? vac[2] : vac.libelle)}</span>`;
    evs.forEach(e => html += `<span class="badge">${evEmoji(e)} ${esc(e.titre)}</span>`);
    if (!annivs.length && !fer.length && !vac && !evs.length) html += `Rien de spécial aujourd'hui 🙂`;
    html += `</div>`;
    $("#today-hero-badges").innerHTML = html;
    mettreAJourHorloge();
    afficherMeteoCondensee();
    rendreTodayCalendrier();
    rendreTodayMeteo();

    // Les 5 prochains ANNIVERSAIRES (dans l'ordre chronologique, quelle que
    // soit la distance — même dans 2 mois) — tuile toujours remplie et compacte
    const prochains = [];
    for (let i = 0; i < 180 && prochains.length < 5; i++) {
        const dd = new Date(dt); dd.setDate(dd.getDate() + i);
        annivPourDate(dd, dd.getFullYear()).forEach(a => { if (prochains.length < 5) prochains.push({ ...a, dans: i, date: dd }); });
    }
    $("#today-anniv").innerHTML = prochains.length ? prochains.map(a =>
        `<div class="today-item"><span class="dot" style="background:var(--rouge)"></span>
         <span style="flex:1">${a.type === "mariage" ? "💍" : a.type === "rencontre" ? "❤️" : "🎂"} <strong>${esc(a.nom)}</strong>${a.age != null ? " — " + a.age + " ans" : ""}</span>
         <span class="hint">${a.date.toLocaleDateString("fr-BE")} ${a.dans === 0 ? "· aujourd'hui" : "· dans " + a.dans + " j"}</span></div>`).join("")
        : `<p class="hint">Aucun anniversaire à venir.</p>`;

    // Repas de la semaine
    const debut = state.repasSemaineDebut;
    let rep = "";
    for (let i = 0; i < 7; i++) {
        const dd = new Date(debut); dd.setDate(dd.getDate() + i);
        const iso = isoDate(dd);
        const p = platDuJour(iso);
        rep += `<div class="today-item"><span class="dot" style="background:var(--orange)"></span>
            <span style="flex:1">${JOURS_COURTS[dd.getDay() === 0 ? 6 : dd.getDay()-1]} ${dd.getDate()}/${dd.getMonth()+1}</span>
            <span>${p ? esc(p.nom) : "—"}</span></div>`;
    }
    $("#today-repas").innerHTML = rep;

    // Récompenses masquées ? cacher les cartes étoiles/tâches de l'accueil
    const afficherRec = state.d.reglages.recompenses !== false;
    const carteTaches = document.getElementById("today-taches");
    if (carteTaches) carteTaches.parentElement.style.display = afficherRec ? "" : "none";
    const carteRec = document.getElementById("today-recompenses");
    if (carteRec) carteRec.parentElement.style.display = afficherRec ? "" : "none";
    if (!afficherRec) return;   // pas de rendu des sections étoiles

    // Tâches du jour — l'accueil ne montre que les tâches EN ATTENTE :
    // cochées ✓ ou croisées ✗, elles disparaissent (l'état se gère dans l'onglet Tâches)
    const tachesJour = state.d.taches.filter(t => tacheActiveAujourdhui(t, iso));
    $("#today-taches").innerHTML = tachesJour.length ? tachesJour.map(t => {
        const membres = (t.membreIds || (t.membreId ? [t.membreId] : []));
        /* en attente seulement : ni fait (✓) ni refusé (✗) */
        const restants = membres.filter(mid => !tacheFaitePour(t, iso, mid) && !tacheRefuseePour(t, iso, mid));
        if (!restants.length) return "";
        return membres.filter(mid => !tacheFaitePour(t, iso, mid)).map(mid => {
            const m = state.d.membres.find(x => x.id === mid) || { nom: "?", couleur: "#7f8c8d" };
            const refusee = tacheRefuseePour(t, iso, mid);
            return `<div class="today-item" ${refusee ? 'style="opacity:.55"' : ""}><span class="mini-dot" style="background:${esc(m.couleur)}"></span>
             <span style="flex:1;${refusee ? "text-decoration:line-through" : ""}">${esc(m.nom)} · ${esc(t.titre)}</span>
             ${t.points ? `<span class="pts">${t.points} pts</span>` : ""}
             <button class="btn btn-mini btn-primary" onclick="basculerTachePour('${t.id}','${mid}')">✓</button>
             <button class="btn btn-mini btn-danger" onclick="refuserTachePour('${t.id}','${mid}')" title="Non fait — pas d'étoile">✗</button></div>`;
        }).join("");
    }).join("") || `<p class="hint">Toutes les tâches du jour sont faites 🎉</p>`
        : `<p class="hint">Aucune tâche pour aujourd'hui.</p>`;

    // Récompenses : total ⭐ de la semaine par enfant + objectifs (le même calcul que l'onglet Tâches)
    nettoyerObjectifsPerimes();
    {
        const lundiISO = isoDate(debutSemaine(new Date()));
        var _mids = []; state.d.taches.forEach(function (t) { _mids = _mids.concat(t.membreIds || (t.membreId ? [t.membreId] : [])); }); const membreIds = [...new Set(_mids)];
        let html = "";
        // Total par enfant
        membreIds.forEach(mid => {
            const m = state.d.membres.find(x => x.id === mid) || { nom: "?", couleur: "#7f8c8d" };
            const etoiles = etoilesSemaine(mid, lundiISO);
            html += `<div class="today-item"><span class="mini-dot" style="background:${esc(m.couleur)}"></span>
                <span style="flex:1"><strong>${esc(m.nom)}</strong></span>
                <span class="etoiles">${"⭐".repeat(Math.min(etoiles, 10))}${etoiles > 10 ? " +" + (etoiles - 10) : ""}</span>
                <span class="hint">${etoiles} ⭐ cette semaine</span></div>`;
        });
        // Objectifs (récompenses)
        state.d.objectifs.forEach(o => {
            const m = state.d.membres.find(x => x.id === o.membreId) || { nom: "?", couleur: "#7f8c8d" };
            const etoiles = etoilesSemaine(o.membreId, lundiISO) + (o.bonusEtoiles || 0);
            const pct = Math.min(100, Math.round(etoiles / (o.cible || 1) * 100));
            html += `<div class="today-item" style="flex-wrap:wrap">
                <span class="mini-dot" style="background:${esc(m.couleur)}"></span>
                <span style="flex:1;min-width:110px">🎯 ${esc(o.titre)} <small class="hint">${esc(m.nom)}</small></span>
                <span class="hint">${etoiles}/${o.cible} ⭐</span>
                <span class="hint">${esc(o.recompense || "")}</span>
                <div class="progress-bar" style="flex-basis:100%"><div style="width:${pct}%"></div></div>
            </div>`;
        });
        $("#today-recompenses").innerHTML = html || `<p class="hint">Créez des tâches ⭐ dans l'onglet Tâches — chaque coche ajoute des étoiles ici.</p>`;
    }
    rappelSauvegarde();
}

function evEmoji(e) {
    const t = TYPES_EVENEMENTS.find(x => x.id === e.type);
    return t ? t.emoji : "📅";
}

/* ============ Calendrier ============ */
function initCalendrier() {
    elSafe("#cal-prec").onclick = () => { state.vueMois--; if (state.vueMois < 0) { state.vueMois = 11; state.vueAnnee--; } rendreCalendrier(); };
    elSafe("#cal-suiv").onclick = () => { state.vueMois++; if (state.vueMois > 11) { state.vueMois = 0; state.vueAnnee++; } rendreCalendrier(); };
    elSafe("#btn-add-event").onclick = () => modaleEvenement(null);
    elSafe("#btn-import-ics-url").onclick = importICSURL;
    elSafe("#file-ics").onchange = e => { if (e.target.files[0]) lireICS(e.target.files[0]); e.target.value = ""; };
    elSafe("#btn-clear-ics").onclick = () => {
        state.d.evenementsICS = []; state.d.icsSources = []; save();
        toast("Agendas Google effacés.");
        rendreCalendrier(); rendreAujourdhui();
    };
}

function majStatutICS() {
    const el = $("#ics-statut");
    if (!el) return;
    const sources = state.d.icsSources || [];
    const n = (state.d.evenementsICS || []).length;
    if (!sources.length) {
        el.innerHTML = `<p class="hint">Aucun agenda Google enregistré pour l'instant.</p>`;
        return;
    }
    el.innerHTML = `<p class="hint">✅ ${sources.length} agenda(s) connecté(s) · ${n} événement(s) · actualisation auto toutes les 5 min. <button class="btn btn-mini" onclick="refreshICSManuel()">🔄 Actualiser maintenant</button></p>`
        + sources.map(s => {
            const nb = (state.d.evenementsICS || []).filter(e => e.sourceId === s.id).length;
            return `<div class="today-item"><span class="dot" style="background:${esc(s.couleur)}"></span>
                <span style="flex:1"><strong>${esc(s.nom)}</strong> <small class="hint">${esc(s.url.slice(0, 60))}… · ${nb} évén.</small></span>
                <button class="btn btn-mini" onclick="supprimerSourceICS('${s.id}')">🗑️</button></div>`;
        }).join("");
}

async function refreshICSManuel() {
    if (!(state.d.icsSources || []).length) return toast("Importez d'abord une URL.", true);
    toast("⏳ Actualisation des agendas…");
    await refreshICS();
    majStatutICS();
    rendreCalendrier();
}

function rendreCalendrier() {
    $("#cal-titre").textContent = MOIS[state.vueMois] + " " + state.vueAnnee;
    $("#cal-legend").innerHTML = TYPES_EVENEMENTS.map(t =>
        `<span class="leg"><span class="dot" style="background:${t.couleur}"></span>${t.emoji} ${t.label}</span>`).join("");

    const first = new Date(state.vueAnnee, state.vueMois, 1);
    const decal = (first.getDay() + 6) % 7;
    const nbJours = new Date(state.vueAnnee, state.vueMois + 1, 0).getDate();
    const auj = aujourdhuiISO();

    let html = JOURS_COURTS.map(j => `<div class="cal-jour-tete">${j}</div>`).join("");
    for (let i = 0; i < decal; i++) html += `<div class="cal-cell hors-mois"></div>`;
    for (let j = 1; j <= nbJours; j++) {
        const dt = new Date(state.vueAnnee, state.vueMois, j);
        const iso = isoDate(dt);
        const cls = ["cal-cell"];
        if (dt.getDay() === 0 || dt.getDay() === 6) cls.push("weekend");
        if (feriesDuJour(iso).length) cls.push("ferie");
        if (enVacances(iso)) cls.push("vacances");
        if (iso === auj) cls.push("aujourdhui");

        let contenu = `<div class="num">${j}</div>`;
        const mj = meteoJour(iso);
        if (mj) contenu += `<div class="cell-meteo">${meteoIcon(mj.code)} ${Math.round(mj.max)}°<span class="hint">/${Math.round(mj.min)}°</span></div>`;
        annivPourDate(dt, state.vueAnnee).forEach(a => contenu += `<div class="anniv">🎂 ${esc(a.nom)}</div>`);
        feriesDuJour(iso).forEach(f => contenu += `<div class="anniv">🎉 ${esc(f)}</div>`);
        evenementsDuJour(iso).forEach(e => {
            const t = TYPES_EVENEMENTS.find(x => x.id === e.type) || { couleur: "#7f8c8d" };
            const c = e.couleur || t.couleur;
            contenu += `<div class="ev" style="background:${c}">${evEmoji(e)} ${esc(e.titre)}</div>`;
        });
        html += `<div class="${cls.join(" ")}" onclick="modaleJour('${iso}')">${contenu}</div>`;
    }
    $("#cal-grille").innerHTML = html;
    rendreListeEvenements();
    majStatutICS();
}

function rendreListeEvenements() {
    /* Fenêtre : du mois passé (marge) à dans 2 semaines */
    const auj = new Date();
    const debut = isoDate(new Date(auj.getFullYear(), auj.getMonth(), auj.getDate() - 31));
    const fin = new Date(auj); fin.setDate(fin.getDate() + 14);
    const finStr = isoDate(fin);
    const evs = [...state.d.evenements, ...(state.d.evenementsICS || [])]
        .filter(e => e.debut >= debut && (!e.debut || e.debut <= finStr))
        .sort((a,b) => a.debut.localeCompare(b.debut));
    $("#liste-evenements").innerHTML = evs.length ? evs.map(e =>
        `<div class="today-item"><span class="dot" style="background:${(TYPES_EVENEMENTS.find(t => t.id === e.type) || {couleur:"#7f8c8d"}).couleur}"></span>
         <span style="flex:1">${evEmoji(e)} <strong>${esc(e.titre)}</strong> — ${e.debut}${e.fin ? " → " + e.fin : ""} ${e.ics ? '<em class="hint">(importé)</em>' : ""}</span>
         ${e.ics ? "" : `<button class="btn btn-mini" onclick="modaleEvenement('${e.id}')">✏️</button><button class="btn btn-mini btn-danger" onclick="supprimerEvenement('${e.id}')">🗑️</button>`}
         </div>`).join("") : `<p class="hint">Aucun événement. Ajoutez-en ou importez votre agenda Google.</p>`;
}

function modaleEvenement(id) {
    const e = id ? state.d.evenements.find(x => x.id === id) : null;
    ouvrirModale(`
        <h2>${e ? "Modifier" : "Nouvel"} événement</h2>
        <label>Titre</label><input class="input" id="me-titre" value="${e ? esc(e.titre) : ""}">
        <label>Type</label><select class="input" id="me-type">${TYPES_EVENEMENTS.map(t => `<option value="${t.id}" ${e && e.type === t.id ? "selected" : ""}>${t.emoji} ${t.label}</option>`).join("")}</select>
        <label>Début</label><input class="input" type="date" id="me-debut" value="${e ? e.debut : aujourdhuiISO()}">
        <label>Fin (optionnel)</label><input class="input" type="date" id="me-fin" value="${e && e.fin ? e.fin : ""}">
        <div class="modal-actions">
            <button class="btn" onclick="fermerModale()">Annuler</button>
            <button class="btn btn-primary" onclick="validerEvenement('${e ? e.id : ""}')">Enregistrer</button>
        </div>`);
}

function validerEvenement(id) {
    if (!editionPermise()) return refuserEdition();
    const titre = $("#me-titre").value.trim();
    if (!titre) return toast("Donnez un titre à l'événement.", true);
    const ev = { id: id || uid(), titre, type: $("#me-type").value, debut: $("#me-debut").value, fin: $("#me-fin").value || null };
    if (id) {
        const i = state.d.evenements.findIndex(x => x.id === id);
        state.d.evenements[i] = ev;
    } else state.d.evenements.push(ev);
    save(); fermerModale(); rendreCalendrier(); rendreAujourdhui();
    toast("Événement enregistré ✓");
}

function supprimerEvenement(id) {
    if (!editionPermise()) return refuserEdition();
    state.d.evenements = state.d.evenements.filter(e => e.id !== id);
    save(); rendreCalendrier(); toast("Événement supprimé.");
}


function modaleJour(iso) {
    const dt = parseISO(iso);
    const annivs = annivPourDate(dt, dt.getFullYear());
    const evs = evenementsDuJour(iso);
    ouvrirModale(`
        <h2>${dt.toLocaleDateString("fr-BE", { weekday:"long", day:"numeric", month:"long" })}</h2>
        ${feriesDuJour(iso).map(f => `<p>🎉 ${esc(f)}</p>`).join("")}
        ${enVacances(iso) ? `<p>🏖️ ${esc((v => Array.isArray(v) ? v[2] : v.libelle)(enVacances(iso)))}</p>` : ""}
        ${annivs.map(a => `<p>🎂 <strong>${esc(a.nom)}</strong>${a.age != null ? " — " + a.age + " ans" : ""}</p>`).join("")}
        ${evs.map(e => `<p>${evEmoji(e)} ${esc(e.titre)} ${e.heure ? "· " + e.heure : ""}</p>`).join("")}
        ${evs.length || annivs.length ? "" : "<p class='hint'>Rien ce jour-là.</p>"}
        <div class="modal-actions">
            <button class="btn" onclick="fermerModale()">Fermer</button>
            <button class="btn btn-primary" onclick="fermerModale(); modaleEvenement(null)">➕ Ajouter un événement</button>
        </div>`);
}

/* ============ ICS (Google Calendar) ============ */
async function telechargerICS(url) {
    /* URL Google directe → CORS garanti : on la redirige automatiquement
       vers le proxy gcal.edukisto.win si l'agenda y est connu. */
    /* Les URLs Google directes sont relayées par le proxy edukisto
       (gcal.edukisto.win, mode universel ?url=) — aucun CORS. */
    if (/^https:\/\/calendar\.google\.com\//.test(url)) {
        return telechargerICSviaProxy("https://gcal.edukisto.win/?url=" + encodeURIComponent(url));
    }

    try {
        const r = await fetch(url);
        if (!r.ok) throw new Error("HTTP " + r.status);
        return await r.text();
    } catch (e) {
        const cfg = syncChargerConfig("ecal");
        if (!cfg || !cfg.url) throw new Error("Lecture directe impossible (" + (e.message || "CORS") + ") — vérifiez que l'URL est bien celle du proxy https://gcal.edukisto.win/… , ou importez le fichier .ics manuellement");
        try {
            return await syncProxyICS("ecal", url);
        } catch (e2) {
            throw new Error("Lecture directe impossible (" + (e.message || "CORS") + ") et proxy ICS indisponible — importez le fichier .ics manuellement (Google Agenda → Paramètres → Importer et exporter)");
        }
    }
}

async function telechargerICSviaProxy(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.text();
}

async function importICSURL() {
    if (!editionPermise()) return refuserEdition();
    const url = $("#ics-url").value.trim();
    if (!url) return toast("Collez d'abord l'URL .ics de l'agenda partagé.", true);
    if (!/^https:\/\//.test(url)) return toast("L'URL doit commencer par https://", true);
    const nom = ($("#ics-nom") && $("#ics-nom").value.trim()) || "Google";
    const couleur = ($("#ics-couleur") && $("#ics-couleur").value) || "#7dd3fc";
    toast("⏳ Téléchargement de l'agenda " + nom + "…");
    try {
        const txt = await telechargerICS(url);
        state.d.icsSources = state.d.icsSources || [];
        let source = state.d.icsSources.find(s => s.url === url);
        if (!source) {
            source = { id: uid(), url, nom, couleur };
            state.d.icsSources.push(source);
        } else { source.nom = nom; source.couleur = couleur; }
        save();
        importerTexteICS(txt, false, source);
    } catch (err) {
        toast("Import impossible : " + err.message, true);
    }
}

function supprimerSourceICS(id) {
    state.d.icsSources = (state.d.icsSources || []).filter(s => s.id !== id);
    state.d.evenementsICS = (state.d.evenementsICS || []).filter(e => e.sourceId !== id);
    save(); rendreCalendrier(); rendreAujourdhui();
    toast("Agenda retiré.");
}

async function refreshICS() {
    const sources = state.d.icsSources || [];
    if (!sources.length) return;
    for (const s of sources) {
        try {
            const txt = await telechargerICS(s.url);
            importerTexteICS(txt, true, s);
        } catch (e) {
            console.warn("Refresh ICS (" + s.nom + ") échoué :", e);
        }
    }
}

function lireICS(file) {
    const fr = new FileReader();
    fr.onload = () => importerTexteICS(fr.result);
    fr.readAsText(file);
}

function importerTexteICS(txt, silencieux, source) {
    source = source || { id: null, nom: "Google", couleur: "#7dd3fc" };
    if (source.id) {
        state.d.evenementsICS = (state.d.evenementsICS || []).filter(e => e.sourceId !== source.id);
    }
    const evs = [];
    const lignes = txt.replace(/\r\n/g, "\n").split("\n");
    let cur = null;
    const unescape = s => s.replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\n/g, " ");
    for (const l of lignes) {
        if (l.startsWith("BEGIN:VEVENT")) cur = {};
        else if (l.startsWith("END:VEVENT")) { if (cur && cur.debut) evs.push(cur); cur = null; }
        else if (cur) {
            const m = l.match(/^(DTSTART;[^:]*|DTSTART|SUMMARY|RRULE[^:]*)(?::)(.*)$/);
            if (m) {
                if (m[1].startsWith("DTSTART")) {
                    const dm = m[2].match(/(\d{4})(\d{2})(\d{2})/);
                    if (dm) cur.debut = dm[1] + "-" + dm[2] + "-" + dm[3];
                } else if (m[1].startsWith("SUMMARY")) {
                    cur.titre = unescape(m[2]);
                } else if (m[1].startsWith("RRULE")) {
                    cur.rrule = m[2];
                }
            }
        }
    }
    if (!evs.length) { if (!silencieux) toast("Aucun événement trouvé dans le fichier ICS.", true); return; }

    /* Filtre : on ignore les événements datés d'avant 1 mois (limite inférieure) */
    const auj = new Date();
    const limitePassee = new Date(auj); limitePassee.setDate(limitePassee.getDate() - 31);
    const debutStr = isoDate(limitePassee);

    /* Expansion des récurrences sur les 90 prochains jours (affichage calendrier) */
    const finExpansion = new Date(auj); finExpansion.setDate(finExpansion.getDate() + 90);
    const expanses = [];
    for (const e of evs) {
        if (e.debut < debutStr) continue;
        expanses.push({ titre: e.titre || "(sans titre)", debut: e.debut });
        if (e.rrule && /FREQ=(WEEKLY|DAILY)/.test(e.rrule)) {
            const hebdo = /FREQ=WEEKLY/.test(e.rrule);
            const parJour = e.rrule.match(/BYDAY=([A-Z,]+)/);
            const joursBY = parJour ? parJour[1].split(",") : null;
            const codes = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 0 };
            const d = parseISO(e.debut);
            let compteur = 0;
            while (d <= finExpansion && compteur < 200) {
                d.setDate(d.getDate() + (hebdo ? 7 : 1));
                compteur++;
                if (joursBY && !joursBY.some(j => codes[j] === d.getDay())) continue;
                expanses.push({ titre: e.titre || "(sans titre)", debut: isoDate(d) });
            }
        }
    }

    const deja = new Set(state.d.evenementsICS.map(e => e.debut + "|" + e.titre));
    let ajoutes = 0;
    expanses.filter(e => !deja.has(e.debut + "|" + e.titre)).forEach(e => {
        state.d.evenementsICS.push({ id: uid(), titre: e.titre, type: "perso", debut: e.debut, fin: null, ics: true, sourceId: source.id, sourceNom: source.nom, couleur: source.couleur });
        ajoutes++;
    });
    save(); rendreCalendrier(); rendreAujourdhui();
    if (!silencieux) toast(ajoutes + " événement(s) importé(s) depuis Google ✓ (" + evs.length + " dans l'agenda, récurrences incluses)");
}

/* ============ Repas (Keskonmange Lulu) ============ */
function debutSemaine(dt) {
    const d = new Date(dt);
    const dec = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dec);
    d.setHours(0,0,0,0);
    return d;
}

function platDuJour(iso) {
    const id = state.d.planRepas[iso];
    const local = state.d.plats.find(p => p.id === id) || null;
    if (local) return local;
    const repas = state.cloud.repas && state.cloud.repas.donnees || null;
    if (repas && repas.planning && repas.planning[iso]) {
        const p = (repas.plats || []).find(x => x.id === repas.planning[iso]) || repas.planning[iso];
        return typeof p === "object" ? { ...p, cloud: true } : { nom: String(p), categorie: "", cloud: true };
    }
    return null;
}

function initRepas() {
    elSafe("#repas-prec").onclick = () => { state.repasSemaineDebut.setDate(state.repasSemaineDebut.getDate() - 7); rendreRepas(); rendreAujourdhui(); };
    elSafe("#repas-suiv").onclick = () => { state.repasSemaineDebut.setDate(state.repasSemaineDebut.getDate() + 7); rendreRepas(); rendreAujourdhui(); };
    elSafe("#btn-generer-repas").onclick = genererSemaine;
    const selMem = $("#memoire-repas");
    if (selMem) {
        selMem.value = String(state.d.reglages.memoireRepas || 2);
        selMem.onchange = () => { state.d.reglages.memoireRepas = +selMem.value; save(); toast("Mémoire : " + selMem.value + " semaine(s) ✓"); };
    }
}

function reglesRespectees(plan, cat, iso) {
    /* Règles configurables (Gestion → Plats → Règles) :
       - frequences : -1 = illimité, 0 = interdit, n = max n fois/semaine
       - equilibreParfait : jamais Crasses ET À commander la même semaine */
    const reglages = state.d.reglages;
    const freqs = reglages.frequences || {};
    const ids = Object.values(plan).filter(Boolean);
    const catsDuPlan = ids.map(id => (state.d.plats.find(p => p.id === id) || {}).categorie);
    const freq = freqs[cat] !== undefined ? freqs[cat] : 1;
    if (freq === -1) return true;
    if (reglages.equilibreParfait) {
        if (cat === "À commander" && catsDuPlan.includes("Crasses")) return false;
        if (cat === "Crasses" && catsDuPlan.includes("À commander")) return false;
    }
    return catsDuPlan.filter(c => c === cat).length < freq;
}

/* Plats servis ces N dernières semaines (mémoire anti-répétition) */
function platsRecents(semaineLundi, nbSemaines) {
    const vus = new Set();
    const lundi = parseISO(isoDate(semaineLundi));
    /* Semaine s en arrière : jours de (lundi - s*7) à (lundi - s*7 + 6) */
    for (let s = 1; s <= nbSemaines; s++) {
        for (let j = 0; j < 7; j++) {
            const d = new Date(lundi); d.setDate(d.getDate() - s * 7 + j);
            const id = state.d.planRepas[isoDate(d)];
            if (id) vus.add(id);
        }
    }
    return vus;
}

function genererSemaine() {
    if (!editionPermise()) return refuserEdition();
    const debut = state.repasSemaineDebut;
    const joursDejaRemplis = [...Array(7)].some((_, i) => {
        const dd = new Date(debut); dd.setDate(dd.getDate() + i);
        return !!state.d.planRepas[isoDate(dd)];
    });
    if (joursDejaRemplis && !confirm("Remplacer toute la semaine par un nouveau tirage ?")) return;

    const memoire = Math.min(4, Math.max(1, state.d.reglages.memoireRepas || 2));
    const recents = platsRecents(debut, memoire);

    const plan = {};
    for (let i = 0; i < 7; i++) {
        const dd = new Date(debut); dd.setDate(dd.getDate() + i);
        plan[isoDate(dd)] = null; // régénération complète : on repart de zéro
    }
    const dejaPris = new Set();
    for (const iso of Object.keys(plan)) {
        /* 1. Essayer sans répéter les plats des N dernières semaines */
        let candidats = state.d.plats.filter(p => !dejaPris.has(p.id) && !recents.has(p.id) && reglesRespectees(plan, p.categorie));
        /* 2. Si trop restrictif : autoriser les plats récents (jamais de semaine vide faute de choix) */
        if (!candidats.length) candidats = state.d.plats.filter(p => !dejaPris.has(p.id) && reglesRespectees(plan, p.categorie));
        if (!candidats.length) continue;
        const p = candidats[Math.floor(Math.random() * candidats.length)];
        plan[iso] = p.id;
        dejaPris.add(p.id);
    }
    Object.assign(state.d.planRepas, plan);
    save(); rendreRepas(); rendreAujourdhui();
    toast("Semaine générée 🍽️ (" + Object.values(plan).filter(Boolean).length + "/7 jours · 1× max par catégorie · mémoire " + memoire + " sem." + (Object.values(plan).some(id => recents.has(id)) ? " — plats récents réutilisés faute de choix" : ""));
}

function rendreRepas() {
    const debut = state.repasSemaineDebut;
    const fin = new Date(debut); fin.setDate(fin.getDate() + 6);
    $("#repas-titre").textContent = "Semaine du " + debut.toLocaleDateString("fr-BE") + " au " + fin.toLocaleDateString("fr-BE");

    let html = "";
    for (let i = 0; i < 7; i++) {
        const dd = new Date(debut); dd.setDate(dd.getDate() + i);
        const iso = isoDate(dd);
        const p = platDuJour(iso);
        html += `<div class="repas-jour" onclick="modaleChoisirPlat('${iso}')">
            <h3>${JOURS_COURTS[i]} ${dd.getDate()}/${dd.getMonth()+1}</h3>
            <div class="repas-nom selectable">${p ? (p.cloud ? "☁️ " : "🍽️ ") + esc(p.nom) + `<br><small class="hint">${esc(p.categorie || "")}</small>` : "➕ Choisir un repas"}</div>
        </div>`;
    }
    html += `<div class="repas-cloud-bar card">
        <button class="btn btn-mini btn-primary" onclick="ingredientsVersListeCourses()" title="Ajoute TOUS les ingrédients des plats de la semaine, multipliés par le nombre de personnes">🧺 Ingrédients → liste</button>
        <span class="hint" style="display:inline-flex;align-items:center;gap:4px">pour
          <input type="number" id="nb-personnes" min="1" max="20" style="width:48px" value="${state.d.reglages.nbPersonnes || 4}" onchange="state.d.reglages.nbPersonnes=Math.max(1,Math.min(20,+this.value||4));save()">
          pers.</span>
        <button class="btn btn-mini" onclick="allerGestionPlats()">📖 Gérer les plats</button>
    </div>`;
    $("#repas-semaine").innerHTML = html;
}



function rendrePlats() {
    const cat = $("#filtre-categorie").value;
    const q = $("#recherche-plat").value.trim().toLowerCase();
    const plats = state.d.plats.filter(p => (!cat || p.categorie === cat) && (!q || p.nom.toLowerCase().includes(q)));
    $("#plats-liste").innerHTML = plats.map(p =>
        `<div class="plat-item"><span class="cat">${esc(p.categorie)}</span><span style="flex:1">${esc(p.nom)}</span>
         <button class="btn btn-mini" onclick="modalePlat('${p.id}')">✏️</button>
         <button class="btn btn-mini btn-danger" onclick="supprimerPlat('${p.id}')">🗑️</button></div>`).join("")
        || `<p class="hint">Aucun plat.</p>`;
}

function modalePlat(id) {
    const p = id ? state.d.plats.find(x => x.id === id) : null;
    ouvrirModale(`
        <h2>${p ? "Modifier" : "Nouveau"} plat</h2>
        <label>Nom</label><input class="input" id="mp-nom" value="${p ? esc(p.nom) : ""}">
        <label>Catégorie</label><select class="input" id="mp-cat">${CATEGORIES_PLATS.map(c => `<option ${p && p.categorie === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
        <div class="modal-actions">
            <button class="btn" onclick="fermerModale()">Annuler</button>
            <button class="btn btn-primary" onclick="validerPlat('${p ? p.id : ""}')">Enregistrer</button>
        </div>`);
}

function validerPlat(id) {
    if (!editionPermise()) return refuserEdition();
    const nom = $("#mp-nom").value.trim();
    if (!nom) return toast("Donnez un nom au plat.", true);
    if (id) {
        const p = state.d.plats.find(x => x.id === id);
        p.nom = nom; p.categorie = $("#mp-cat").value;
    } else state.d.plats.push({ id: uid(), nom, categorie: $("#mp-cat").value });
    save(); fermerModale(); rendrePlats(); toast("Plat enregistré ✓");
}

function supprimerPlat(id) {
    if (!editionPermise()) return refuserEdition();
    state.d.plats = state.d.plats.filter(p => p.id !== id);
    Object.keys(state.d.planRepas).forEach(iso => { if (state.d.planRepas[iso] === id) delete state.d.planRepas[iso]; });
    save(); rendrePlats(); rendreRepas(); toast("Plat supprimé.");
}

function modaleChoisirPlat(iso) {
    if (!editionPermise()) return refuserEdition();
    /* Règles de génération appliquées aussi à la sélection manuelle :
       un plat interdit (fréquence dépassée, équilibre parfait) est grisé. */
    const planSemaine = {};
    const lundi = debutSemaine(parseISO(iso));
    for (let i = 0; i < 7; i++) {
        const dd = new Date(lundi); dd.setDate(dd.getDate() + i);
        planSemaine[isoDate(dd)] = state.d.planRepas[isoDate(dd)] || null;
    }
    const platChoisi = state.d.planRepas[iso];
    const options = state.d.plats.map(p => {
        const interdit = !reglesRespectees({ ...planSemaine, [iso]: null }, p.categorie) && p.id !== platChoisi;
        const suffixe = interdit ? " (limite atteinte)" : "";
        return `<option value="${p.id}" ${platChoisi === p.id ? "selected" : ""} ${interdit ? "disabled" : ""}>${esc(p.categorie)} · ${esc(p.nom)}${suffixe}</option>`;
    }).join("");
    ouvrirModale(`
        <h2>Repas du ${parseISO(iso).toLocaleDateString("fr-BE", { weekday:"long", day:"numeric", month:"long" })}</h2>
        <select class="input" id="mc-plat">
            <option value="">— Aucun —</option>
            ${options}
        </select>
        <div class="modal-actions">
            <button class="btn" onclick="fermerModale()">Annuler</button>
            <button class="btn btn-primary" onclick="validerChoixPlat('${iso}')">OK</button>
        </div>`);
}

function validerChoixPlat(iso) {
    if (!editionPermise()) return refuserEdition();
    const v = $("#mc-plat").value;
    if (v) state.d.planRepas[iso] = v; else delete state.d.planRepas[iso];
    save(); fermerModale(); rendreRepas(); rendreAujourdhui();
}

/* ============ Tâches & objectifs ============ */
function initTaches() {
    elSafe("#btn-add-tache").onclick = () => modaleTache(null);
    elSafe("#btn-add-objectif").onclick = () => modaleObjectif(null);
}

function rendreTaches() {
    const iso = aujourdhuiISO();
    const lundiISO = isoDate(debutSemaine(new Date()));
    const jours = datesSemaine(lundiISO);
    const aujIdx = jours.indexOf(iso);
    var _mids = []; state.d.taches.forEach(function (t) { _mids = _mids.concat(t.membreIds || (t.membreId ? [t.membreId] : [])); }); const membreIds = [...new Set(_mids)];
    const membres = membreIds.map(mid => state.d.membres.find(m => m.id === mid)).filter(Boolean);

    /* --- Tableau hebdomadaire : tâches × jours, cellules divisées par personne --- */
    let tableau = `<div class="tableau-hebdo-wrap"><table class="tableau-hebdo">
        <thead><tr>
            <th class="th-tache">Tâche</th>
            ${JOURS_COURTS.map((j, i) => `<th class="${i === aujIdx ? "auj" : ""}">${j} ${jours[i].slice(8)}${i === aujIdx ? " •" : ""}</th>`).join("")}
            <th>Total ⭐/pers.</th>
        </tr></thead><tbody>`;

    state.d.taches.forEach(t => {
        const tMembres = (t.membreIds || (t.membreId ? [t.membreId] : []));
        const actif = jours.some((j, i) => tacheActiveAujourdhui(t, j));
        tableau += `<tr class="${actif ? "" : "inactif"}">
            <td class="td-tache">
                <strong>${esc(t.titre)}</strong>
                <span class="hint">${"⭐".repeat(t.etoiles || 1)}</span>
                <span class="tache-actions">
                    <button class="btn btn-mini" onclick="modaleTache('${t.id}')">✏️</button>
                    <button class="btn btn-mini btn-danger" onclick="supprimerTache('${t.id}')">🗑️</button>
                </span>
            </td>`;
        jours.forEach((j, idx) => {
            const prevu = tacheActiveAujourdhui(t, j);
            const cellules = tMembres.map(mid => {
                const m = state.d.membres.find(x => x.id === mid) || { nom: "?", couleur: "#7f8c8d" };
                const faite = tacheFaitePour(t, j, mid);
                return `<button class="cell-etoile ${faite ? "faite" : ""} ${prevu ? "prevu" : ""}"
                    style="border-bottom-color:${esc(m.couleur)}"
                    title="${esc(m.nom)} — ${faite ? "fait ✓ (cliquer pour décocher)" : "à faire (cliquer pour cocher)"}"
                    ${idx > aujIdx ? "disabled" : ""}
                    onclick="basculerTachePour('${t.id}','${mid}','${j}')">${faite ? "⭐" : "·"}</button>`;
            }).join("");
            tableau += `<td class="td-jour ${idx === aujIdx ? "auj" : ""}">${prevu || tMembres.some(mid => tacheFaitePour(t, j, mid)) ? cellules : '<span class="hint">—</span>'}</td>`;
        });
        /* Total de la semaine pour chaque personne sur cette tâche */
        const totaux = tMembres.map(mid => {
            const n = jours.filter(j => tacheFaitePour(t, j, mid)).length;
            const m = state.d.membres.find(x => x.id === mid) || { couleur: "#7f8c8d" };
            return `<span class="total-pers" style="color:${esc(m.couleur)}">${n * (t.etoiles || 1)}</span>`;
        }).join("");
        tableau += `<td class="td-total">${totaux}</td></tr>`;
    });

    /* Ligne des totaux par enfant */
    tableau += `</tbody><tfoot><tr><td class="td-tache"><strong>🌟 Total de la semaine</strong></td>`;
    membres.forEach(m => {
        tableau += `<td class="td-total-semaine" style="border-bottom-color:${esc(m.couleur)}">${etoilesSemaine(m.id, lundiISO)} ⭐<br><small class="hint">${esc(m.nom)}</small></td>`;
    });
    tableau += `<td></td></tr></tfoot></table></div>`;

    $("#taches-liste").innerHTML = tableau
        ? tableau + `<p class="hint">Cliquez sur une case pour cocher/décocher. Chaque pastille colorée = une personne. Les jours futurs sont verrouillés. Total ⭐ calculé par personne pour la semaine.</p>`
        : `<p class="hint">Aucune tâche. Créez-en avec ➕ Nouvelle tâche !</p>`;

    /* --- Objectifs : total de la semaine calculé depuis les tâches --- */
    nettoyerObjectifsPerimes();
    $("#objectifs-liste").innerHTML = state.d.objectifs.length ? state.d.objectifs.map(o => {
        const m = state.d.membres.find(x => x.id === o.membreId) || { nom: "?", couleur: "#7f8c8d" };
        const etoilesTaches = etoilesSemaine(o.membreId, lundiISO);
        const bonus = o.bonusEtoiles || 0;
        const etoiles = etoilesTaches + bonus;
        const pct = Math.min(100, Math.round(etoiles / (o.cible || 1) * 100));
        const rec = o.recurrence === "hebdo" ? "🔁 chaque semaine" : "";
        const affiche = "⭐".repeat(Math.min(etoiles, 10)) + (etoiles > 10 ? " +" + (etoiles - 10) : "");
        return `<div class="card" style="margin-bottom:10px;${etoiles >= o.cible ? " border-color: var(--vert);" : ""}">
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <span class="mini-dot" style="background:${esc(m.couleur)}"></span>
                <strong style="flex:1">🎯 ${esc(o.titre)} <small class="hint">${esc(m.nom)} ${rec}</small></strong>
                <button class="btn btn-mini" onclick="ajouterBonus('${o.id}', 1)" title="Bonus manuel">⭐+</button>
                <button class="btn btn-mini" onclick="ajouterBonus('${o.id}', -1)" title="Retirer un bonus">−</button>
                <button class="btn btn-mini" onclick="modaleObjectif('${o.id}')">✏️</button>
                <button class="btn btn-mini btn-danger" onclick="supprimerObjectif('${o.id}')">🗑️</button>
            </div>
            <div class="progress-bar"><div style="width:${pct}%"></div></div>
            <span class="hint">${etoiles}/${o.cible} ⭐ (${etoilesTaches} tâches + ${bonus} bonus) · Récompense : ${esc(o.recompense || "—")} ${etoiles >= o.cible ? "· 🎁 atteint !" : ""}</span>
            <div class="etoiles-grosse">${affiche || "—"}</div>
        </div>`;
    }).join("") : `<p class="hint">Créez un objectif : ex. « 20 ⭐ cette semaine → sortie piscine » pour un enfant.</p>`;
}

/* Bonus d'étoiles manuel (en plus des tâches) */
function ajouterBonus(objectifId, n) {
    if (!editionPermise()) return refuserEdition();
    const o = state.d.objectifs.find(x => x.id === objectifId);
    o.bonusEtoiles = Math.max(0, (o.bonusEtoiles || 0) + n);
    save(); rendreTaches(); rendreAujourdhui();
}

const RECURRENCES = [
    { id: "", label: "Ponctuelle (une seule fois)" },
    { id: "quotidienne", label: "Chaque jour" },
    { id: "1", label: "Chaque lundi" }, { id: "2", label: "Chaque mardi" },
    { id: "3", label: "Chaque mercredi" }, { id: "4", label: "Chaque jeudi" },
    { id: "5", label: "Chaque vendredi" }, { id: "6", label: "Chaque samedi" },
    { id: "0", label: "Chaque dimanche" }
];

function tacheActiveAujourdhui(t, iso) {
    if (!t.recurrence) return !t.date || t.date === iso;
    if (t.recurrence === "quotidienne") return true;
    const jourSemaine = String(parseISO(iso).getDay());
    return t.recurrence === jourSemaine;
}

function tacheFaitePour(t, iso, membreId) {
    if (membreId) {
        var v = t.faitPar && t.faitPar[membreId] && t.faitPar[membreId][iso];
        return v === true;   /* "refus" (croix) n'est PAS fait */
    }
    return t.faitLe === iso;
}

/* La tâche est-elle tranchée par une croix (non fait) pour ce membre/jour ? */
function tacheRefuseePour(t, iso, membreId) {
    return !!(t.faitPar && t.faitPar[membreId] && t.faitPar[membreId][iso] === "refus");
}

/* Tous les membres concernés ont-ils coché ce jour-là ? */
function tacheComplete(t, iso) {
    const membres = t.membreIds || (t.membreId ? [t.membreId] : []);
    if (!membres.length) return t.faitLe === iso;
    return membres.every(mid => tacheFaitePour(t, iso, mid));
}

function modaleTache(id) {
    const t = id ? state.d.taches.find(x => x.id === id) : null;
    const membresCoches = t ? (t.membreIds || (t.membreId ? [t.membreId] : [])) : [];
    ouvrirModale(`
        <h2>${t ? "Modifier" : "Nouvelle"} tâche</h2>
        <label>Titre</label><input class="input" id="mt-titre" value="${t ? esc(t.titre) : ""}">
        <label>Pour (plusieurs choix possibles)</label>
        <div id="mt-membres" class="membres-checks">
            ${state.d.membres.map(m => `<label class="switch"><input type="checkbox" value="${m.id}" ${membresCoches.includes(m.id) ? "checked" : ""}><span>${esc(m.nom)}</span></label>`).join("")}
        </div>
        <label>⭐ Étoiles selon la complexité (1 = facile … 5 = super)</label><select class="input" id="mt-etoiles">
            ${[1,2,3,4,5].map(n => `<option value="${n}" ${t && (t.etoiles || 1) === n ? "selected" : ""}>${"⭐".repeat(n)} (${n} étoile${n > 1 ? "s" : ""})</option>`).join("")}
        </select>
        <label>Répétition</label><select class="input" id="mt-rec">
            ${RECURRENCES.map(r => `<option value="${r.id}" ${t && (t.recurrence || "") === r.id ? "selected" : ""}>${r.label}</option>`).join("")}
        </select>
        <label>Date (si ponctuelle)</label><input class="input" type="date" id="mt-date" value="${t && t.date ? t.date : ""}">
        <div class="modal-actions">
            <button class="btn" onclick="fermerModale()">Annuler</button>
            <button class="btn btn-primary" onclick="validerTache('${t ? t.id : ""}')">Enregistrer</button>
        </div>`);
}

function validerTache(id) {
    const titre = $("#mt-titre").value.trim();
    if (!titre) return toast("Donnez un titre.", true);
    const membreIds = [...document.querySelectorAll("#mt-membres input:checked")].map(i => i.value);
    if (!membreIds.length) return toast("Sélectionnez au moins une personne.", true);
    const t = {
        titre,
        membreIds,
        membreId: membreIds[0],
        points: 0,
        recurrence: $("#mt-rec").value || null,
        etoiles: +$("#mt-etoiles").value || 1,
        date: $("#mt-rec").value ? null : ($("#mt-date").value || null)
    };
    if (id) Object.assign(state.d.taches.find(x => x.id === id), t, { fait: false, faitLe: null });
    else state.d.taches.push({ id: uid(), fait: false, faitLe: null, ...t });
    save(); fermerModale(); rendreTaches(); rendreAujourdhui(); toast("Tâche enregistrée ✓");
}

/* Coche/décoche une tâche pour un membre à une DATE donnée (défaut = aujourd'hui).
   Structure : t.faitPar[membreId] = { "2026-10-28": true }  */
/* Marquer « non fait » (croix) : la tâche est tranchée mais ne donne
   AUCUNE étoile — refus de l'enfant ou tâche impossible. */
function refuserTachePour(id, membreId, dateISO) {
    if (!editionPermise()) return refuserEdition();
    const t = state.d.taches.find(x => x.id === id);
    const iso = dateISO || aujourdhuiISO();
    const m = state.d.membres.find(x => x.id === membreId);
    if (!m || !t) return;
    if (!t.faitPar) t.faitPar = {};
    if (!t.faitPar[membreId]) t.faitPar[membreId] = {};
    if (t.faitPar[membreId][iso] === "refus") {
        delete t.faitPar[membreId][iso];   /* recliquer la croix = annuler */
        toast("Croix retirée pour " + m.nom);
    } else {
        t.faitPar[membreId][iso] = "refus";
        toast("✗ " + m.nom + " : « " + t.titre + " » non fait (pas d'étoile)");
    }
    save(); rendreTaches(); rendreAujourdhui();
}

function basculerTachePour(id, membreId, dateISO) {
    if (!editionPermise()) return refuserEdition();
    const t = state.d.taches.find(x => x.id === id);
    const iso = dateISO || aujourdhuiISO();
    const m = state.d.membres.find(x => x.id === membreId);
    if (!m || !t) return;
    if (!t.faitPar) t.faitPar = {};
    if (!t.faitPar[membreId]) t.faitPar[membreId] = {};
    const etoiles = t.etoiles || 1;
    if (t.faitPar[membreId][iso]) {
        delete t.faitPar[membreId][iso];
        toast("Décoché pour " + m.nom);
    } else {
        t.faitPar[membreId][iso] = true;
        toast(`${"⭐".repeat(Math.min(etoiles, 5))} ${m.nom} : ${esc(t.titre)} validé !`);
        carillonEtoile();
    }
    save(); rendreTaches(); rendreAujourdhui();
}

/* Total d'étoiles d'un membre pour une semaine (calculé depuis toutes les tâches) */
function etoilesSemaine(membreId, lundiISO) {
    let total = 0;
    state.d.taches.forEach(t => {
        const jours = (t.faitPar && t.faitPar[membreId]) || {};
        for (let i = 0; i < 7; i++) {
            const d = parseISO(lundiISO); d.setDate(d.getDate() + i);
            if (jours[isoDate(d)]) total += (t.etoiles || 1);
        }
    });
    return total;
}

/* Toutes les dates d'une semaine (lundi→dimanche) */
function datesSemaine(lundiISO) {
    return [...Array(7)].map((_, i) => {
        const d = parseISO(lundiISO); d.setDate(d.getDate() + i);
        return isoDate(d);
    });
}

/* Compat ancienne signature */
function basculerTache(id) { basculerTachePour(id, (state.d.taches.find(x => x.id === id).membreIds || [])[0]); }

function terminerTache(id) { basculerTache(id); }
function supprimerTache(id) { state.d.taches = state.d.taches.filter(t => t.id !== id); save(); rendreTaches(); rendreAujourdhui(); }

/* Semaine ISO (lundi de la semaine en cours) — clé de réinitialisation hebdo */
function cleSemaine() {
    const d = debutSemaine(new Date());
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function nettoyerObjectifsPerimes() {
    const cle = cleSemaine();
    let change = false;
    state.d.objectifs.forEach(o => {
        if (o.semaine && o.semaine !== cle && o.recurrence === "hebdo") {
            o.semaine = cle;
            o.etoiles = 0;
            o.fait = false;
            change = true;
        }
    });
    if (change) save();
}

function modaleObjectif(id) {
    const o = id ? state.d.objectifs.find(x => x.id === id) : null;
    ouvrirModale(`
        <h2>${o ? "Modifier" : "Nouvel"} objectif</h2>
        <label>Thème (ex. Ranger ses affaires, être propre)</label><input class="input" id="mo-titre" value="${o ? esc(o.titre) : ""}">
        <label>Pour</label><select class="input" id="mo-membre">${state.d.membres.map(m => `<option value="${m.id}" ${o && o.membreId === m.id ? "selected" : ""}>${esc(m.nom)}</option>`).join("")}</select>
        <label>⭐ Objectif d'étoiles pour la semaine</label><input class="input" type="number" id="mo-cible" value="${o ? o.cible : 10}" min="1">
        <label>Récompense</label><input class="input" id="mo-recompense" value="${o ? esc(o.recompense || "") : ""}" placeholder="ex. sortie piscine, film, dessert…">
        <label>Répétition</label><select class="input" id="mo-rec">
            <option value="hebdo" ${(!o || o.recurrence === "hebdo") ? "selected" : ""}>Chaque semaine (les étoiles repartent à zéro)</option>
            <option value="" ${o && !o.recurrence ? "selected" : ""}>Ponctuel (jusqu'à récompense attribuée)</option>
        </select>
        <div class="modal-actions">
            <button class="btn" onclick="fermerModale()">Annuler</button>
            <button class="btn btn-primary" onclick="validerObjectifForm('${o ? o.id : ""}')">Enregistrer</button>
        </div>`);
}

function validerObjectifForm(id) {
    const titre = $("#mo-titre").value.trim();
    if (!titre) return toast("Donnez un titre.", true);
    const o = {
        titre,
        membreId: $("#mo-membre").value,
        cible: +$("#mo-cible").value || 10,
        recompense: $("#mo-recompense").value.trim(),
        recurrence: $("#mo-rec").value || null
    };
    if (id) {
        const existant = state.d.objectifs.find(x => x.id === id);
        Object.assign(existant, o);
    } else {
        state.d.objectifs.push({ id: uid(), fait: false, etoiles: 0, semaine: cleSemaine(), ...o });
    }
    save(); fermerModale(); rendreTaches(); toast("Objectif enregistré ✓");
}

/* Ajouter/retirer des étoiles sur un objectif (bouton + / − côté tableau) */

function supprimerObjectif(id) { state.d.objectifs = state.d.objectifs.filter(o => o.id !== id); save(); rendreTaches(); }

/* ============ Listes (courses) ============ */
function initListes() { elSafe("#btn-add-liste").onclick = () => modaleListe(null); }

function rendreListes() {
    /* Structure "Magasins" : les plats choisis cette semaine dans une section
       "Plats" (d'où viennent les besoins), puis une carte par magasin. */
    const listeCourses = state.d.listes.find(l => l.id === "l1") || state.d.listes[0];
    const plats = listeCourses ? listeCourses.items.filter(i => i.plat) : [];
    const autresListes = state.d.listes.filter(l => l !== listeCourses);

    const ligneItem = (l, it) => `
        <div class="liste-item ${it.fait ? "done" : ""}">
            <input type="checkbox" ${it.fait ? "checked" : ""} onchange="basculerItem('${l.id}','${it.id}')">
            <span style="flex:1">${esc(it.texte)}</span>
            <button class="btn btn-mini btn-danger" onclick="supprimerItem('${l.id}','${it.id}')">🗑️</button>
        </div>`;

    let html = "";

    /* Section Plats (les repas choisis) */
    html += `<section class="card">
        <h2 style="display:flex;gap:8px;align-items:center">🍽️ Plats
            <span class="hint">repas prévus cette semaine</span>
        </h2>
        ${plats.length ? plats.map(it => `
            <div class="liste-item ${it.fait ? "done" : ""}">
                <input type="checkbox" ${it.fait ? "checked" : ""} onchange="basculerItem('${listeCourses.id}','${it.id}')">
                <span style="flex:1">${esc(it.texte)}</span>
                <button class="btn btn-mini btn-danger" onclick="supprimerItem('${listeCourses.id}','${it.id}')">🗑️</button>
            </div>`).join("")
        : `<p class="hint">Aucun plat — ajoutez les repas depuis l'onglet Repas (bouton 🛒).</p>`}
    </section>`;

    /* Cartes des magasins */
    html += state.d.listes.map(l => {
        if (l === listeCourses && l.items.some(i => i.plat)) {
            /* La liste Courses contient les plats : n'afficher que ses articles non-plat */
            const articles = l.items.filter(i => !i.plat);
            return `<section class="card">
                <h2 style="display:flex;gap:8px;align-items:center">🏬 ${esc(l.nom)}
                    <button class="btn btn-mini" style="margin-left:auto" onclick="modaleListe('${l.id}')">✏️</button>
                    <button class="btn btn-mini btn-danger" onclick="supprimerListe('${l.id}')">🗑️</button>
                </h2>
                <div>${articles.map(it => ligneItem(l, it)).join("") || `<p class="hint">Aucun article.</p>`}</div>
                <div class="panel-toolbar" style="margin-top:10px">
                    <input class="input" placeholder="Ajouter…" onkeydown="if(event.key==='Enter')ajouterItem('${l.id}',this)">
                    <button class="btn btn-mini" onclick="ajouterItem('${l.id}',this.previousElementSibling)">➕</button>
                </div>
            </section>`;
        }
        return `<section class="card">
            <h2 style="display:flex;gap:8px;align-items:center">🏬 ${esc(l.nom)}
                <button class="btn btn-mini" style="margin-left:auto" onclick="modaleListe('${l.id}')">✏️</button>
                <button class="btn btn-mini btn-danger" onclick="supprimerListe('${l.id}')">🗑️</button>
            </h2>
            <div>${l.items.map(it => ligneItem(l, it)).join("") || `<p class="hint">Aucun article.</p>`}</div>
            <div class="panel-toolbar" style="margin-top:10px">
                <input class="input" placeholder="Ajouter…" onkeydown="if(event.key==='Enter')ajouterItem('${l.id}',this)">
                <button class="btn btn-mini" onclick="ajouterItem('${l.id}',this.previousElementSibling)">➕</button>
            </div>
        </section>`;
    }).join("");

    $("#listes-container").innerHTML = html;
}

function modaleListe(id) {
    const l = id ? state.d.listes.find(x => x.id === id) : null;
    const nom = prompt(l ? "Nouveau nom de la liste :" : "Nom de la nouvelle liste :", l ? l.nom : "");
    if (nom === null) return;
    if (!nom.trim()) return toast("Nom vide.", true);
    if (l) l.nom = nom.trim(); else state.d.listes.push({ id: uid(), nom: nom.trim(), items: [] });
    save(); rendreListes();
}

function supprimerListe(id) { if (!confirm("Supprimer cette liste ?")) return; state.d.listes = state.d.listes.filter(l => l.id !== id); save(); rendreListes(); }
function ajouterItem(id, input) {
    if (!editionPermise()) return refuserEdition();
    const t = input.value.trim();
    if (!t) return;
    state.d.listes.find(l => l.id === id).items.push({ id: uid(), texte: t, fait: false });
    save(); rendreListes();
}
function basculerItem(lid, iid) {
    const it = state.d.listes.find(l => l.id === lid).items.find(i => i.id === iid);
    it.fait = !it.fait; save(); rendreListes();
}
function supprimerItem(lid, iid) {
    if (!editionPermise()) return refuserEdition();
    const l = state.d.listes.find(x => x.id === lid);
    l.items = l.items.filter(i => i.id !== iid); save(); rendreListes();
}

/* ============ Photos / album ============ */
async function initPhotos() {
    elSafe("#file-photos").onchange = e => {
        if (!editionPermise()) { e.target.value = ""; return refuserEdition(); }
        const files = [...e.target.files];
        let restant = files.length;
        files.forEach(f => {
            const fr = new FileReader();
            fr.onload = () => {
                state.d.photosUpload.push({ id: uid(), nom: f.name, data: fr.result });
                if (--restant === 0) { save(); rendrePhotos(); toast("Photos ajoutées ✓"); }
            };
            fr.readAsDataURL(f);
        });
        e.target.value = "";
    };
    elSafe("#btn-mode-cadre").onclick = () => {
        const urls = toutesPhotos();
        if (!urls.length) return toast("Ajoutez d'abord des photos.", true);
        cadre(urls, 0);
    };
    const selTiming = $("#cadre-timing");
    if (selTiming) {
        selTiming.value = String(state.d.reglages.cadreTiming || 8);
        selTiming.onchange = () => { state.d.reglages.cadreTiming = +selTiming.value; save(); toast("Timing : " + selTiming.value + " s ✓"); };
    }
    const chkDouble = $("#cadre-double");
    if (chkDouble) {
        chkDouble.checked = !!state.d.reglages.cadreDouble;
        chkDouble.onchange = () => { state.d.reglages.cadreDouble = chkDouble.checked; save(); };
    }
    const chkAlea = $("#cadre-aleatoire");
    if (chkAlea) {
        chkAlea.checked = !!state.d.reglages.cadreAleatoire;
        chkAlea.onchange = () => { state.d.reglages.cadreAleatoire = chkAlea.checked; save(); };
    }
}

function toutesPhotos() {
    const urls = state.d.photosUpload.map(p => p.data);
    if (!state.d.reglages.cadreAleatoire) return urls;
    /* Mélange aléatoire (Fisher-Yates) — l'ordre change à chaque lancement */
    for (let i = urls.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [urls[i], urls[j]] = [urls[j], urls[i]];
    }
    return urls;
}

/* Le résumé affiché à côté de la photo en mode double */
function cadreResumeHTML() {
    const dt = new Date(), iso = aujourdhuiISO();
    const annivs = annivPourDate(dt, dt.getFullYear());
    const p = platDuJour(iso);
    const taches = state.d.taches.filter(t => tacheActiveAujourdhui(t, iso) && !tacheFaitePour(t, iso)).length;
    let h = `<div class="cadre-resume">`;
    h += `<div class="cadre-horloge">${dt.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" })}</div>`;
    h += `<div class="cadre-date">${dt.toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })}</div>`;
    if (meteoDonnees) {
        const c = meteoDonnees.data.current;
        h += `<div class="cadre-meteo">${meteoIcon(c.weather_code)} ${Math.round(c.temperature_2m)}°C</div>`;
    }
    const evs = evenementsDuJour(iso).filter(e => !e.cloud || !e.titre.includes("calfam"));
    if (evs.length) {
        h += `<div class="cadre-sep">📋 Aujourd'hui</div>`;
        evs.slice(0, 6).forEach(e => h += `<div class="cadre-item">${evEmoji(e)} ${esc(e.titre.replace(" ·calfam", ""))}</div>`);
    }
    annivs.slice(0, 3).forEach(a => h += `<div class="cadre-item">🎂 ${esc(a.nom)}${a.age != null ? " (" + a.age + " ans)" : ""}</div>`);
    if (p) h += `<div class="cadre-item">🍽️ ${esc(p.nom)}</div>`;
    if (taches) h += `<div class="cadre-item">✅ ${taches} tâche(s) à faire</div>`;
    h += `</div>`;
    return h;
}

function cadre(urls, i) {
    const el = $("#cadre-full");
    const double = !!state.d.reglages.cadreDouble;
    const timing = (state.d.reglages.cadreTiming || 8) * 1000;
    el.classList.remove("hidden");
    el.className = double ? "cadre-full cadre-double" : "cadre-full";
    el.innerHTML = `<img id="cadre-img" alt="">` + (double ? cadreResumeHTML() : "");
    $("#cadre-img").src = urls[i];
    clearInterval(cadre._t);
    cadre._t = setInterval(() => {
        if (el.classList.contains("hidden")) { clearInterval(cadre._t); return; }
        i = (i + 1) % urls.length;
        $("#cadre-img").src = urls[i];
        const res = el.querySelector(".cadre-resume");
        if (res) res.outerHTML = cadreResumeHTML();
    }, timing);
    el.onclick = () => { el.classList.add("hidden"); clearInterval(cadre._t); el.innerHTML = '<img id="cadre-img" alt="">'; };
}

function rendrePhotos() {
    const grid = $("#photos-grid");
    grid.innerHTML = state.d.photosUpload.map(p =>
        `<div style="position:relative">
            <img src="${p.data}" alt="${esc(p.nom)}">
            <button class="btn btn-mini btn-danger" style="position:absolute;top:6px;right:6px" onclick="supprimerPhoto('${p.id}')">🗑️</button>
        </div>`).join("")
        ;
    // Détection auto du dossier Photos/ (noms connus via photos-manifest.json optionnel)
    fetch("Photos/photos-manifest.json").then(r => r.ok ? r.json() : null).then(liste => {
        if (!liste) return;
        grid.innerHTML = liste.map(f =>
            `<div style="position:relative"><img src="Photos/${encodeURIComponent(f)}" alt="${esc(f)}"></div>`).join("");
    }).catch(() => {});
}

function supprimerPhoto(id) { state.d.photosUpload = state.d.photosUpload.filter(p => p.id !== id); save(); rendrePhotos(); }

/* ============ Réglages / membres ============ */
function initReglages() {
    elSafe("#btn-add-membre").onclick = () => modaleMembre(null);
    elSafe("#opt-nuit").onchange = e => { state.d.reglages.sombre = e.target.checked; save(); appliquerSombre(); };
    const optSons = $("#opt-sons");
    if (optSons) {
        optSons.checked = sonsActifs();
        optSons.onchange = () => {
            basculerSons();
            if (!sonsActifs()) arreterAmbiance();
            toast("Sons " + (sonsActifs() ? "activés 🔔" : "désactivés"));
        };
    }
    const optRec = $("#opt-recompenses");
    if (optRec) {
        optRec.checked = state.d.reglages.recompenses !== false;
        optRec.onchange = () => {
            state.d.reglages.recompenses = optRec.checked;
            save();
            fullRefresh();
            toast(optRec.checked ? "⭐ Récompenses affichées" : "Récompenses masquées");
        };
    }
    const optMuralAuto = $("#opt-mural-auto");
    if (optMuralAuto) {
        optMuralAuto.checked = !!state.d.reglages.muralAuto;
        optMuralAuto.onchange = () => {
            state.d.reglages.muralAuto = optMuralAuto.checked;
            save();
            toast(optMuralAuto.checked ? "L'app démarrera en mode mural ✓" : "Démarrage normal");
        };
    }
    const selD = $("#opt-densite");
    if (selD) selD.onchange = e => { state.d.reglages.densite = e.target.value; save(); appliquerDensite(); };
    const selT = $("#opt-taille");
    if (selT) selT.onchange = e => { state.d.reglages.tailleTexte = e.target.value; save(); appliquerDensite(); toast("Taille du texte : " + e.target.value); };
    elSafe("#opt-veille").onchange = e => { state.d.reglages.veille = e.target.checked; save(); initKiosque(); };
    elSafe("#btn-export").onclick = exporter;
    elSafe("#file-import").onchange = e => { if (e.target.files[0]) importerJSON(e.target.files[0], false); e.target.value = ""; };
    elSafe("#file-import-calfam").onchange = e => { if (e.target.files[0]) importerJSON(e.target.files[0], true); e.target.value = ""; };
}

function appliquerSombre() {
    document.body.classList.toggle("sombre", !!state.d.reglages.sombre);
    $("#opt-nuit").checked = !!state.d.reglages.sombre;
    $("#opt-veille").checked = !!state.d.reglages.veille;
    appliquerDensite();
}

function appliquerDensite() {
    const d = state.d.reglages.densite || "normal";
    const valeurs = { trescompact: 0.65, compact: 0.8, normal: 1, espace: 1.2 };
    document.documentElement.style.setProperty("--den", valeurs[d] || 1);
    document.documentElement.setAttribute("data-den", d);
    const sel = $("#opt-densite");
    if (sel) sel.value = d;
    /* Taille du texte (indépendante de la densité) : petit / moyen / grand */
    const t = state.d.reglages.tailleTexte || "moyen";
    const tailles = { trespetit: "78%", petit: "87.5%", moyen: "100%", grand: "115%", tresgrand: "130%" };
    document.documentElement.style.fontSize = tailles[t] || "100%";
    const selT = $("#opt-taille");
    if (selT) selT.value = t;
}

function initKiosque() {
    clearTimeout(initKiosque._t);
    if (!state.d.reglages.veille) { document.body.classList.remove("kiosque"); return; }
    resetKiosque();
    ["click","touchstart","keydown"].forEach(ev => document.addEventListener(ev, resetKiosque, { passive: true }));
}

function resetKiosque() {
    /* Kiosque : tant qu'il y a activité, les onglets sont visibles.
       Après 5 min d'inactivité, ils se masquent — l'écran reste sur la vue
       courante, sans changer d'onglet. Toute interaction les ré-affiche. */
    document.body.classList.remove("kiosque");
    clearTimeout(initKiosque._t2);
    initKiosque._t2 = setTimeout(() => {
        document.body.classList.add("kiosque");
    }, 5 * 60 * 1000);
}

function rendreMembres() {
    $("#membres-liste").innerHTML = state.d.membres.map(m => `
        <div class="today-item">
            <span class="dot" style="background:${esc(m.couleur)}"></span>
            <span style="flex:1"><strong>${esc(m.nom)}</strong> · ${m.points || 0} pts</span>
            <button class="btn btn-mini" onclick="modaleMembre('${m.id}')">✏️</button>
            <button class="btn btn-mini btn-danger" onclick="supprimerMembre('${m.id}')">🗑️</button>
        </div>`).join("");
}

function modaleMembre(id) {
    const m = id ? state.d.membres.find(x => x.id === id) : null;
    ouvrirModale(`
        <h2>${m ? "Modifier" : "Nouveau"} membre</h2>
        <label>Nom</label><input class="input" id="mm-nom" value="${m ? esc(m.nom) : ""}">
        <label>Couleur</label><input class="input" type="color" id="mm-couleur" value="${m ? m.couleur : "#38bdf8"}" style="height:48px">
        <label>Points (récompenses)</label><input class="input" type="number" id="mm-points" value="${m ? m.points || 0 : 0}">
        <div class="modal-actions">
            <button class="btn" onclick="fermerModale()">Annuler</button>
            <button class="btn btn-primary" onclick="validerMembre('${m ? m.id : ""}')">Enregistrer</button>
        </div>`);
}

function validerMembre(id) {
    if (!editionPermise()) return refuserEdition();
    const nom = $("#mm-nom").value.trim();
    if (!nom) return toast("Donnez un nom.", true);
    if (id) Object.assign(state.d.membres.find(x => x.id === id), { nom, couleur: $("#mm-couleur").value, points: +$("#mm-points").value || 0 });
    else state.d.membres.push({ id: uid(), nom, couleur: $("#mm-couleur").value, points: +$("#mm-points").value || 0 });
    save(); fermerModale(); rendreMembres(); rendreAujourdhui(); toast("Membre enregistré ✓");
}

function supprimerMembre(id) {
    if (!editionPermise()) return refuserEdition();
    if (!confirm("Supprimer ce membre ?")) return;
    state.d.membres = state.d.membres.filter(m => m.id !== id);
    save(); rendreMembres();
}

/* ============ Export / import ============ */
function exporter() {
    const blob = new Blob([JSON.stringify(state.d, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ecalendar-famille-" + isoDate(new Date()) + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Export téléchargé 💿");
}

function importerJSON(file, modeCalfam) {
    const fr = new FileReader();
    fr.onload = () => {
        try {
            const src = JSON.parse(fr.result);
            if (modeCalfam) {
                importerCalfam(src);
            } else {
                if (!src.membres) throw new Error("Fichier non reconnu (attendu : export Edukisto Home).");
                state.d = Object.assign(donneesDefaut(), src);
                save();
                fullRefresh();
                toast("Données importées ✓");
            }
        } catch (e) {
            toast("Import échoué : " + e.message, true);
        }
    };
    fr.readAsText(file);
}

function importerCalfam(src) {
    let n = 0, erreurs = [];
    /* Chaque étape est isolée : un format inattendu n'empêche jamais
       les autres données d'être importées. */
    try {
        (src.anniversaires || []).forEach(a => {
            if (!state.d.anniversaires.find(x => x.nom === a.nom && x.jour === a.jour && x.mois === a.mois)) {
                state.d.anniversaires.push({ jour: a.jour, mois: a.mois, annee: a.annee || null, nom: a.nom, type: a.type || "naissance", note: a.note || "" });
                n++;
            }
        });
    } catch (e) { erreurs.push("anniversaires : " + e.message); }
    try {
        if (src.jours_feries) Object.keys(src.jours_feries).forEach(function (an) {
            state.d.jours_feries[an] = src.jours_feries[an];
        });
    } catch (e) { erreurs.push("fériés : " + e.message); }
    /* Vacances : calfam peut exporter un tableau plat OU un objet par
       année ({ "2026": [ {debut, fin, libelle}, … ] }) — on accepte les deux. */
    try {
        if (src.vacances) {
            var vacs = [];
            if (Array.isArray(src.vacances)) {
                vacs = src.vacances;
            } else if (typeof src.vacances === "object") {
                Object.keys(src.vacances).forEach(function (an) {
                    var liste = src.vacances[an];
                    if (Array.isArray(liste)) liste.forEach(function (v) { vacs.push(v); });
                    else if (liste && typeof liste === "object") vacs.push(liste);
                });
            }
            state.d.vacances_scolaires = vacs.map(function (v) {
                if (Array.isArray(v)) return v;
                return [v.debut, v.fin, v.libelle || "Vacances"];
            }).filter(function (v) { return v[0] && v[1]; });
            n += state.d.vacances_scolaires.length;
        }
    } catch (e) { erreurs.push("vacances : " + e.message); }
    try {
        (src.evenements || src.evenements_speciaux || []).forEach(e => {
            const date = e.date || (e.annee && e.jour ? `${e.annee}-${String(e.mois).padStart(2,"0")}-${String(e.jour).padStart(2,"0")}` : null);
            if (date) {
                state.d.evenements.push({ id: uid(), titre: e.libelle || e.nom || "Événement", type: "famille", debut: date, fin: null });
                n++;
            }
        });
    } catch (e) { erreurs.push("événements : " + e.message); }
    save();
    fullRefresh();
    var msg = `Import calfam ✓ (${n} élément(s) repris)`;
    if (erreurs.length) msg += " — sections ignorées : " + erreurs.join(" ; ");
    toast(msg);
}

function fullRefresh() {
    rendreAujourdhui(); rendreCalendrier(); rendreRepas(); rendreTaches(); rendreListes(); rendrePhotos(); rendreMembres(); appliquerSombre();
}

/* ============ Modale ============ */
function ouvrirModale(html) {
    $("#modal-content").innerHTML = html;
    $("#modal").classList.remove("hidden");
}
function fermerModale() { $("#modal").classList.add("hidden"); }
document.addEventListener("click", e => {
    if (e.target === $("#modal")) fermerModale();
    /* Le mode mural ne s'arrête que par son bouton ✕ ou Échap (plein écran) */
});

/* ============ Synchronisation Cloud (cal-sync · Cloudflare D1) ============ */
function initSync() {
    const btnCfg = $("#btn-save-config");
    if (btnCfg) btnCfg.onclick = activerSauvegarde;
    const btnEdit = $("#btn-save-config-edit");
    if (btnEdit) btnEdit.onclick = () => {
        $("#sync-actions").style.display = "none";
        const champs = $("#save-nom").parentElement;
        if (champs) champs.style.display = "flex";
    };
    const btnSave = $("#btn-cloud-save");
    if (btnSave) btnSave.onclick = sauvegarderCloud;
    const btnRestore = $("#btn-cloud-restore");
    if (btnRestore) btnRestore.onclick = restaurerCloud;
    majStatutSync();
}

/* Active la sauvegarde en ligne : nom de famille + mot de passe (seule info client) */
function activerSauvegarde() {
    const nom = ($("#save-nom").value || "").trim() || "famille";
    const mdp = ($("#save-mdp").value || "").trim();
    if (mdp.length < 4) return toast("Choisissez un mot de passe de sauvegarde (au moins 4 caractères).", true);
    syncConfigurerMotDePasseEtNom(mdp, nom);
    toast("Sauvegarde en ligne activée ✓ — pensez à cliquer « Sauvegarder maintenant »");
    majStatutSync();
}

function validerSyncConfig() {
    const cfg = { url: $("#cfg-url").value.trim().replace(/\/+$/, ""), jeton: $("#cfg-jeton").value.trim() };
    if (!cfg.url || !cfg.jeton) return toast("Remplissez les 2 champs.", true);
    syncSauverConfig("ecal", cfg);
    fermerModale();
    cloudPull(true);
}

async function cloudPull(manuel) {
    const cfg = syncChargerConfig("ecal");
    if (!cfg || !cfg.url) { if (manuel) toast("Configurez d'abord le Cloud (Réglages).", true); return; }
    try {
        const [calfam, repas] = await Promise.all([
            syncLire("ecal", "calfam").catch(() => null),
            syncLire("ecal", "repas").catch(() => null)
        ]);
        if (calfam && calfam.donnees) state.cloud.calfam = calfam;
        if (repas && repas.donnees) state.cloud.repas = repas;
        state.cloudCharge = !!(calfam || repas);
        if (manuel) {
            toast(calfam || repas ? "Synchronisé ☁️ ✓" : "Rien à lire — publiez d'abord depuis calfam / repas.", !(calfam || repas));
        }
        majStatutSync();
        fullRefresh();
    } catch (e) {
        if (manuel) toast("Sync échouée : " + e.message, true);
    }
}

function cloudBoucle() {
    cloudPull(false);
    refreshICS();
    setInterval(() => { cloudPull(false); refreshICS(); }, 5 * 60 * 1000);
    /* Sync live : vérifier les modifications d'autres appareils toutes les 2 min */
    setInterval(async () => {
        if (!syncMotDePasseConfigure()) return;
        try {
            const plusFraiches = await syncAutoLire();
            if (plusFraiches) {
                /* Ne notifier que si les données changent réellement
                   (compare les listes clés) — pas de toast récurrent vide */
                const sig = (d) => JSON.stringify([(d.evenements||[]).length, (d.anniversaires||[]).length, (d.taches||[]).length, d.planRepas ? Object.keys(d.planRepas).length : 0, (d.plats||[]).length]);
                const change = sig(plusFraiches) !== sig(state.d);
                state.d = Object.assign(donneesDefaut(), plusFraiches);
                save();
                fullRefresh();
                if (change) toast("🔄 Synchronisé avec un autre appareil");
            }
        } catch (e) { /* silencieux */ }
    }, 2 * 60 * 1000);
}

/* ===== Sauvegarde complète de l'app dans le Cloud (famille_sync, ligne "ecal") ===== */
async function sauvegarderCloud() {
    try {
        await syncPublier("ecal", "ecal", donneesPourCloud());
        state.d.derniereSauvegarde = new Date().toISOString();
        save();
        toast("💾 Sauvegarde envoyée dans le Cloud ✓ (texte et réglages — les photos/MP3 restent sur cet appareil)");
        majStatutSync();
    } catch (e) {
        toast("Sauvegarde échouée : " + e.message, true);
    }
}

async function restaurerCloud() {
    try {
        const c = await syncLire("ecal", "ecal");
        if (!c || !c.donnees) return toast("Aucune sauvegarde trouvée pour ce mot de passe. Vérifiez que le mot de passe est identique à celui de l'appareil qui a sauvegardé.", true);
        if (!c.donnees.anniversaires && !c.donnees.evenements) return toast("La sauvegarde trouvée est vide ou trop ancienne — utilisez le même mot de passe que l'appareil principal.", true);
        if (!confirm("Restaurer toutes les données depuis le Cloud ? Les données locales actuelles seront remplacées.")) return;
        /* Restaurer en préservant les photos et MP3 locaux (non synchronisés) */
        var photosLocales = state.d.photosUpload, musiquesLocales = state.d.musiques;
        var icsLocales = state.d.icsSources;
        state.d = Object.assign(donneesDefaut(), c.donnees);
        state.d.photosUpload = (photosLocales && photosLocales.length) ? photosLocales : (state.d.photosUpload || []);
        /* Agendas Google : garder les locaux si le cloud n'en a pas */
        if (icsLocales && icsLocales.length && !(state.d.icsSources && state.d.icsSources.length)) {
            state.d.icsSources = icsLocales;
        }
        state.d.musiques = (musiquesLocales && musiquesLocales.length) ? musiquesLocales : (state.d.musiques || []);
        save();
        fullRefresh();
        toast("📥 Données restaurées depuis le Cloud ✓");
    } catch (e) {
        toast("Restauration échouée : " + e.message, true);
    }
}

function majStatutSync() {
    const el = $("#sync-statut");
    if (!el) return;
    const configure = syncMotDePasseConfigure();
    const actions = $("#sync-actions");
    const champs = $("#save-nom") ? $("#save-nom").parentElement : null;
    if (configure) {
        if (actions) actions.style.display = "flex";
        if (champs) champs.style.display = "none";
        el.innerHTML = `<p class="hint">✅ Sauvegarde en ligne active${state.d.derniereSauvegarde ? " · dernière sauvegarde : " + new Date(state.d.derniereSauvegarde).toLocaleString("fr-BE") : ""}</p>`;
    } else {
        if (actions) actions.style.display = "none";
        if (champs) champs.style.display = "flex";
        el.innerHTML = "";
    }
}

/* ============ Horloge ============ */
let horlogeTimer = null;
function initHorloge() {
    mettreAJourHorloge();
    clearInterval(horlogeTimer);
    horlogeTimer = setInterval(mettreAJourHorloge, 1000);
}
function mettreAJourHorloge() {
    const d = new Date();
    const elH = $("#horloge-heure"), elD = $("#horloge-date");
    if (elH) {
        elH.textContent = d.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });
        elD.textContent = d.toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }
    /* Horloge mini d'en-tête : visible partout sauf sur l'accueil
       (où la grande horloge est déjà affichée) */
    const mini = $("#horloge-mini");
    if (mini) {
        const vueActive = document.querySelector("#main-tabs .tab.active");
        const surAccueil = vueActive && vueActive.dataset.view === "aujourdhui";
        mini.style.display = surAccueil ? "none" : "inline-block";
        mini.textContent = d.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });
        mini.title = d.toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" });
    }
}

/* ============ Météo ============ */
let meteoDonnees = null;

async function initMeteo() {
    elSafe("#btn-meteo-ville").onclick = changerVilleMeteo;
    elSafe("#btn-meteo-refresh").onclick = () => chargerMeteo(true);
    await chargerMeteo(false);
    setInterval(() => chargerMeteo(false), 30 * 60 * 1000);
}

async function chargerMeteo(force) {
    try {
        meteoDonnees = await meteoObtenir(force);
        const v = $("#meteo-ville-actuelle");
        if (v) v.textContent = "📍 " + meteoDonnees.ville.nom;
    } catch (e) {
        console.warn("Météo indisponible :", e);
    }
    afficherMeteoCondensee();
    afficherMeteoComplete();
    rendreCalendrier();
}

async function changerVilleMeteo() {
    const nom = $("#meteo-ville").value.trim();
    if (!nom) return toast("Entrez un nom de ville.", true);
    try {
        const v = await meteoGeocoder(nom);
        meteoSauverVille(v);
        $("#meteo-ville").value = "";
        toast("Ville : " + v.nom + " ✓");
        chargerMeteo(true);
    } catch (e) {
        toast("Ville introuvable : " + e.message, true);
    }
}

function meteoJour(iso) {
    if (!meteoDonnees) return null;
    const i = meteoDonnees.data.daily.time.indexOf(iso);
    if (i < 0) return null;
    return {
        code: meteoDonnees.data.daily.weather_code[i],
        max: meteoDonnees.data.daily.temperature_2m_max[i],
        min: meteoDonnees.data.daily.temperature_2m_min[i]
    };
}

function afficherMeteoCondensee() {
    const el = $("#meteo-condense");
    if (!el) return;
    if (!meteoDonnees) { el.innerHTML = `<p class="hint">Météo indisponible (hors-ligne ?)</p>`; return; }
    const c = meteoDonnees.data.current;
    const auj = meteoJour(aujourdhuiISO());
    el.innerHTML = `
        <div class="meteo-line">
            <span class="meteo-grosse">${meteoIcon(c.weather_code)} ${Math.round(c.temperature_2m)}°C</span>
            <span class="hint">${meteoLibelle(c.weather_code)} · ressenti ${Math.round(c.apparent_temperature)}°</span>
            ${auj ? `<span class="hint">↑ ${Math.round(auj.max)}° · ↓ ${Math.round(auj.min)}°</span>` : ""}
            <span class="hint">💧 ${c.relative_humidity_2m}%</span>
            <span class="hint">💨 ${Math.round(c.wind_speed_10m)} km/h</span>
            <span class="hint meteo-ville">📍 ${esc(meteoDonnees.ville.nom)}</span>
        </div>`;
}

function afficherMeteoComplete() {
    const el = $("#meteo-actuelle");
    if (!el || !meteoDonnees) return;
    const c = meteoDonnees.data.current;
    const d = meteoDonnees.data.daily;
    const fleche = VENTS_FLECHE[Math.round(((c.wind_direction_10m % 360) / 45)) % 8];
    el.innerHTML = `
        <section class="card meteo-hero">
            <div class="meto-grosse">${meteoIcon(c.weather_code)}</div>
            <div>
                <div class="meteo-grosse">${Math.round(c.temperature_2m)}°C</div>
                <div class="hint">${meteoLibelle(c.weather_code)} · ressenti ${Math.round(c.apparent_temperature)}°</div>
                <div class="hint">📍 ${esc(meteoDonnees.ville.nom)}</div>
            </div>
            <div class="meteo-stats">
                <div>💧 Humidité : <b>${c.relative_humidity_2m}%</b></div>
                <div>💨 Vent : <b>${Math.round(c.wind_speed_10m)} km/h ${fleche}</b></div>
                <div>🌧️ Précip. : <b>${c.precipitation || 0} mm</b></div>
                <div>☀️ UV max : <b>${d.uv_index_max[0] || "—"}</b></div>
                <div>🌅 Lever : <b>${(d.sunrise[0] || "").slice(11)}</b> · 🌇 Coucher : <b>${(d.sunset[0] || "").slice(11)}</b></div>
            </div>
        </section>`;

    const jours = $("#meteo-jours");
    if (jours) {
        let j = "";
        for (let i = 0; i < d.time.length; i++) {
            j += `<div class="today-item meteo-jour" onclick="modaleJourMeteo(${i})" style="cursor:pointer">
                <span style="min-width:90px">${i === 0 ? "Aujourd'hui" : new Date(d.time[i]).toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "numeric" })}</span>
                <span class="meteo-grosse" style="min-width:50px">${meteoIcon(d.weather_code[i])}</span>
                <span class="hint" style="flex:1">${meteoLibelle(d.weather_code[i])}</span>
                <span><b>${Math.round(d.temperature_2m_max[i])}°</b> / <span class="hint">${Math.round(d.temperature_2m_min[i])}°</span></span>
                <span class="hint" style="min-width:110px">🌧️ ${d.precipitation_probability_max[i] || 0}%</span>
                <span class="hint">ℹ️</span>
            </div>`;
        }
        jours.innerHTML = j;
    }

    const horaire = $("#meteo-horaire");
    if (horaire) {
        const maintenant = new Date();
        let h = "";
        let premier = meteoDonnees.data.hourly.time.findIndex(t => new Date(t) > maintenant);
        if (premier < 0) premier = 0;
        for (let i = premier; i < Math.min(premier + 24, meteoDonnees.data.hourly.time.length); i++) {
            const dt = new Date(meteoDonnees.data.hourly.time[i]);
            h += `<div class="meteo-h-item">
                <div class="hint">${dt.getHours()}h</div>
                <div class="meteo-grosse">${meteoIcon(meteoDonnees.data.hourly.weather_code[i])}</div>
                <div><b>${Math.round(meteoDonnees.data.hourly.temperature_2m[i])}°</b></div>
                <div class="hint">🌧️ ${meteoDonnees.data.hourly.precipitation_probability[i] || 0}%</div>
            </div>`;
        }
        horaire.innerHTML = `<div class="meteo-horaire">${h}</div>`;
    }
}

/* Détail météo d'un jour (modale) */
function modaleJourMeteo(i) {
    if (!meteoDonnees) return;
    const d = meteoDonnees.data.daily;
    const h = meteoDonnees.data.hourly;
    const date = new Date(d.time[i]);
    const iso = d.time[i];

    /* Heures du jour concerné (l'API fournit les heures en séquence continue) */
    const heures = [];
    for (let k = 0; k < h.time.length; k++) {
        if (h.time[k].startsWith(iso)) heures.push(k);
    }
    const pas = heures.length > 12 ? Math.ceil(heures.length / 12) : 1;
    let detailHeures = "";
    for (let k = 0; k < heures.length; k += pas) {
        const idx = heures[k];
        const hh = h.time[idx].slice(11, 16);
        detailHeures += `<div class="meteo-h-item">
            <div class="hint">${hh}</div>
            <div class="meteo-grosse">${meteoIcon(h.weather_code[idx])}</div>
            <div><b>${Math.round(h.temperature_2m[idx])}°</b></div>
            <div class="hint">🌧️ ${h.precipitation_probability[idx] || 0}%</div>
            <div class="hint">💨 ${Math.round(h.wind_speed_10m[idx])}</div>
        </div>`;
    }

    const fleche = VENTS_FLECHE[Math.round(((meteoDonnees.data.current.wind_direction_10m % 360) / 45)) % 8];
    ouvrirModale(`
        <h2>${meteoIcon(d.weather_code[i])} ${date.toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })}</h2>
        <div class="meteo-hero" style="margin-bottom:12px">
            <div style="font-size:2.6em">${meteoIcon(d.weather_code[i])}</div>
            <div>
                <div class="meteo-grosse">${Math.round(d.temperature_2m_max[i])}° / ${Math.round(d.temperature_2m_min[i])}°</div>
                <div class="hint">${meteoLibelle(d.weather_code[i])}</div>
            </div>
            <div class="meteo-stats">
                <div>🌧️ Pluie : <b>${d.precipitation_probability_max[i] || 0}%</b> (${d.precipitation_sum[i] || 0} mm)</div>
                <div>💨 Vent max : <b>${Math.round(d.wind_speed_10m_max[i] || 0)} km/h</b></div>
                <div>☀️ UV max : <b>${d.uv_index_max[i] || "—"}</b></div>
                <div>🌅 ${esc((d.sunrise[i] || "").slice(11))} · 🌇 ${esc((d.sunset[i] || "").slice(11))}</div>
            </div>
        </div>
        <h3 class="hint">Heure par heure</h3>
        <div class="meteo-horaire">${detailHeures}</div>
        <div class="modal-actions">
            <button class="btn" onclick="fermerModale()">Fermer</button>
        </div>`);
}

/* ============ Mode tablette murale ============ */
const MURAL_VUES_POSSIBLES = [
    { id: "aujourdhui", label: "☀️ Aujourd'hui" },
    { id: "calendrier", label: "📅 Calendrier" },
    { id: "repas", label: "🍽️ Repas" },
    { id: "meteo", label: "🌤️ Météo" },
    { id: "photos", label: "🖼️ Album" }
];
let muralActif = false;
let muralDebut = 0;
let muralTimer = null;
let muralIndex = 0;

function muralConfig() {
    const r = state.d.reglages;
    return {
        vues: r.muralVues && r.muralVues.length ? r.muralVues : ["aujourdhui", "calendrier", "repas"],
        duree: r.muralDuree || 30
    };
}

/* En-tête du mode mural : caché après 5 s d'inactivité, visible à l'interaction */
let muralInactivite = null;
function enteteMuralMontrer() {
    document.body.classList.remove("entete-cache");
    clearTimeout(muralInactivite);
    muralInactivite = setTimeout(() => {
        if (muralActif) document.body.classList.add("entete-cache");
    }, 5000);
}

function initMural() {
    elSafe("#btn-mural").onclick = basculerMural;
    const cfgBtn = $("#btn-mural-config");
    if (cfgBtn) cfgBtn.onclick = (e) => { e.stopPropagation(); modaleMuralConfig(); };
    const sortirBtn = $("#btn-mural-sortir");
    if (sortirBtn) sortirBtn.onclick = (e) => { e.stopPropagation(); arreterMural(); };
    /* 🎵 : choisir une musique ou radio sans quitter le mode mural */
    const musBtn = $("#btn-mural-musique");
    if (musBtn) musBtn.onclick = (e) => { e.stopPropagation(); modaleMuraleMusique(); };
    /* 🖼️ : lancer le diaporama photo immédiatement */
    const phBtn = $("#btn-mural-photos");
    if (phBtn) phBtn.onclick = (e) => { e.stopPropagation(); lancerDiaporamaMural(); };
    /* Flèches ◀ ▶ : naviguer directement entre les écrans */
    const precBtn = $("#btn-mural-prec");
    if (precBtn) precBtn.onclick = (e) => { e.stopPropagation(); vueMuralPrecedente(); };
    const suivBtn = $("#btn-mural-suiv");
    if (suivBtn) suivBtn.onclick = (e) => { e.stopPropagation(); vueMuralSuivante(); };
}

/* Modale de sélection musique/radio en mode mural */
function modaleMuraleMusique() {
    const radios = state.d.radios || [];
    const musiques = state.d.musiques || [];
    ouvrirModale(`
        <h2>🎵 Musique & radios</h2>
        ${radios.length ? `<h3 class="hint">📻 Radios</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:4px">
        ${radios.map(r => `<button class="btn" style="justify-content:flex-start" onclick="jouerRadio('${r.id}');fermerModale()">📻 ${esc(r.nom)}</button>`).join("")}
        </div>` : ""}
        ${musiques.length ? `<h3 class="hint">🎵 Vos MP3</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:4px">
        ${musiques.map(m => `<button class="btn" style="justify-content:flex-start" onclick="jouerUneMusique('${m.id}');fermerModale()">🎵 ${esc(m.nom)}</button>`).join("")}
        </div>` : ""}
        ${!radios.length && !musiques.length ? `<p class="hint">Aucune radio ni MP3 — ajoutez-les dans l'onglet Album.</p>` : ""}
        <h3 class="hint">🎹 Ambiances musicales (sans fichier)</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:4px">
        ${AMBIANCES.map((a, i) => `<button class="btn" style="justify-content:flex-start" onclick="demarrerAmbiance(${i});fermerModale()">🎹 ${esc(a.nom)}</button>`).join("")}
        </div>
        <button class="btn" style="width:100%;margin-top:6px" onclick="ambianceSuivante();fermerModale()">➡️ Ambiance suivante</button>
        <div class="modal-actions">
            <button class="btn" onclick="arreterMusiques();arreterAmbiance();fermerModale()">⏹️ Couper le son</button>
            <button class="btn" onclick="fermerModale()">Fermer</button>
        </div>`);
}

/* Diaporama photo depuis la barre murale — la musique/radio CONTINUE */
function lancerDiaporamaMural() {
    const urls = toutesPhotos();
    if (!urls.length) return toast("Ajoutez d'abord des photos (onglet Album).", true);
    cadre(urls, Math.floor(Math.random() * urls.length));
}

function modaleMuralConfig() {
    const cfg = muralConfig();
    ouvrirModale(`
        <h2>🖼️ Mode mural — réglages</h2>
        <label>Durée d'affichage de chaque écran</label>
        <select class="input" id="mm-duree">
            ${[15, 30, 45, 60, 120].map(s => `<option value="${s}" ${cfg.duree === s ? "selected" : ""}>${s} secondes</option>`).join("")}
        </select>
        <label>Écrans inclus dans la rotation</label>
        <div id="mm-vues" class="membres-checks">
            ${MURAL_VUES_POSSIBLES.map(v => `<label class="switch"><input type="checkbox" value="${v.id}" ${cfg.vues.includes(v.id) ? "checked" : ""}><span>${v.label}</span></label>`).join("")}
        </div>
        <div class="modal-actions">
            <button class="btn" onclick="fermerModale()">Annuler</button>
            <button class="btn btn-primary" onclick="validerMuralConfig()">Enregistrer</button>
        </div>`);
}

function validerMuralConfig() {
    const vues = [...document.querySelectorAll("#mm-vues input:checked")].map(i => i.value);
    if (!vues.length) return toast("Choisissez au moins un écran.", true);
    state.d.reglages.muralVues = vues;
    state.d.reglages.muralDuree = +$("#mm-duree").value;
    save(); fermerModale(); toast("Réglages du mode mural enregistrés ✓");
    /* Rester en mode mural : relancer la rotation avec la nouvelle config */
    if (muralActif) {
        clearInterval(muralTimer);
        muralIndex = 0;
        montrerVueMural();
        muralTimer = setInterval(vueMuralSuivante, state.d.reglages.muralDuree * 1000);
    }
}

function basculerMural() {
    if (muralActif) arreterMural();
    else demarrerMural();
}

function demarrerMural() {
    const cfg = muralConfig();
    muralActif = true;
    document.body.classList.add("mural");
    /* activer le fond image en mode mural (si choisi) */
    if (state.d.reglages.fondApp) {
        document.body.classList.add("fond-image");
        var cf = document.getElementById("calque-fond"); if (cf) cf.style.display = "";
    }
    /* Boutons propres au mode mural : musique, photos, config + sortie visibles seulement ici */
    const cfgB = $("#btn-mural-config"), sortB = $("#btn-mural-sortir"), startB = $("#btn-mural");
    const musB = $("#btn-mural-musique"), phB = $("#btn-mural-photos");
    const precB = $("#btn-mural-prec"), suivB = $("#btn-mural-suiv");
    if (cfgB) cfgB.style.display = "inline-flex";
    if (sortB) sortB.style.display = "inline-flex";
    if (musB) musB.style.display = "inline-flex";
    if (phB) phB.style.display = "inline-flex";
    if (precB) precB.style.display = "inline-flex";
    if (suivB) suivB.style.display = "inline-flex";
    if (startB) startB.style.display = "none";
    if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => { });
    toast("🖼️ Mode mural — bouton ✕ ou Échap pour quitter");
    /* Pas de son automatique au démarrage : la musique se choisit
       volontairement via le bouton 🎵 de la barre murale */
    enteteMuralMontrer();
    muralIndex = 0;
    montrerVueMural();
    clearInterval(muralTimer);
    muralTimer = setInterval(vueMuralSuivante, cfg.duree * 1000);
}

function arreterMural() {
    muralActif = false;
    /* usage normal : fond sobre — l'image ne vit qu'en mode mural */
    document.body.classList.remove("fond-image");
    var cf = document.getElementById("calque-fond"); if (cf) cf.style.display = "none";
    const cfgB = $("#btn-mural-config"), sortB = $("#btn-mural-sortir"), startB = $("#btn-mural");
    const musB = $("#btn-mural-musique"), phB = $("#btn-mural-photos");
    const precB = $("#btn-mural-prec"), suivB = $("#btn-mural-suiv");
    if (cfgB) cfgB.style.display = "none";
    if (sortB) sortB.style.display = "none";
    if (musB) musB.style.display = "none";
    if (phB) phB.style.display = "none";
    if (precB) precB.style.display = "none";
    if (suivB) suivB.style.display = "none";
    if (startB) startB.style.display = "inline-flex";
    document.body.classList.remove("mural", "entete-cache");
    clearTimeout(muralInactivite);
    clearInterval(muralTimer);
    arreterAmbiance();
    if (document.exitFullscreen && document.fullscreenElement) document.exitFullscreen().catch(() => { });
    toast("Mode mural désactivé");
}

/* Si l'utilisateur quitte le plein écran (Échap), le mode mural s'arrête aussi */
document.addEventListener("fullscreenchange", () => {
    if (muralActif && !document.fullscreenElement) arreterMural();
});

function montrerVueMural() {
    const vues = muralConfig().vues;
    if (!vues.length) return arreterMural();
    const vue = vues[muralIndex % vues.length];
    /* En mode mural, la vue « photos » affiche directement le diaporama
       plein écran (les mêmes photos que le mode cadre de l'Album) */
    if (vue === "photos") {
        const urls = toutesPhotos();
        if (urls.length) {
            cadre(urls, Math.floor(Math.random() * urls.length));
            return;
        }
    }
    const btn = document.querySelector(`#main-tabs .tab[data-view="${vue}"]`);
    if (btn) btn.click();
}

function vueMuralPrecedente() {
    const vues = muralConfig().vues;
    const cadreEl = document.getElementById("cadre-full");
    if (cadreEl && !cadreEl.classList.contains("hidden")) cadreEl.click();
    muralIndex = (muralIndex - 1 + vues.length) % vues.length;
    montrerVueMural();
}

function vueMuralSuivante() {
    const vues = muralConfig().vues;
    /* fermer le diaporama éventuel avant de passer à la vue suivante */
    const cadreEl = document.getElementById("cadre-full");
    if (cadreEl && !cadreEl.classList.contains("hidden")) cadreEl.click();
    muralIndex = (muralIndex + 1) % vues.length;
    montrerVueMural();
}

/* ============ Gestion (CRUD anniversaires, événements, fériés, vacances) ============ */
function initGestion() {
    $$(".gtab").forEach(b => b.addEventListener("click", () => {
        $$(".gtab").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        $$(".gpanel").forEach(p => p.classList.remove("active"));
        $("#panel-" + b.dataset.panel).classList.add("active");
    }));
    elSafe("#btn-add-personne").onclick = () => modalePersonne(null);
    elSafe("#recherche-personne").oninput = rendrePersonnes;
    elSafe("#btn-add-evenement-g").onclick = () => modaleEvenementG(null);
    elSafe("#btn-add-ferie").onclick = () => modaleFerie(null);
    elSafe("#btn-generer-feries").onclick = genererFeriesBE;
    elSafe("#btn-add-vacances").onclick = () => modaleVacances(null);
    elSafe("#btn-add-membre").onclick = () => modaleMembre(null);
    elSafe("#btn-add-plat").onclick = () => modalePlat(null);
    const filtreCat = $("#filtre-categorie");
    if (filtreCat) {
        filtreCat.innerHTML = `<option value="">Toutes catégories</option>` + CATEGORIES_PLATS.map(c => `<option>${esc(c)}</option>`).join("");
        filtreCat.onchange = rendrePlats;
    }
    const rechPlat = $("#recherche-plat");
    if (rechPlat) rechPlat.oninput = rendrePlats;
    /* Règles visibles dès l'ouverture (même sans passer par rendreGestion) */
    rendreReglesPlats();
    $$(".gtab").forEach(b => b.addEventListener("click", () => {
        if (b.dataset.panel === "plats") rendreReglesPlats();
    }));

    const sel = $("#select-annee-feries");
    const annees = new Set([new Date().getFullYear(), new Date().getFullYear() + 1]);
    Object.keys(state.d.jours_feries || {}).forEach(a => annees.add(+a));
    sel.innerHTML = [...annees].sort().map(a => `<option>${a}</option>`).join("");
    sel.onchange = rendreFeries;
}

/* --- Anniversaires --- */
const TYPES_ANNIV = [
    { id: "naissance", label: "🎂 Naissance" },
    { id: "mariage", label: "💍 Mariage" },
    { id: "rencontre", label: "❤️ Rencontre" },
    { id: "deces", label: "🕊️ Décès" }
];

function rendrePersonnes() {
    const q = ($("#recherche-personne").value || "").toLowerCase();
    const tbody = $("#table-personnes tbody");
    const liste = state.d.anniversaires.filter(a => !q || a.nom.toLowerCase().includes(q));
    tbody.innerHTML = liste.map((a, i) => {
        const idx = state.d.anniversaires.indexOf(a);
        return `<tr>
            <td>${esc(a.nom)}</td><td>${a.jour}</td><td>${MOIS[a.mois - 1]}</td><td>${a.annee || "—"}</td>
            <td>${(TYPES_ANNIV.find(t => t.id === a.type) || TYPES_ANNIV[0]).label}</td>
            <td><button class="btn btn-mini" onclick="modalePersonne(${idx})">✏️</button>
                <button class="btn btn-mini btn-danger" onclick="supprimerPersonne(${idx})">🗑️</button></td>
        </tr>`;
    }).join("") || `<tr><td colspan="6" class="hint">Aucun anniversaire — ajoutez-en !</td></tr>`;
}

function modalePersonne(idx) {
    const a = idx != null ? state.d.anniversaires[idx] : null;
    ouvrirModale(`
        <h2>${a ? "Modifier" : "Nouvel"} anniversaire</h2>
        <label>Nom</label><input class="input" id="mp-nom" value="${a ? esc(a.nom) : ""}">
        <label>Jour</label><input class="input" type="number" id="mp-jour" min="1" max="31" value="${a ? a.jour : ""}">
        <label>Mois</label><select class="input" id="mp-mois">${MOIS.map((m, i) => `<option value="${i + 1}" ${a && a.mois === i + 1 ? "selected" : ""}>${m}</option>`).join("")}</select>
        <label>Année (vide = âge masqué)</label><input class="input" type="number" id="mp-annee" value="${a && a.annee ? a.annee : ""}">
        <label>Type</label><select class="input" id="mp-type">${TYPES_ANNIV.map(t => `<option value="${t.id}" ${a && a.type === t.id ? "selected" : ""}>${t.label}</option>`).join("")}</select>
        <div class="modal-actions">
            <button class="btn" onclick="fermerModale()">Annuler</button>
            <button class="btn btn-primary" onclick="validerPersonne(${idx != null ? idx : "null"})">Enregistrer</button>
        </div>`);
}

function validerPersonne(idx) {
    if (!editionPermise()) return refuserEdition();
    const nom = $("#mp-nom").value.trim();
    const jour = +$("#mp-jour").value;
    const mois = +$("#mp-mois").value;
    if (!nom || !jour || !mois) return toast("Nom, jour et mois sont requis.", true);
    const a = { nom, jour, mois, annee: +$("#mp-annee").value || null, type: $("#mp-type").value };
    if (idx != null) state.d.anniversaires[idx] = a;
    else state.d.anniversaires.push(a);
    save(); fermerModale(); rendrePersonnes(); rendreCalendrier(); rendreAujourdhui();
    toast("Anniversaire enregistré ✓");
}

function supprimerPersonne(idx) {
    if (!editionPermise()) return refuserEdition();
    if (!confirm("Supprimer cet anniversaire ?")) return;
    state.d.anniversaires.splice(idx, 1);
    save(); rendrePersonnes(); rendreCalendrier(); rendreAujourdhui();
}

/* --- Événements --- */
function rendreEvenementsG() {
    const tbody = $("#table-evenements-g tbody");
    const evs = [...state.d.evenements].sort((a, b) => a.debut.localeCompare(b.debut));
    tbody.innerHTML = evs.map(e => `<tr>
        <td>${e.debut}</td><td>${evEmoji(e)} ${esc(e.titre)}</td>
        <td><button class="btn btn-mini" onclick="modaleEvenementG('${e.id}')">✏️</button>
            <button class="btn btn-mini btn-danger" onclick="supprimerEvenementG('${e.id}')">🗑️</button></td>
    </tr>`).join("") || `<tr><td colspan="3" class="hint">Aucun événement.</td></tr>`;
}

function modaleEvenementG(id) {
    const e = id ? state.d.evenements.find(x => x.id === id) : null;
    ouvrirModale(`
        <h2>${e ? "Modifier" : "Nouvel"} événement</h2>
        <label>Libellé</label><input class="input" id="mg-titre" value="${e ? esc(e.titre) : ""}">
        <label>Date</label><input class="input" type="date" id="mg-date" value="${e ? e.debut : aujourdhuiISO()}">
        <div class="modal-actions">
            <button class="btn" onclick="fermerModale()">Annuler</button>
            <button class="btn btn-primary" onclick="validerEvenementG('${e ? e.id : ""}')">Enregistrer</button>
        </div>`);
}

function validerEvenementG(id) {
    if (!editionPermise()) return refuserEdition();
    const titre = $("#mg-titre").value.trim();
    const date = $("#mg-date").value;
    if (!titre || !date) return toast("Libellé et date requis.", true);
    if (id) {
        const e = state.d.evenements.find(x => x.id === id);
        e.titre = titre; e.debut = date;
    } else state.d.evenements.push({ id: uid(), titre, type: "famille", debut: date, fin: null });
    save(); fermerModale(); rendreEvenementsG(); rendreCalendrier(); rendreAujourdhui();
    toast("Événement enregistré ✓");
}

function supprimerEvenementG(id) {
    if (!editionPermise()) return refuserEdition();
    state.d.evenements = state.d.evenements.filter(e => e.id !== id);
    save(); rendreEvenementsG(); rendreCalendrier(); rendreAujourdhui();
}

/* --- Jours fériés --- */
function dimPaques(annee) {
    // Algorithme de Meeus/Jones/Butcher
    const a = annee % 19, b = Math.floor(annee / 100), c = annee % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mois = Math.floor((h + l - 7 * m + 114) / 31);
    const jour = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(annee, mois - 1, jour);
}

function genererFeriesBE() {
    if (!editionPermise()) return refuserEdition();
    const annee = +$("#select-annee-feries").value;
    const paques = dimPaques(annee);
    const lundiPaques = new Date(paques); lundiPaques.setDate(paques.getDate() + 1);
    const ascension = new Date(paques); ascension.setDate(paques.getDate() + 39);
    const pentecote = new Date(paques); pentecote.setDate(paques.getDate() + 50);
    const f = d => isoDate(d);
    const feries = [
        [annee + "-01-01", "Nouvel An"],
        [f(lundiPaques), "Lundi de Pâques"],
        [annee + "-05-01", "Fête du Travail"],
        [f(ascension), "Ascension"],
        [f(pentecote), "Lundi de Pentecôte"],
        [annee + "-07-21", "Fête Nationale"],
        [annee + "-08-15", "Assomption"],
        [annee + "-11-01", "Toussaint"],
        [annee + "-11-11", "Armistice"],
        [annee + "-12-25", "Noël"]
    ];
    const existants = new Set((state.d.jours_feries[annee] || []).map(x => Array.isArray(x) ? x[0] : x.date));
    state.d.jours_feries[annee] = feries.map(([d, l]) => [d, l]);
    save(); rendreFeries(); rendreCalendrier(); rendreAujourdhui();
    toast("Jours fériés belges " + annee + " générés ✓ (Pâques : " + f(paques) + ")");
}

function rendreFeries() {
    const annee = +$("#select-annee-feries").value;
    const tbody = $("#table-feries tbody");
    const liste = state.d.jours_feries[annee] || [];
    tbody.innerHTML = liste.map((f, i) => {
        const d = Array.isArray(f) ? f[0] : f.date;
        const l = Array.isArray(f) ? f[1] : f.label;
        return `<tr><td>${d}</td><td>${esc(l)}</td>
            <td><button class="btn btn-mini btn-danger" onclick="supprimerFerie(${annee}, ${i})">🗑️</button></td></tr>`;
    }).join("") || `<tr><td colspan="3" class="hint">Aucun férié pour ${annee} — cliquez « Générer (Belgique) ».</td></tr>`;
}

function modaleFerie() {
    const annee = +$("#select-annee-feries").value;
    ouvrirModale(`
        <h2>Nouveau jour férié</h2>
        <label>Date</label><input class="input" type="date" id="mf-date" value="${annee}-01-01">
        <label>Libellé</label><input class="input" id="mf-libelle" placeholder="ex. Vacances scolaires">
        <div class="modal-actions">
            <button class="btn" onclick="fermerModale()">Annuler</button>
            <button class="btn btn-primary" onclick="validerFerie(${annee})">Enregistrer</button>
        </div>`);
}

function validerFerie(annee) {
    if (!editionPermise()) return refuserEdition();
    const d = $("#mf-date").value, l = $("#mf-libelle").value.trim();
    if (!d || !l) return toast("Date et libellé requis.", true);
    if (!state.d.jours_feries[annee]) state.d.jours_feries[annee] = [];
    state.d.jours_feries[annee].push([d, l]);
    save(); fermerModale(); rendreFeries(); rendreCalendrier(); rendreAujourdhui();
}

function supprimerFerie(annee, idx) {
    if (!editionPermise()) return refuserEdition();
    state.d.jours_feries[annee].splice(idx, 1);
    save(); rendreFeries(); rendreCalendrier(); rendreAujourdhui();
}

/* --- Vacances --- */
function rendreVacances() {
    const tbody = $("#table-vacances tbody");
    tbody.innerHTML = (state.d.vacances_scolaires || []).map((v, i) => {
        const deb = Array.isArray(v) ? v[0] : v.debut;
        const fin = Array.isArray(v) ? v[1] : v.fin;
        const l = Array.isArray(v) ? v[2] : v.libelle;
        return `<tr><td>${deb}</td><td>${fin}</td><td>${esc(l)}</td>
            <td><button class="btn btn-mini btn-danger" onclick="supprimerVacances(${i})">🗑️</button></td></tr>`;
    }).join("") || `<tr><td colspan="4" class="hint">Aucune période de vacances.</td></tr>`;
}

function modaleVacances() {
    ouvrirModale(`
        <h2>Nouvelle période de vacances</h2>
        <label>Début</label><input class="input" type="date" id="mv-debut">
        <label>Fin</label><input class="input" type="date" id="mv-fin">
        <label>Libellé</label><input class="input" id="mv-libelle" placeholder="ex. Vacances de Carnaval">
        <div class="modal-actions">
            <button class="btn" onclick="fermerModale()">Annuler</button>
            <button class="btn btn-primary" onclick="validerVacances()">Enregistrer</button>
        </div>`);
}

function validerVacances() {
    if (!editionPermise()) return refuserEdition();
    const deb = $("#mv-debut").value, fin = $("#mv-fin").value, l = $("#mv-libelle").value.trim();
    if (!deb || !fin || !l) return toast("Les 3 champs sont requis.", true);
    state.d.vacances_scolaires.push([deb, fin, l]);
    save(); fermerModale(); rendreVacances(); rendreCalendrier(); rendreAujourdhui();
    toast("Vacances enregistrées ✓");
}

function supprimerVacances(idx) {
    if (!editionPermise()) return refuserEdition();
    state.d.vacances_scolaires.splice(idx, 1);
    save(); rendreVacances(); rendreCalendrier(); rendreAujourdhui();
}

/* Rendu global de la vue Gestion */
function rendreGestion() {
    rendrePersonnes();
    rendreEvenementsG();
    rendreFeries();
    rendreVacances();
    rendreMembres();
    rendrePlats();
    rendreReglesPlats();
    majStatutICS();
}

function allerGestionPlats() {
    const btn = document.querySelector('#main-tabs .tab[data-view="gestion"]');
    if (btn) btn.click();
    const ongletPlats = document.querySelector('.gtab[data-panel="plats"]');
    if (ongletPlats) ongletPlats.click();
}

function allerGestionCalendrier() {
    const btn = document.querySelector('#main-tabs .tab[data-view="gestion"]');
    if (btn) btn.click();
    const ongletCal = document.querySelector('.gtab[data-panel="calendrier-g"]');
    if (ongletCal) ongletCal.click();
}

/* ============ Code PIN (protection Gestion/Réglages) ============ */
let pinDeverrouilleJusquA = 0;

function pinActif() { return !!(state.d.reglages.pin && state.d.reglages.pin.length >= 4); }

function initPin() {
    const champ = $("#opt-pin");
    if (champ) champ.value = state.d.reglages.pin || "";
    const btn = $("#btn-save-pin");
    if (btn) btn.onclick = () => {
        const v = champ.value.trim();
        if (v && !/^\d{4,8}$/.test(v)) return toast("Le code doit contenir 4 à 8 chiffres.", true);
        state.d.reglages.pin = v || null;
        save();
        toast(v ? "🔒 Code enregistré — Gestion et Réglages sont protégés" : "Protection désactivée");
    };
}

function demanderPin(actionSiOk, libelle) {
    if (!pinActif()) { actionSiOk(); return; }
    if (Date.now() < pinDeverrouilleJusquA) { actionSiOk(); return; }
    const code = prompt(libelle || "Entrez le code PIN pour modifier :");
    if (code === null) return;
    if (code !== state.d.reglages.pin) { toast("Code incorrect.", true); return; }
    pinDeverrouilleJusquA = Date.now() + 10 * 60 * 1000;
    actionSiOk();
}

/* Protection des vues sensibles lors de la navigation */
function vueProtegee(vue) { return vue === "gestion" || vue === "reglages"; }

/* ============ Licence ============ */
/* Clés de licence EDU-XXXX-XXXX :
   - illimitée (♾️) : échéance 2099
   - mensuelle : échéance +1 mois · annuelle : échéance +1 an (ristourne)
   Structure prête pour une validation serveur plus tard. */

function licenceInfo() {
    const l = state.d.licence;
    if (!l || !l.cle) {
        /* Essai : 15 jours complets dès l'installation */
        let jours = 15;
        if (state.d.dateInstallation) {
            jours = 15 - Math.floor((Date.now() - new Date(state.d.dateInstallation)) / 86400000);
        }
        return { statut: "essai", jours: Math.max(jours, 0), cle: null };
    }
    if (l.aVie) return { statut: "vie", cle: l.cle, nom: l.nom || "" };
    const fin = new Date(l.echeance);
    const jours = Math.ceil((fin - new Date()) / 86400000);
    if (jours <= 0) return { statut: "expire", cle: l.cle };
    return { statut: "actif", jours, cle: l.cle };
}

/* Clés EDU-XXXX-XXXX :
   - bloc 2 : échéance en jours depuis 2026-01-01 (base-32, 4 caractères — à vie = jour 27000 ≈ 2100)
   - bloc 1 : aléatoire + somme de contrôle liée au bloc 2 (anti-faute de frappe)
   Les clés à vie sont indiscernables des clés standard (même format). */

const CLE_ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CLE_ORIGINE = Date.UTC(2026, 0, 1) / 86400000; // jours depuis epoch pour 2026-01-01

function decoderEcheanceCle(cle) {
    const m = cle.match(/^EDU-([A-Z2-9]{4})-([A-Z2-9]{4})$/);
    if (!m) return null;
    const A = CLE_ALPHA;
    const dec = bloc => bloc.split("").reduce((a, c) => a * A.length + A.indexOf(c), 0);
    const jours = dec(m[2]);
    if (jours < 0 || jours > 32000) return null;
    /* Somme de contrôle : le bloc 1 doit vérifier somme % 5 === jours % 5 */
    const somme = m[1].split("").reduce((a, c) => a + A.indexOf(c), 0);
    if (somme % 5 !== jours % 5) return null;
    const dateEpoch = (CLE_ORIGINE + jours) * 86400000;
    const d = new Date(dateEpoch);
    return d.toISOString().slice(0, 10);
}

/* Génère une clé : genererCleLicence("vie") ou genererCleLicence("2027-10-28") */
function genererCleLicence(echeance) {
    const A = CLE_ALPHA;
    let jours;
    if (echeance === "vie") jours = 27000; // ~année 2100
    else {
        const cible = Math.floor(new Date(echeance + "T12:00:00Z").getTime() / 86400000);
        jours = Math.round(cible - CLE_ORIGINE);
        if (jours < 0 || jours > 32000) throw new Error("Échéance hors plage");
    }
    const enc = num => {
        let s = "";
        for (let i = 0; i < 4; i++) { s = A[num % A.length] + s; num = Math.floor(num / A.length); }
        return s;
    };
    const bloc2 = enc(jours);
    let bloc1 = "";
    do {
        bloc1 = "";
        for (let i = 0; i < 4; i++) bloc1 += A[Math.floor(Math.random() * A.length)];
    } while (bloc1.split("").reduce((a, c) => a + A.indexOf(c), 0) % 5 !== jours % 5);
    return "EDU-" + bloc1 + "-" + bloc2;
}

function cleValide(cle) {
    const echeance = decoderEcheanceCle(cle);
    if (!echeance) return { ok: false };
    const aVie = echeance >= "2099-01-01";
    return { ok: true, aVie, echeance };
}

/* ===== Verrou doux =====
   VERROU_DOUX_ACTIF = false : aucun blocage (mode lancement/test).
   Passer à true pour activer : à l'expiration, l'app reste consultable
   (calendrier, repas, étoiles, météo, album, mode mural) mais toute
   modification demande le renouvellement. Les données restent
   exportables en permanence. */
const VERROU_DOUX_ACTIF = true;

/* L'édition est-elle permise ? (licence valide OU verrou désactivé) */
function editionPermise() {
    if (!VERROU_DOUX_ACTIF) return true;
    const l = licenceInfo();
    /* L'essai reste complet — seul le statut "expire" bloque l'édition */
    return l.statut !== "expire";
}

/* Message affiché quand une modification est refusée */
function refuserEdition() {
    toast("🗝️ Licence expirée — renouvelez sur edukisto.win pour continuer à modifier. (Vos données sont intactes.)", true);
}

/* Garde-fou : enveloppe une fonction d'édition */
function siEditionPermise(fn) {
    return (...args) => {
        if (!editionPermise()) return refuserEdition();
        fn(...args);
    };
}

function initLicence() {
    const btn = $("#btn-activer-licence");
    if (btn) btn.onclick = activerLicence;
    afficherLicence();
}

function activerLicence() {
    const cle = ($("#licence-cle").value || "").trim().toUpperCase();
    if (!cle) return toast("Entrez une clé de licence.", true);
    const v = cleValide(cle);
    if (!v.ok) return toast("Clé invalide — vérifiez la saisie.", true);
    state.d.licence = v.aVie
        ? { cle, aVie: true, activeLe: new Date().toISOString() }
        : { cle, aVie: false, echeance: v.echeance, activeLe: new Date().toISOString() };
    save();
    afficherLicence();
    toast(v.aVie ? "🗝️ Licence à vie activée — merci pour votre confiance 🎉" : "🗝️ Licence activée jusqu'au " + v.echeance);
}

function afficherLicence() {
    const el = $("#licence-statut");
    if (!el) return;
    const l = licenceInfo();
    if (l.statut === "vie") {
        el.innerHTML = `<p class="licence-vie">♾️</p>`;
        $("#licence-form").style.display = "none";
    } else if (l.statut === "actif") {
        el.innerHTML = `<p class="hint">✅ Licence active — ${l.jours} jour(s) restant(s).</p>`;
        $("#licence-form").style.display = "none";
    } else if (l.statut === "expire") {
        el.innerHTML = `<p class="hint" style="color:var(--rouge)">⚠️ Licence expirée — renouvelez sur <a href="https://edukisto.win" target="_blank" rel="noopener">edukisto.win</a>. (Les données restent intactes et exportables.)</p>`;
        $("#licence-form").style.display = "flex";
    } else {
        el.innerHTML = `<p class="hint">🎁 Période d'essai — ${l.jours} jour(s) restant(s), fonctionnalités complètes.</p>`;
        $("#licence-form").style.display = "flex";
    }
}

/* Règles de génération des repas (Gestion → Plats) */
function rendreReglesPlats() {
    const el = $("#regles-plats");
    if (!el) return;
    const r = state.d.reglages;
    if (!r.frequences || !Object.keys(r.frequences).length) {
        r.frequences = { "Végétarien": -1, "Poulet": 1, "Viande Rouge": 1, "Poisson": 1, "Crustacés": 1, "Porc": 1, "Pâtes": 1, "Crasses": 1, "À commander": 1 };
    }
    const freqs = r.frequences;
    const cats = Object.keys(freqs);
    el.innerHTML = `
    <div class="panel-toolbar">
        <label class="switch"><input type="checkbox" id="opt-equilibre" ${r.equilibreParfait ? "checked" : ""}>
        <span>⚖️ Équilibre parfait — jamais « Crasses » ET « À commander » la même semaine</span></label>
    </div>
    <div class="freq-grid">
        ${cats.map(cat => `
        <div class="freq-row">
            <span>${esc(cat)}</span>
            <span class="counter">
                <button class="btn btn-mini" onclick="setFreq('${esc(cat)}', ${freqs[cat] - 1})">−</button>
                <span class="count">${freqs[cat] === -1 ? "∞" : freqs[cat] === 0 ? "jamais" : freqs[cat] + "×/sem."}</span>
                <button class="btn btn-mini" onclick="setFreq('${esc(cat)}', ${freqs[cat] + 1})">+</button>
            </span>
        </div>`).join("")}
    </div>`;
    const eq = $("#opt-equilibre");
    if (eq) eq.onchange = e => { state.d.reglages.equilibreParfait = e.target.checked; save(); toast("Équilibre parfait " + (e.target.checked ? "activé" : "désactivé")); };
}

function setFreq(cat, n) {
    const freqs = state.d.reglages.frequences || {};
    const actuel = freqs[cat] !== undefined ? freqs[cat] : 1;
    /* -1 (illimité) ne peut être quitté qu'en descendant vers 0 ; monter depuis -1 → 0 */
    if (n < -1) return;
    if (actuel === -1 && n > 0) n = 0;
    if (n > 7) return;
    freqs[cat] = n;
    state.d.reglages.frequences = freqs;
    save(); rendreReglesPlats();
}


/* ============ Lecteur MP3 (musique de fond) ============ */
let audioCourant = null;

function initMusiques() {
    const inp = $("#file-musiques");
    if (inp) inp.onchange = e => {
        if (!editionPermise()) { e.target.value = ""; return refuserEdition(); }
        const files = [...e.target.files];
        let restant = files.length;
        files.forEach(f => {
            const fr = new FileReader();
            fr.onload = () => {
                state.d.musiques = state.d.musiques || [];
                if (!state.d.musiques.some(m => m.nom === f.name)) {
                    state.d.musiques.push({ id: uid(), nom: f.name, data: fr.result });
                }
                if (--restant === 0) { save(); rendreMusiques(); toast("Musique ajoutée ✓"); }
            };
            fr.readAsDataURL(f);
        });
        e.target.value = "";
    };
    const play = $("#btn-musique-play");
    if (play) play.onclick = jouerMusiques;
    const stop = $("#btn-musique-stop");
    if (stop) stop.onclick = arreterMusiques;
    rendreMusiques();
}

function rendreMusiques() {
    const el = $("#musiques-liste");
    if (!el) return;
    const musiques = state.d.musiques || [];
    el.innerHTML = musiques.map(m => `
        <div class="liste-item">
            <span style="flex:1">🎵 ${esc(m.nom)}</span>
            <button class="btn btn-mini" onclick="jouerUneMusique('${m.id}')">▶️</button>
            <button class="btn btn-mini btn-danger" onclick="supprimerMusique('${m.id}')">🗑️</button>
        </div>`).join("") || `<p class="hint">Aucune musique — ajoutez vos MP3 (lus en aléatoire ou à la demande).</p>`;
    const info = $("#musique-info");
    if (info) info.textContent = musiques.length ? musiques.length + " morceau(x)" : "";
}

function jouerUneMusique(id) {
    const m = (state.d.musiques || []).find(x => x.id === id);
    if (!m) return;
    arreterMusiques();
    audioCourant = new Audio(m.data);
    audioCourant.play().catch(() => toast("Lecture impossible", true));
}

function jouerMusiques() {
    const musiques = state.d.musiques || [];
    if (!musiques.length) return toast("Ajoutez d'abord des MP3.", true);
    arreterMusiques();
    const suite = () => {
        const m = musiques[Math.floor(Math.random() * musiques.length)];
        audioCourant = new Audio(m.data);
        audioCourant.onended = suite;
        audioCourant.play().catch(() => {});
    };
    suite();
    toast("🎵 Lecture aléatoire");
}

function arreterMusiques() {
    if (audioCourant) { audioCourant.pause(); audioCourant = null; }
}

function supprimerMusique(id) {
    if (!editionPermise()) return refuserEdition();
    state.d.musiques = (state.d.musiques || []).filter(m => m.id !== id);
    save(); rendreMusiques();
}


/* ============ Radios (flux web) ============ */
function rendreRadios() {
    const el = $("#radios-liste");
    if (!el) return;
    const radios = state.d.radios || [];
    el.innerHTML = radios.map(r => `
        <div class="liste-item">
            <span style="flex:1">📻 ${esc(r.nom)}</span>
            <button class="btn btn-mini" onclick="jouerRadio('${r.id}')" title="Écouter">▶️</button>
            <button class="btn btn-mini btn-danger" onclick="supprimerRadio('${r.id}')" title="Retirer">🗑️</button>
        </div>`).join("");
}

function jouerRadio(id) {
    const r = (state.d.radios || []).find(x => x.id === id);
    if (!r) return;
    arreterMusiques();   // pas les deux à la fois
    arreterAmbiance();
    audioCourant = new Audio(r.url);
    audioCourant.play().catch(() => toast("Flux inaccessible — vérifiez votre connexion ou l'URL.", true));
    toast("📻 " + r.nom);
}

function supprimerRadio(id) {
    if (!editionPermise()) return refuserEdition();
    state.d.radios = (state.d.radios || []).filter(r => r.id !== id);
    save(); rendreRadios();
}

function initRadios() {
    const btn = $("#btn-add-radio");
    if (btn) btn.onclick = () => {
        if (!editionPermise()) return refuserEdition();
        const nom = ($("#radio-nom").value || "").trim();
        const url = ($("#radio-url").value || "").trim();
        if (!nom || !/^https?:\/\//.test(url)) return toast("Donnez un nom et une URL de flux (http/https).", true);
        state.d.radios = state.d.radios || [];
        state.d.radios.push({ id: uid(), nom, url });
        save(); rendreRadios();
        $("#radio-nom").value = ""; $("#radio-url").value = "";
        toast("Radio ajoutée ✓");
    };
    rendreRadios();
}


/* Mise à jour : force le service worker à re-télécharger l'app puis recharge */
async function verifierMiseAJour() {
    toast("🔄 Recherche de mise à jour…");
    try {
        /* re-enregistrer le SW (récupère le sw.js à jour côté serveur) */
        const reg = await navigator.serviceWorker.register("./sw.js");
        await reg.update();
        /* demander au SW actif de basculer immédiatement */
        if (reg.waiting) {
            reg.waiting.postMessage("forcer-maj");
            toast("✅ Mise à jour installée — rechargement…");
        } else {
            /* pas de nouvelle version en attente : purger le cache et recharger quand même */
            if ("caches" in window) {
                const cles = await caches.keys();
                await Promise.all(cles.map(k => caches.delete(k)));
            }
            toast("✅ Cache actualisé — rechargement…");
            setTimeout(() => location.reload(true), 600);
        }
    } catch (e) {
        toast("Mise à jour impossible : " + e.message, true);
    }
}


/* ============ Détection automatique de mise à jour ============
   La version publiée est inscrite dans version.txt (incrémentée à chaque
   déploiement). L'app la compare à la version chargée : si différente,
   un bandeau s'affiche — un simple toucher met à jour. */
const VERSION_CHARGEE = "v2026-10-31.3";

async function verifierVersionPubliee() {
    try {
        const r = await fetch("version.txt", { cache: "no-store" });
        if (!r.ok) return;
        const publiee = (await r.text()).trim();
        if (publiee && publiee !== VERSION_CHARGEE) afficherBandeauMaj(publiee);
    } catch (e) { /* hors-ligne : rien */ }
}

function afficherBandeauMaj(version) {
    if (document.getElementById("bandeau-maj")) return; /* déjà affiché */
    /* anti-boucle : si le bandeau revient sans cesse, c'est que le SW sert
       une vieille version — on purge le cache storage puis on recharge à nu.
       Un marqueur localStorage empêche le bandeau de revenir dans les 10 s
       suivant une mise à jour (le temps que la page fraîche s'installe). */
    let recharges = 0;
    try { recharges = parseInt(localStorage.getItem("ecalfam-maj-recharges") || "0"); } catch (e) { }
    if (recharges > 3) return; /* boucle détectée : on éteint le bandeau, l'utilisateur réinstallera */

    const b = document.createElement("div");
    b.id = "bandeau-maj";
    b.style.cssText = "position:fixed;bottom:60px;left:50%;transform:translateX(-50%);background:var(--teal);color:#fff;padding:12px 20px;border-radius:10px;z-index:700;box-shadow:0 4px 16px rgba(0,0,0,.4);cursor:pointer;font-weight:600;display:flex;gap:10px;align-items:center";
    b.innerHTML = "🔄 Nouvelle version — toucher pour mettre à jour";
    b.onclick = async () => {
        b.remove();
        try { localStorage.setItem("ecalfam-maj-recharges", String(recharges + 1)); } catch (e) { }
        /* purge complète du cache storage : casse la boucle des vieux SW */
        if ("caches" in window) {
            try {
                const cles = await caches.keys();
                await Promise.all(cles.map(k => caches.delete(k)));
            } catch (e) { }
        }
        try {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) await reg.unregister();   /* retire le vieux SW */
        } catch (e) { }
        location.reload(true);
    };
    document.body.appendChild(b);
}

/* La page s'installe correctement → remettre le compteur anti-boucle à zéro
   après 30 s sans bandeau de retour */
setTimeout(() => {
    try { localStorage.setItem("ecalfam-maj-recharges", "0"); } catch (e) { }
}, 30000);

/* Afficher la version dans Réglages → À propos (suivi des mises à jour) */
(function afficherVersionAPropos() {
    const el = document.getElementById("apropos-version");
    if (el) el.textContent = "Version installée : " + VERSION_CHARGEE;
})();

/* Vérification discrète : UNE fois par session, 30 s après le démarrage.
   Jamais de répétition dans la même session — si une mise à jour arrive
   pendant que l'app est ouverte, elle sera proposée à la prochaine ouverture.
   (Un écran familial ne doit jamais être harcelé par des bandeaux.) */
setTimeout(verifierVersionPubliee, 30000);


/* ===== Ingrédients de la semaine → liste de courses =====
   Pour chaque plat planifié (hors « À commander »), récupère sa recette
   (INGREDIENTS_PLATS), multiplie chaque quantité par le nombre de personnes,
   agrège (2 plats avec des oignons = total combiné) et ajoute à la liste. */
function ingredientsVersListeCourses() {
    if (!editionPermise()) return refuserEdition();
    const liste = garantirListeCourses();
    const nb = state.d.reglages.nbPersonnes || 4;

    /* Semaine de référence */
    const lundi = new Date(state.repasSemaineDebut);
    const lundiISO = isoDate(lundi);

    /* Agréger les ingrédients : { "ingrédient|unité": [total, unité] } */
    const agg = {};
    let platsComptes = 0, sansRecette = [];
    for (let i = 0; i < 7; i++) {
        const dd = parseISO(lundiISO); dd.setDate(dd.getDate() + i);
        const iso = isoDate(dd);
        const p = platDuJour(iso);
        if (!p || !p.nom) continue;
        if (/commander/i.test(p.categorie || "")) continue;
        const recette = INGREDIENTS_PLATS[p.nom];
        if (!recette) { sansRecette.push(p.nom); continue; }
        platsComptes++;
        recette.forEach(([ing, qte, unite]) => {
            const cle = ing + "|" + unite;
            if (!agg[cle]) agg[cle] = [ing, 0, unite];
            agg[cle][1] += qte * nb;
        });
    }
    if (!platsComptes) return toast("Aucun plat avec recette cette semaine — choisissez d'abord vos repas.", true);

    /* Ajouter à la liste : retirer les anciens ingrédients (préfixe 🥕) puis ajouter */
    liste.items = liste.items.filter(it => !it.ingredient);
    let ajoutes = 0;
    Object.values(agg).forEach(([ing, total, unite]) => {
        const q = total % 1 === 0 ? String(total) : total.toFixed(1).replace(".", ",");
        const texte = ing + " : " + q + " " + unite;
        liste.items.push({ id: uid(), texte, fait: false, plat: false, ingredient: true });
        ajoutes++;
    });
    save(); rendreListes();
    let msg = "🧺 " + ajoutes + " ingrédients ajoutés (pour " + nb + " pers., " + platsComptes + " plats)";
    if (sansRecette.length) msg += " — sans recette : " + sansRecette.join(", ");
    toast(msg);
}


/* Garantit qu'une liste de courses existe — la recrée si l'utilisateur
   a supprimé la sienne par mégarde */
function garantirListeCourses() {
    if (!state.d.listes) state.d.listes = [];
    let liste = state.d.listes.find(l => l.id === "l1") || state.d.listes[0];
    if (!liste) {
        liste = { id: "l1", nom: "Courses", items: [] };
        state.d.listes.push(liste);
        save();
        if (typeof rendreListes === "function") rendreListes();
    }
    return liste;
}


/* ===== Arrière-plan de l'app (image avec opacité 50% + blur léger) ===== */
function appliquerFondApp() {
    /* Le fond image n'existe qu'en MODE MURAL : la TV cuisine sublimée par
       le paysage. En usage normal (édition, navigation), fond sobre. */
    /* retirer un éventuel calque précédent */
    var ancien = document.getElementById("calque-fond");
    if (ancien) ancien.remove();
    var fond = state.d.reglages.fondApp;
    var info = document.getElementById("fond-actuel");
    var sel = document.getElementById("choix-fond");
    if (sel) sel.value = fond || "";
    if (!fond) {
        document.body.classList.remove("fond-image");
        if (info) info.textContent = "";
        return;
    }
    var calque = document.createElement("div");
    calque.id = "calque-fond";
    /* Image NETTE en fond — la lisibilité vient du verre des cartes (glassmorphism) */
    calque.style.cssText = "position:fixed;inset:0;z-index:-1;background-image:url('" + fond + "');background-size:cover;background-position:center;";
    document.body.appendChild(calque);
    document.body.classList.add("fond-image");
    if (info) info.textContent = "Fond actif ✓";
}

function initFondApp() {
    var sel = document.getElementById("choix-fond");
    if (!sel) return;
    sel.onchange = function () {
        if (!editionPermise()) { sel.value = state.d.reglages.fondApp || ""; return refuserEdition(); }
        state.d.reglages.fondApp = sel.value;
        save();
        appliquerFondApp();
        toast(sel.value ? "Fond appliqué ✓" : "Fond retiré");
    };
    var btn = document.getElementById("btn-apercu-fond");
    if (btn) btn.onclick = function () {
        if (!sel.value) return toast("Choisissez d'abord une image.", true);
        state.d.reglages.fondApp = sel.value;
        save();
        appliquerFondApp();
        toast("Aperçu appliqué — Réglages → Écran pour l'enlever si besoin");
    };
    appliquerFondApp();
}


/* ===== Carte « Aujourd'hui au calendrier » : tout ce qui se passe aujourd'hui =====
   Événements familiaux, rendez-vous Google Agenda (ICS), fériés, vacances. */
function rendreTodayCalendrier() {
    var el = document.getElementById("today-calendrier");
    if (!el) return;
    var iso = aujourdhuiISO();
    var evs = evenementsDuJour(iso);
    var fer = feriesDuJour(iso);
    var vac = enVacances(iso);
    var html = "";
    fer.forEach(function (f) {
        html += '<div class="today-item"><span class="dot" style="background:var(--rouge)"></span><span style="flex:1">🏁 <strong>' + esc(f) + '</strong> <span class="hint">férié</span></span></div>';
    });
    if (vac) {
        var lib = Array.isArray(vac) ? vac[2] : (vac.libelle || "Vacances");
        html += '<div class="today-item"><span class="dot" style="background:var(--bleu-vac)"></span><span style="flex:1">🏖️ <strong>' + esc(lib) + '</strong></span></div>';
    }
    evs.forEach(function (e) {
        var couleur = e.couleur || (e.cloud ? "#7dd3fc" : "var(--accent)");
        html += '<div class="today-item"><span class="dot" style="background:' + esc(couleur) + '"></span><span style="flex:1">' + evEmoji(e) + ' <strong>' + esc(e.titre || e.nom || "Événement") + '</strong>' + (e.heure ? ' <span class="hint">· ' + esc(e.heure) + '</span>' : '') + (e.cloud || e.sourceNom ? ' <span class="hint">· Google</span>' : '') + '</span></div>';
    });
    el.innerHTML = html || '<p class="hint">Aucun rendez-vous aujourd\'hui.</p>';
}

/* ===== Météo complète de la semaine pour l'accueil ===== */
function rendreTodayMeteo() {
    var el = document.getElementById("today-meteo");
    if (!el) return;
    if (typeof meteoDonnees === "undefined" || !meteoDonnees || !meteoDonnees.data || !meteoDonnees.data.daily) {
        el.innerHTML = '<p class="hint">Météo indisponible.</p>';
        return;
    }
    var d = meteoDonnees.data.daily;
    var html = '<div class="meteo-semaine">';
    var auj = aujourdhuiISO();
    d.time.forEach(function (jour, i) {
        var estAuj = jour === auj;
        var dt = new Date(jour + "T12:00:00");
        html += '<div class="meteo-jour' + (estAuj ? " meteo-auj" : "") + '">' +
            '<div class="hint">' + (estAuj ? "Auj." : dt.toLocaleDateString("fr-BE", { weekday: "short" })) + '</div>' +
            '<div style="font-size:1.6em;margin:2px 0">' + meteoIcon(d.weather_code[i]) + '</div>' +
            '<div><strong>' + Math.round(d.temperature_2m_max[i]) + '°</strong> <span class="hint">' + Math.round(d.temperature_2m_min[i]) + '°</span></div>' +
            '<div class="hint">🌧️ ' + (d.precipitation_probability_max[i] || 0) + '%</div>' +
            '<div class="hint">💨 ' + Math.round(d.wind_speed_10m_max[i]) + ' km/h</div>' +
            '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
}
