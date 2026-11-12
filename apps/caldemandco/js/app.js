"use strict";

/* ================= État global ================= */
const state = {
    donnees: null,
    annee: new Date().getFullYear(),
    exclus: new Set(),
    moisCourant: new Date().getMonth(),
    cachePhotos: {},
    graineMelange: 0,   // incrémentée par « 🔀 Mélanger » : change la disposition des photos
};

/* ================= Init ================= */
document.addEventListener("DOMContentLoaded", async () => {
    try {
        state.donnees = chargerDonnees();
        if (!state.donnees.texteFinal) state.donnees.texteFinal = mesDonnees.texteFinal || "";

        initSelectAnnees();
        initTabs();
        initHeaderActions();
        initNavMois();
        afficherVersion();
        await initCachePhotos();
        afficherAlerte();
        rendreMoisCourant();
        rendreAnnee();
        rendreProchains();
        rendreGestion();
    } catch (err) {
        console.error("Erreur d'initialisation :", err);
        try { toast("Erreur d'initialisation : " + err.message, true); } catch (e) { }
        const el = document.getElementById("alerte");
        if (el) el.innerHTML =
            `<div class="card" style="background:#ffebee;border-color:#ef9a9a;">
            ⚠️ Erreur : ${escapeHtml(err.message)}<br>
            <small>Essayez de vider le stockage du site (F12 → Application → Local Storage → supprimer « calendrier-familial-donnees »), puis rechargez la page (Ctrl+F5).</small></div>`;
    }
});

async function initCachePhotos() {
    try {
        const noms = await photoListeNoms();
        await Promise.all(noms.map(async n => {
            state.cachePhotos[n] = await photoGetURL(n);
        }));
    } catch (e) {
        console.warn("Photos IndexedDB indisponibles :", e);
        state.cachePhotos = {};
    }
}

function anneesDisponibles() {
    const s = new Set([state.annee, new Date().getFullYear(), 2026]);
    Object.keys(state.donnees.jours_feries || {}).forEach(a => s.add(parseInt(a)));
    return [...s].filter(a => !isNaN(a)).sort();
}

function initSelectAnnees() {
    const sel = document.getElementById("select-annee");
    sel.innerHTML = anneesDisponibles().map(a => `<option value="${a}" ${a === state.annee ? "selected" : ""}>${a}</option>`).join("");
    sel.onchange = () => {
        state.annee = parseInt(sel.value);
        rendreMoisCourant();
        rendreAnnee();
    };
}

function initTabs() {
    document.querySelectorAll(".tab").forEach(t => {
        t.onclick = () => {
            document.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x === t));
            document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
            document.getElementById("view-" + t.dataset.view).classList.add("active");
        };
    });
    document.querySelectorAll(".gtab").forEach(t => {
        t.onclick = () => {
            document.querySelectorAll(".gtab").forEach(x => x.classList.toggle("active", x === t));
            document.querySelectorAll(".gpanel").forEach(p => p.classList.remove("active"));
            document.getElementById("panel-" + t.dataset.panel).classList.add("active");
        };
    });
}

function initHeaderActions() {
    document.getElementById("btn-print").onclick = () => genererImpression(state.annee, state.donnees);
    document.getElementById("btn-export").onclick = exporterJSON;
    document.getElementById("btn-cloud").onclick = publierCloud;
    document.getElementById("btn-cloud").oncontextmenu = e => { e.preventDefault(); modaleSyncConfig().then(() => {}); };
    document.getElementById("btn-cloud").title = "Clic : publier · Clic droit (ou appui long) : modifier la configuration Cloud";
    document.getElementById("btn-cloud").addEventListener("touchstart", () => {
        cloudTactile = setTimeout(() => modaleSyncConfig().then(() => {}), 800);
    }, { passive: true });
    document.getElementById("btn-cloud").addEventListener("touchend", () => clearTimeout(cloudTactile));
    document.getElementById("btn-import").onclick = () => document.getElementById("file-import").click();
    document.getElementById("file-import").onchange = importerJSON;
}

async function afficherVersion() {
    try {
        const r = await fetch("version.txt", { cache: "no-store" });
        if (!r.ok) return;
        const v = (await r.text()).trim();
        const el = document.getElementById("app-version");
        if (el) el.textContent = v;
        console.log("Calendrier Familial " + v);
    } catch (e) { /* version.txt inaccessible */ }
}

function toast(msg, err = false) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.toggle("err", err);
    t.classList.remove("hidden");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.add("hidden"), 3000);
}

/* ================= Alertes ================= */
function afficherAlerte() {
    const today = new Date();
    const d = today.getDate(), m = today.getMonth() + 1;
    const annivs = state.donnees.anniversaires.filter(a => a.jour === d && a.mois === m);
    const el = document.getElementById("alerte");
    if (!annivs.length) { el.innerHTML = ""; return; }
    el.innerHTML = `<div class="card" style="background:linear-gradient(135deg,#fff3e0,#ffe0b2);border-color:#ffcc80;">
        🎉 Aujourd'hui : ${annivs.map(a => {
            const age = (a.annee && a.annee !== "") ? ` (${today.getFullYear() - a.annee} ans)` : "";
            return `<strong>${escapeHtml(a.nom)}${age}</strong>`;
        }).join(" — ")} 🎂</div>`;
}

/* ================= Prochains anniversaires ================= */
async function rendreProchains() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const liste = state.donnees.anniversaires.map(a => {
        const prochaine = new Date(today.getFullYear(), a.mois - 1, a.jour);
        if (prochaine < today) prochaine.setFullYear(today.getFullYear() + 1);
        return { ...a, prochaine, diff: Math.round((prochaine - today) / 86400000) };
    }).sort((a, b) => a.prochaine - b.prochaine).slice(0, 8);

    const avecURL = await Promise.all(liste.map(async a => ({ ...a, url: await resoudrePhoto(a.nom) })));

    document.getElementById("prochains-liste").innerHTML = avecURL.map(a => {
        const age = (a.annee && a.annee !== "") ? ` (${a.prochaine.getFullYear() - a.annee} ans)` : "";
        const quand = a.diff === 0 ? "aujourd'hui 🎉" : a.diff === 1 ? "demain" : `dans ${a.diff} j`;
        const avatar = a.url ? `<img src="${a.url}" alt="">` : `<span class="avatar">${TYPE_ICONES[a.type] || "🎂"}</span>`;
        return `<div class="b-day ${a.diff <= 7 ? "soon" : ""}">${avatar}
            <span>${escapeHtml(a.nom)}${age}<br><span class="quand">${a.jour}/${String(a.mois).padStart(2, "0")} — ${quand}</span></span>
        </div>`;
    }).join("");
}

/* ================= Vue mois courant (accueil) ================= */
function melangerTableau(t) {
    const r = [...t];
    for (let i = r.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
}
function initNavMois() {
    document.getElementById("btn-melanger-photos").onclick = () => {
        state.graineMelange++;
        rendreMoisCourant();
    };
    document.getElementById("btn-mois-prec").onclick = () => {
        state.moisCourant--;
        if (state.moisCourant < 0) { state.moisCourant = 11; state.annee--; majSelectAnnee(); }
        rendreMoisCourant();
    };
    document.getElementById("btn-mois-suiv").onclick = () => {
        state.moisCourant++;
        if (state.moisCourant > 11) { state.moisCourant = 0; state.annee++; majSelectAnnee(); }
        rendreMoisCourant();
    };
}

function majSelectAnnee() {
    const sel = document.getElementById("select-annee");
    if (![...sel.options].some(o => o.value === String(state.annee))) {
        sel.insertAdjacentHTML("beforeend", `<option value="${state.annee}">${state.annee}</option>`);
    }
    sel.value = state.annee;
}

/* ================= Méli-mélo : polaroids éparpillés (vue Mois) ================= */
/* La zone photos occupe toute la place à côté de la liste des anniversaires et
   prend la même hauteur qu'elle. Les polaroids sont répartis sur une grille
   « relâchée » : la photo est un peu plus large que l'espace entre deux
   colonnes et peut mordre de MELI.DEPASSEMENT_H sur la rangée du dessus, d'où
   un léger chevauchement de coin (jamais les légendes, jamais d'empilement).
   Le nombre de colonnes/rangées et la taille découlent du nombre de photos du
   mois : la disposition s'adapte donc toute seule d'un mois à l'autre. */
const MELI = {
    MARGE: 6,           // marge intérieure de la zone (px)
    ANGLE_MIN: 2,       // inclinaison minimale (°)
    ANGLE_MAX: 9,       // inclinaison maximale (°)
    JITTER_X: 0.06,     // décalage horizontal (fraction d'une cellule)
    JITTER_Y: 0.06,     // décalage vertical
    ECART_L: 0.04,      // respiration horizontale : photo 4 % plus étroite que sa cellule
    DEPASSEMENT_H: 0.06,// chevauchement vertical max : léger, la légende reste lisible
    COUVERTURE: 0.94,   // part de la zone visée par les photos
    TAILLE_MAX: 380,    // largeur maximale d'un polaroid (px)
    TAILLE_MIN: 74,
    RATIO_IMAGE: 3 / 4  // hauteur / largeur de l'image (aspect-ratio 4/3)
};

/* PRNG déterministe : même mois → même disposition, y compris après un resize. */
function meliHasard(graine) {
    let a = graine >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function meliGraine(texte) {
    let h = 2166136261;
    for (let i = 0; i < texte.length; i++) h = Math.imul(h ^ texte.charCodeAt(i), 16777619);
    return h >>> 0;
}

let meliPlan = null;       // recalcule la dernière disposition
let meliDerniereTaille = ""; // évite les recalculs inutiles

function meliMeloAfficher(zoneEl, photos, graine) {
    if (!zoneEl) return;
    zoneEl.innerHTML = "";
    zoneEl.classList.toggle("sans-photo", photos.length === 0);
    meliPlan = null;
    meliDerniereTaille = "";
    if (!photos.length) return;

    const grainePlace = meliGraine(graine);
    const ordre = photos.slice();
    const hasardOrdre = meliHasard(grainePlace ^ 0x9E3779B9);
    for (let i = ordre.length - 1; i > 0; i--) {
        const j = Math.floor(hasardOrdre() * (i + 1));
        [ordre[i], ordre[j]] = [ordre[j], ordre[i]];
    }

    const elements = ordre.map(p => {
        const el = document.createElement("div");
        el.className = "polaroid";
        const note = (p.note && p.note.trim())
            ? `<span class="photo-note">${escapeHtml(p.note)}</span>` : "";
        el.innerHTML = `<div class="photo-img-wrap"><img src="${p.url}" alt="${escapeHtml(p.nom)}" draggable="false">${note}</div>
            <div class="photo-label">${escapeHtml(p.nom)}</div>`;
        zoneEl.appendChild(el);
        return el;
    });

    /* Hauteur d'un polaroid = largeur × ratio de l'image + cadre + légende.
       On la mesure une fois (à 200 px) au lieu de la supposer. */
    elements.forEach(el => { el.style.width = "200px"; });
    const h200 = elements[0].getBoundingClientRect().height || 185;
    const chrome = Math.max(14, h200 - 200 * MELI.RATIO_IMAGE);
    const hauteurDe = largeur => largeur * MELI.RATIO_IMAGE + chrome;

    meliPlan = () => meliDisposer(zoneEl, elements, hauteurDe, grainePlace);
    meliPlan();
}

function meliDisposer(zoneEl, elements, hauteurDe, graine) {
    const n = elements.length;
    const W = zoneEl.clientWidth;
    const H = zoneEl.clientHeight;
    if (!W || !H) return;
    const cle = W + "x" + H;
    if (cle === meliDerniereTaille) return;
    meliDerniereTaille = cle;

    const marge = MELI.MARGE;
    const dispoW = Math.max(80, W - 2 * marge);
    const dispoH = Math.max(80, H - 2 * marge);
    const aspectZone = dispoW / dispoH;
    const chrome = hauteurDe(0);

    /* ----- 1. Grille (colonnes × rangées) qui remplit le mieux la zone ----- */
    let choix = null;
    for (let cols = 1; cols <= Math.min(n, 6); cols++) {
        const rows = Math.ceil(n / cols);
        const celluleW = dispoW / cols;
        const celluleH = dispoH / rows;
        /* largeur max autorisée par la largeur (léger chevauchement horizontal)
           puis par la hauteur totale (léger chevauchement vertical) */
        const wParLargeur = celluleW * (1 - MELI.ECART_L);
        const wParHauteur = Math.max(40,
            (dispoH * (1 + MELI.DEPASSEMENT_H) / rows - chrome) / MELI.RATIO_IMAGE);
        const wAire = Math.sqrt(MELI.COUVERTURE * dispoW * dispoH / (n * MELI.RATIO_IMAGE));
        let w = Math.min(wAire, wParLargeur, wParHauteur);
        w = Math.min(w, MELI.TAILLE_MAX);
        w = Math.max(w, MELI.TAILLE_MIN);
        const h = hauteurDe(w);
        const couverture = Math.min(1, n * w * h / (dispoW * dispoH));
        const aspectGrille = (cols * w) / (rows * h);
        const penaliteAspect = 1 - 0.6 * Math.min(1, Math.abs(Math.log(aspectGrille / aspectZone)));
        const penaliteVide = 1 - 0.45 * ((rows * cols - n) / cols);
        const score = couverture * penaliteAspect * penaliteVide;
        if (!choix || score > choix.score) choix = { cols, rows, w, score };
    }

    /* ----- 2. Répartition : léger décalage + inclinaison, bornée dans la zone ----- */
    const hasard = meliHasard(graine ^ 0x85EBCA6B);
    const { cols, rows, w: tailleBase } = choix;

    elements.forEach((el, i) => {
        const col = i % cols;
        const rang = Math.floor(i / cols);
        const dansRang = Math.min(cols, n - rang * cols);

        const taille = tailleBase * (0.94 + hasard() * 0.12);
        const h = hauteurDe(taille);
        const signe = i % 2 ? -1 : 1;
        const rot = signe * (MELI.ANGLE_MIN + hasard() * (MELI.ANGLE_MAX - MELI.ANGLE_MIN));
        const angle = Math.abs(rot) * Math.PI / 180;
        const demiL = (taille * Math.cos(angle) + h * Math.sin(angle)) / 2;
        const demiH = (taille * Math.sin(angle) + h * Math.cos(angle)) / 2;

        const cxCell = marge + (col + 0.5) * dispoW / dansRang;
        const cyCell = marge + (rang + 0.5) * dispoH / rows;
        const flouX = (hasard() * 2 - 1) * MELI.JITTER_X * (dispoW / cols);
        const flouY = (hasard() * 2 - 1) * MELI.JITTER_Y * (dispoH / rows);

        const cx = borne(cxCell + flouX, marge + demiL, W - marge - demiL);
        const cy = borne(cyCell + flouY, marge + demiH, H - marge - demiH);

        el.style.width = Math.round(taille) + "px";
        el.style.left = Math.round(cx - taille / 2) + "px";
        el.style.top = Math.round(cy - h / 2) + "px";
        el.style.setProperty("--rot", rot.toFixed(1) + "deg");
        el.dataset.rot = rot.toFixed(1);
        /* dans une rangée, la photo de droite passe devant : c'est le début du
           nom (à gauche) qui reste lisible quand deux photos se chevauchent */
        el.style.zIndex = String(1000 - rang * 10 + col);
    });
}

function borne(valeur, min, max) {
    if (min > max) return (min + max) / 2;   // photo plus grande que la zone : centrée
    return Math.min(max, Math.max(min, valeur));
}

/* Recalcule la disposition quand la zone change de taille (fenêtre, zoom,
   liste plus ou moins longue). */
(function suivreMeliMelo() {
    const zoneEl = document.getElementById("mois-photos");
    if (!zoneEl || typeof ResizeObserver === "undefined") return;
    new ResizeObserver(() => { if (meliPlan) meliPlan(); }).observe(zoneEl);
})();

async function rendreMoisCourant() {
    const m = state.moisCourant;
    const annee = state.annee;
    const mois = m + 1;
    document.getElementById("mois-titre").textContent = MOIS_NOMS[m] + " " + annee;

    const annivs = state.donnees.anniversaires
        .filter(a => a.mois === mois && !state.exclus.has(a.nom))
        .sort((a, b) => a.jour - b.jour);

    const avecPhotos = (await Promise.all(annivs.map(async a => ({ ...a, url: await resoudrePhoto(a.nom) })))).filter(a => a.url);

    /* MÉLI-MÉLO : la disposition des photos du mois est faite plus bas, une
       fois la liste des anniversaires affichée — c'est elle qui donne sa
       hauteur à la zone photos, les deux colonnes restent donc alignées. */
    const melange = avecPhotos;


    const evenements = [];
    (state.donnees.jours_feries[annee] || []).forEach(f => {
        if (parseInt(f.date.split("-")[1]) === mois)
            evenements.push({ jour: parseInt(f.date.split("-")[2]), libelle: f.label, icone: "🎉" });
    });
    (state.donnees.evenements_speciaux[annee] || []).forEach(e => {
        if (parseInt(e.date.split("-")[1]) === mois)
            evenements.push({ jour: parseInt(e.date.split("-")[2]), libelle: e.label, icone: e.icone || "📌" });
    });
    evenements.sort((a, b) => a.jour - b.jour);
    const conges = [...new Set((state.donnees.vacances[annee] || [])
        .filter(v => mois >= parseInt(v.debut.split("-")[1]) && mois <= parseInt(v.fin.split("-")[1]))
        .map(v => v.label))];

    const today = new Date();
    const aujourdhui = (today.getMonth() === m && today.getFullYear() === annee) ? today.getDate() : 0;
    const duJour = annivs.filter(a => aujourdhui && a.jour === aujourdhui);

    document.getElementById("mois-infos").innerHTML = `
        ${duJour.length ? `<div style="background:linear-gradient(135deg,#fff3e0,#ffe0b2);border:1px solid #ffcc80;border-radius:8px;padding:8px 10px;margin-bottom:8px;font-weight:600;">
            🎉 Aujourd'hui : ${duJour.map(a => escapeHtml(a.nom)).join(", ")}</div>` : ""}
        <h3>🎂 Anniversaires (${annivs.length})</h3>
        <ul>${annivs.map(a => `<li><strong>${a.jour}</strong> : ${TYPE_ICONES[a.type] || "🎂"} ${escapeHtml(a.nom)} ${(a.annee && a.annee !== "") ? `(${annee - a.annee} ans)` : ""}</li>`).join("") || "<li>Aucun</li>"}</ul>
        ${evenements.length ? `<h3>📅 Événements</h3><ul>${evenements.map(e => `<li><strong>${e.jour}</strong> : ${e.icone} ${escapeHtml(e.libelle)}</li>`).join("")}</ul>` : ""}
        ${conges.length ? `<h3>🏖️ Congés</h3><ul>${conges.map(c => `<li>${escapeHtml(c)}</li>`).join("")}</ul>` : ""}`;

    /* Méli-mélo : disposé après la liste, dont la hauteur définit la zone. */
    meliMeloAfficher(document.getElementById("mois-photos"), melange,
        `meli-${annee}-${mois}-${state.graineMelange}`);

    const premierJour = (new Date(annee, m, 1).getDay() + 6) % 7;
    const joursDansMois = new Date(annee, m + 1, 0).getDate();
    let cal = `<table class="mois-table"><tr>${JOURS_NOMS.map(j => `<th>${j}</th>`).join("")}</tr><tr>`;
    for (let i = 0; i < premierJour; i++) cal += `<td></td>`;
    for (let d = 1; d <= joursDansMois; d++) {
        if ((premierJour + d - 1) % 7 === 0 && d > 1) cal += "</tr><tr>";
        const dateStr = annee + "-" + String(mois).padStart(2, "0") + "-" + String(d).padStart(2, "0");
        const isWE = [0, 6].includes(new Date(annee, m, d).getDay());
        const ferie = (state.donnees.jours_feries[annee] || []).find(f => f.date === dateStr);
        const spec = (state.donnees.evenements_speciaux[annee] || []).find(e => e.date === dateStr);
        const vac = (state.donnees.vacances[annee] || []).find(v => dateStr >= v.debut && dateStr <= v.fin);
        const cls = [ferie ? "is-holiday" : "", vac ? "is-vacation" : "", isWE ? "is-weekend" : "",
            d === aujourdhui ? "is-today" : ""].join(" ");
        const noms = annivs.filter(a => a.jour === d).map(a => `<div style="font-size:.72em;color:#e65100;">${escapeHtml(a.nom)}</div>`).join("");
        const icons = annivs.filter(a => a.jour === d).map(a => TYPE_ICONES[a.type] || "🎂").join("")
            + (ferie ? "🎉" : "") + (spec ? (spec.icone || "📌") : "");
        cal += `<td class="${cls}"><span class="day-num">${d}</span>${noms ? `<div class="noms-jour">${noms}</div>` : ""}<div class="icon-row">${icons}</div></td>`;
    }
    cal += "</tr></table>";
    document.getElementById("mois-cal").innerHTML = cal;
}

/* ================= Vue année ================= */
function rendreAnnee() {
    const grid = document.getElementById("annee-grid");
    const today = new Date();
    let html = "";
    for (let m = 0; m < 12; m++) {
        const mois = m + 1;
        const annivs = state.donnees.anniversaires
            .filter(a => a.mois === mois && !state.exclus.has(a.nom))
            .sort((a, b) => a.jour - b.jour);

        const premierJour = (new Date(state.annee, m, 1).getDay() + 6) % 7;
        const joursDansMois = new Date(state.annee, m + 1, 0).getDate();
        let cal = `<table class="mois-table"><tr>${JOURS_NOMS.map(j => `<th>${j}</th>`).join("")}</tr><tr>`;
        for (let i = 0; i < premierJour; i++) cal += `<td></td>`;
        let badges = new Set();
        for (let d = 1; d <= joursDansMois; d++) {
            if ((premierJour + d - 1) % 7 === 0 && d > 1) cal += "</tr><tr>";
            const dateStr = `${state.annee}-${String(mois).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const isWE = [0, 6].includes(new Date(state.annee, m, d).getDay());
            const ferie = (state.donnees.jours_feries[state.annee] || []).find(f => f.date === dateStr);
            const spec = (state.donnees.evenements_speciaux[state.annee] || []).find(e => e.date === dateStr);
            const vac = (state.donnees.vacances[state.annee] || []).find(v => dateStr >= v.debut && dateStr <= v.fin);
            const cls = [ferie ? "is-holiday" : "", vac ? "is-vacation" : "", isWE ? "is-weekend" : "",
                (d === today.getDate() && m === today.getMonth() && state.annee === today.getFullYear()) ? "is-today" : ""].join(" ");
            const icons = annivs.filter(a => a.jour === d).map(a => TYPE_ICONES[a.type] || "🎂").join("")
                + (ferie ? "🎉" : "") + (spec ? (spec.icone || "📌") : "");
            if (ferie) badges.add(`<span class="badge ferie">🎉 ${escapeHtml(ferie.label)}</span>`);
            if (vac) badges.add(`<span class="badge vac">🏖️ ${escapeHtml(vac.label)}</span>`);
            cal += `<td class="${cls}"><span class="day-num">${d}</span><div class="icon-row">${icons}</div></td>`;
        }
        cal += "</tr></table>";
        const nbAnniv = annivs.length;
        if (nbAnniv) badges.add(`<span class="badge anniv">🎂 ${nbAnniv} anniversaire${nbAnniv > 1 ? "s" : ""}</span>`);
        html += `<div class="mois-card" data-mois="${m}" title="Cliquez pour voir le détail">
            <h3>${MOIS_NOMS[m]}</h3>${cal}
            <div class="mois-badges">${[...badges].join("")}</div>
        </div>`;
    }
    grid.innerHTML = html;
    grid.querySelectorAll(".mois-card").forEach(c => {
        c.onclick = () => ouvrirModalMois(parseInt(c.dataset.mois));
    });
}

/* ================= Modal mois ================= */
async function ouvrirModalMois(m) {
    const mois = m + 1;
    const annee = state.annee;
    document.getElementById("modal-titre").textContent = `${MOIS_NOMS[m]} ${annee}`;

    const annivs = state.donnees.anniversaires
        .filter(a => a.mois === mois && !state.exclus.has(a.nom))
        .sort((a, b) => a.jour - b.jour);

    const avecPhotos = (await Promise.all(annivs.map(async a => ({ ...a, url: await resoudrePhoto(a.nom) })))).filter(a => a.url);
    document.getElementById("modal-photos").innerHTML = avecPhotos.map(a => {
        const note = (a.note && a.note.trim()) ? `<span class="photo-note">${escapeHtml(a.note)}</span>` : "";
        return `<div class="photo-wrapper">
            <div class="photo-img-wrap"><img src="${a.url}" alt="${escapeHtml(a.nom)}">${note}</div>
            <div class="photo-label">${escapeHtml(a.nom)}</div>
        </div>`;
    }).join("");

    const evenements = [];
    (state.donnees.jours_feries[annee] || []).forEach(f => {
        if (parseInt(f.date.split("-")[1]) === mois)
            evenements.push({ jour: parseInt(f.date.split("-")[2]), libelle: f.label, icone: "🎉" });
    });
    (state.donnees.evenements_speciaux[annee] || []).forEach(e => {
        if (parseInt(e.date.split("-")[1]) === mois)
            evenements.push({ jour: parseInt(e.date.split("-")[2]), libelle: e.label, icone: e.icone || "📌" });
    });
    evenements.sort((a, b) => a.jour - b.jour);
    const conges = [...new Set((state.donnees.vacances[annee] || [])
        .filter(v => mois >= parseInt(v.debut.split("-")[1]) && mois <= parseInt(v.fin.split("-")[1]))
        .map(v => v.label))];

    document.getElementById("modal-infos").innerHTML = `
        <h3>🎂 Anniversaires</h3>
        <ul>${annivs.map(a => `<li><strong>${a.jour}</strong> : ${TYPE_ICONES[a.type] || "🎂"} ${escapeHtml(a.nom)} ${(a.annee && a.annee !== "") ? `(${annee - a.annee} ans)` : ""}</li>`).join("") || "<li>Aucun</li>"}</ul>
        ${evenements.length ? `<h3>📅 Événements</h3><ul>${evenements.map(e => `<li><strong>${e.jour}</strong> : ${e.icone} ${escapeHtml(e.libelle)}</li>`).join("")}</ul>` : ""}
        ${conges.length ? `<h3>🏖️ Congés</h3><ul>${conges.map(c => `<li>${escapeHtml(c)}</li>`).join("")}</ul>` : ""}`;

    document.getElementById("modal-mois").classList.remove("hidden");
}
function fermerModal() {
    document.getElementById("modal-mois").classList.add("hidden");
}
document.getElementById("modal-mois").addEventListener("click", e => {
    if (e.target.id === "modal-mois") fermerModal();
});
document.addEventListener("keydown", e => { if (e.key === "Escape") fermerModal(); });

/* ================= Gestion ================= */
const TYPES = ["naissance", "mariage", "rencontre", "deces"];
let filtres = { personnes: "", photos: "", evenements: "" };

function rendreGestion() {
    rendrePersonnes();
    rendrePhotosGestion();
    rendreEvenements();
    const selF = document.getElementById("select-annee-feries");
    const selV = document.getElementById("select-annee-vacances");
    const annees = anneesDisponibles();
    selF.innerHTML = annees.map(a => `<option value="${a}">${a}</option>`).join("");
    selV.innerHTML = selF.innerHTML;
    selF.onchange = rendreFeries;
    selV.onchange = rendreVacances;
    rendreFeries();
    rendreVacances();
}

/* ----- Anniversaires ----- */
function rendrePersonnes() {
    const q = (document.getElementById("recherche-personne").value || "").toLowerCase();
    const tbody = document.querySelector("#table-personnes tbody");
    const liste = state.donnees.anniversaires
        .filter(a => a.nom.toLowerCase().includes(q))
        .sort((a, b) => a.mois - b.mois || a.jour - b.jour || a.nom.localeCompare(b.nom));
    tbody.innerHTML = liste.map((a, i) => {
        const idx = state.donnees.anniversaires.indexOf(a);
        return `<tr>
            <td><input data-idx="${idx}" data-champ="nom" value="${escapeHtml(a.nom)}"></td>
            <td><input type="number" min="1" max="31" data-idx="${idx}" data-champ="jour" value="${a.jour}" style="width:70px"></td>
            <td><select data-idx="${idx}" data-champ="mois">${MOIS_NOMS.map((n, mi) => `<option value="${mi + 1}" ${a.mois === mi + 1 ? "selected" : ""}>${n}</option>`).join("")}</select></td>
            <td><input type="number" data-idx="${idx}" data-champ="annee" value="${a.annee ?? ""}" style="width:90px" placeholder="—"></td>
            <td><select data-idx="${idx}" data-champ="type">${TYPES.map(t => `<option value="${t}" ${a.type === t ? "selected" : ""}>${TYPE_ICONES[t]} ${t}</option>`).join("")}</select></td>
            <td><input data-idx="${idx}" data-champ="note" value="${escapeHtml(a.note || "")}"></td>
            <td><button class="btn btn-danger btn-mini" data-suppr="${idx}">🗑️</button></td>
        </tr>`;
    }).join("");
    tbody.querySelectorAll("input, select").forEach(el => {
        el.onchange = () => {
            const a = state.donnees.anniversaires[parseInt(el.dataset.idx)];
            let v = el.value;
            if (el.dataset.champ === "jour" || el.dataset.champ === "mois") v = parseInt(v) || 1;
            if (el.dataset.champ === "annee") v = v === "" ? "" : parseInt(v);
            a[el.dataset.champ] = v;
            majDonnees();
        };
    });
    tbody.querySelectorAll("[data-suppr]").forEach(b => {
        b.onclick = () => {
            if (confirm("Supprimer cet anniversaire ?")) {
                state.donnees.anniversaires.splice(parseInt(b.dataset.suppr), 1);
                majDonnees();
            }
        };
    });
}

document.getElementById("btn-add-personne").onclick = () => {
    state.donnees.anniversaires.push({ jour: 1, mois: 1, nom: "Nouveau", annee: "", type: "naissance", note: "" });
    majDonnees();
    const tbody = document.querySelector("#table-personnes tbody");
    tbody.lastElementChild?.querySelector("input")?.focus();
};
document.getElementById("recherche-personne").oninput = rendrePersonnes;

/* ----- Photos ----- */
async function rendrePhotosGestion() {
    const q = (document.getElementById("recherche-photo").value || "").toLowerCase();
    const grid = document.getElementById("photos-grid");

    const uploadees = Object.keys(state.cachePhotos).filter(n => n.toLowerCase().includes(q)).sort()
        .map(n => ({ nom: n, url: state.cachePhotos[n], source: "upload" }));

    const personnes = [...new Set(state.donnees.anniversaires.map(a => a.nom))]
        .filter(n => n.toLowerCase().includes(q)).sort();
    const duDossier = (await Promise.all(personnes.map(async n => {
        if (state.cachePhotos[n]) return null;
        const url = await photoDossierURL(n);
        return url ? { nom: n, url, source: "dossier" } : null;
    }))).filter(Boolean);

    const items = [...uploadees, ...duDossier];
    grid.innerHTML = items.map(p => `<div class="photo-item">
        <img src="${p.url}" alt="${escapeHtml(p.nom)}">
        <div class="nom">${escapeHtml(p.nom)}</div>
        <div class="actions">${p.source === "upload"
            ? `<button class="btn btn-danger btn-mini" data-suppr-photo="${escapeHtml(p.nom)}">🗑️ Supprimer</button>`
            : `<span class="hint" style="margin:0">📁 Photos/</span>`}</div>
    </div>`).join("") || `<p class="hint">Aucune photo. Deux options : ① placez vos photos dans un dossier <strong>Photos/</strong> à côté d'index.html (ex. « Photos/Jarod Demoulin.jpg » — idéal pour un déploiement en ligne), ou ② cliquez sur « Ajouter des photos » pour les stocker dans ce navigateur.</p>`;

    grid.querySelectorAll("[data-suppr-photo]").forEach(b => {
        b.onclick = async () => {
            if (!confirm(`Supprimer la photo « ${b.dataset.supprPhoto} » ?`)) return;
            await photoDelete(b.dataset.supprPhoto);
            URL.revokeObjectURL(state.cachePhotos[b.dataset.supprPhoto]);
            delete state.cachePhotos[b.dataset.supprPhoto];
            rendrePhotosGestion(); rendreProchains(); rendreAnnee(); rendreMoisCourant();
            toast("Photo supprimée");
        };
    });
}
document.getElementById("recherche-photo").oninput = rendrePhotosGestion;

document.getElementById("file-photos").onchange = async (e) => {
    const fichiers = [...e.target.files];
    let ok = 0;
    for (const f of fichiers) {
        const nom = f.name.replace(/\.[^.]+$/, "");
        await photoSave(nom, f);
        if (state.cachePhotos[nom]) URL.revokeObjectURL(state.cachePhotos[nom]);
        state.cachePhotos[nom] = URL.createObjectURL(f);
        ok++;
    }
    e.target.value = "";
    Object.keys(cachePhotosDossier).forEach(k => delete cachePhotosDossier[k]);
    rendrePhotosGestion(); rendreProchains(); rendreAnnee(); rendreMoisCourant();
    toast(`${ok} photo(s) ajoutée(s)`);
};

/* ----- Événements spéciaux ----- */
function rendreEvenements() {
    const q = (document.getElementById("recherche-evenement").value || "").toLowerCase();
    const tbody = document.querySelector("#table-evenements tbody");
    const lignes = [];
    for (const [annee, evts] of Object.entries(state.donnees.evenements_speciaux || {})) {
        evts.forEach((e, i) => {
            if (!e.label.toLowerCase().includes(q)) return;
            lignes.push({ annee, e, i });
        });
    }
    lignes.sort((a, b) => a.annee.localeCompare(b.annee) || a.e.date.localeCompare(b.e.date));
    tbody.innerHTML = lignes.map(l => `<tr>
        <td>${l.annee}</td>
        <td><input type="date" value="${l.e.date}" data-ev="${l.annee}:${l.i}" data-champ="date"></td>
        <td><input value="${escapeHtml(l.e.label)}" data-ev="${l.annee}:${l.i}" data-champ="label"></td>
        <td><input value="${escapeHtml(l.e.icone || "")}" data-ev="${l.annee}:${l.i}" data-champ="icone" style="width:60px"></td>
        <td><button class="btn btn-danger btn-mini" data-suppr-ev="${l.annee}:${l.i}">🗑️</button></td>
    </tr>`).join("");
    tbody.querySelectorAll("[data-ev]").forEach(el => {
        el.onchange = () => {
            const [annee, idx] = el.dataset.ev.split(":");
            state.donnees.evenements_speciaux[annee][parseInt(idx)][el.dataset.champ] = el.value;
            majDonnees();
        };
    });
    tbody.querySelectorAll("[data-suppr-ev]").forEach(b => {
        b.onclick = () => {
            const [annee, idx] = b.dataset.supprEv.split(":");
            if (!confirm("Supprimer cet événement ?")) return;
            state.donnees.evenements_speciaux[annee].splice(parseInt(idx), 1);
            majDonnees();
        };
    });
}
document.getElementById("btn-add-evenement").onclick = () => {
    const a = String(state.annee);
    if (!state.donnees.evenements_speciaux[a]) state.donnees.evenements_speciaux[a] = [];
    state.donnees.evenements_speciaux[a].push({ date: `${a}-01-01`, label: "Nouvel événement", icone: "📌" });
    majDonnees();
};
document.getElementById("recherche-evenement").oninput = rendreEvenements;

/* ----- Jours fériés ----- */
function rendreFeries() {
    const annee = document.getElementById("select-annee-feries").value;
    const tbody = document.querySelector("#table-feries tbody");
    const liste = (state.donnees.jours_feries[annee] || []);
    tbody.innerHTML = liste.map((f, i) => `<tr>
        <td><input type="date" value="${f.date}" data-ferie="${i}" data-champ="date"></td>
        <td><input value="${escapeHtml(f.label)}" data-ferie="${i}" data-champ="label"></td>
        <td><button class="btn btn-danger btn-mini" data-suppr-ferie="${i}">🗑️</button></td>
    </tr>`).join("");
    tbody.querySelectorAll("[data-ferie]").forEach(el => {
        el.onchange = () => {
            state.donnees.jours_feries[annee][parseInt(el.dataset.ferie)][el.dataset.champ] = el.value;
            majDonnees();
        };
    });
    tbody.querySelectorAll("[data-suppr-ferie]").forEach(b => {
        b.onclick = () => {
            if (!confirm("Supprimer ce jour férié ?")) return;
            state.donnees.jours_feries[annee].splice(parseInt(b.dataset.supprFerie), 1);
            majDonnees();
        };
    });
}
document.getElementById("btn-add-ferie").onclick = () => {
    const annee = document.getElementById("select-annee-feries").value;
    if (!state.donnees.jours_feries[annee]) state.donnees.jours_feries[annee] = [];
    state.donnees.jours_feries[annee].push({ date: `${annee}-01-01`, label: "Nouveau férié" });
    majDonnees();
};

/* Jours fériés belges : fixes + calcul de Pâques (Meeus/Jones/Butcher) */
function lundiPaques(annee) {
    const a = annee % 19, b = Math.floor(annee / 100), c = annee % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mois = Math.floor((h + l - 7 * m + 114) / 31);
    const jour = ((h + l - 7 * m + 114) % 31) + 1;
    const paques = new Date(annee, mois - 1, jour + 1);
    return paques.getFullYear() + "-" + String(paques.getMonth() + 1).padStart(2, "0") + "-" + String(paques.getDate()).padStart(2, "0");
}
function ajouterJours(dateStr, n) {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + n);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
document.getElementById("btn-generer-feries").onclick = () => {
    const annee = parseInt(document.getElementById("select-annee-feries").value);
    if (!confirm(`Générer les jours fériés belges pour ${annee} ? (remplace la liste existante pour cette année)`)) return;
    const lp = lundiPaques(annee);
    state.donnees.jours_feries[annee] = [
        { date: `${annee}-01-01`, label: "Nouvel An" },
        { date: lp, label: "Lundi de Pâques" },
        { date: `${annee}-05-01`, label: "Fête du Travail" },
        { date: ajouterJours(lp, 38), label: "Ascension" },
        { date: ajouterJours(lp, 49), label: "Lundi de Pentecôte" },
        { date: `${annee}-07-21`, label: "Fête Nationale" },
        { date: `${annee}-08-15`, label: "Assomption" },
        { date: `${annee}-11-01`, label: "Toussaint" },
        { date: `${annee}-11-11`, label: "Armistice" },
        { date: `${annee}-12-25`, label: "Noël" }
    ];
    majDonnees();
    initSelectAnnees();
    toast(`Jours fériés ${annee} générés`);
};

/* ----- Vacances ----- */
function rendreVacances() {
    const annee = document.getElementById("select-annee-vacances").value;
    const tbody = document.querySelector("#table-vacances tbody");
    const liste = (state.donnees.vacances[annee] || []);
    tbody.innerHTML = liste.map((v, i) => `<tr>
        <td><input type="date" value="${v.debut}" data-vac="${i}" data-champ="debut"></td>
        <td><input type="date" value="${v.fin}" data-vac="${i}" data-champ="fin"></td>
        <td><input value="${escapeHtml(v.label)}" data-vac="${i}" data-champ="label"></td>
        <td><button class="btn btn-danger btn-mini" data-suppr-vac="${i}">🗑️</button></td>
    </tr>`).join("");
    tbody.querySelectorAll("[data-vac]").forEach(el => {
        el.onchange = () => {
            state.donnees.vacances[annee][parseInt(el.dataset.vac)][el.dataset.champ] = el.value;
            majDonnees();
        };
    });
    tbody.querySelectorAll("[data-suppr-vac]").forEach(b => {
        b.onclick = () => {
            if (!confirm("Supprimer ces vacances ?")) return;
            state.donnees.vacances[annee].splice(parseInt(b.dataset.supprVac), 1);
            majDonnees();
        };
    });
}
document.getElementById("btn-add-vacances").onclick = () => {
    const annee = document.getElementById("select-annee-vacances").value;
    if (!state.donnees.vacances[annee]) state.donnees.vacances[annee] = [];
    state.donnees.vacances[annee].push({ debut: `${annee}-01-01`, fin: `${annee}-01-07`, label: "Nouvelles vacances" });
    majDonnees();
};

/* ================= Export / Import ================= */
function exporterJSON() {
    const blob = new Blob([JSON.stringify(state.donnees, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `calendrier-familial-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Sauvegarde exportée (les photos ne sont pas incluses)");
}

/* ================= Publication Cloud (eCalendar Family) ================= */
let cloudTactile = null;

async function publierCloud() {
    let cfg = syncChargerConfig("calfam");
    if (!cfg || !cfg.url) {
        cfg = await modaleSyncConfig();
        if (!cfg) return;
    }
    const btn = document.getElementById("btn-cloud");
    const ancien = btn.textContent;
    btn.textContent = "⏳ Publication…";
    try {
        await syncPublier("calfam", "calfam", state.donnees);
        toast("Publié vers le Cloud ☁️ — visible sur eCalendar Family");
    } catch (e) {
        toast("Publication échouée : " + e.message + " — clic droit sur ☁️ pour corriger la config", true);
    }
    btn.textContent = ancien;
}

function modaleSyncConfig() {
    const cfg = syncChargerConfig("calfam") || { url: "", jeton: "" };
    const html = `<div style="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:400;display:flex;align-items:center;justify-content:center;padding:16px">
      <div style="background:#3d3d3d;color:#fff;border-radius:8px;padding:20px;max-width:520px;width:100%">
        <h2 style="margin:0 0 12px">☁️ Configuration du Cloud (cal-sync)</h2>
        <label style="display:block;font-size:.85em;margin:10px 0 4px">URL du Cloud (worker cal-sync)</label>
        <input id="sc-url" style="width:100%;padding:10px;border-radius:8px;border:1px solid #4a4a4a;background:#333;color:#fff" placeholder="https://sync.edukisto.win" value="${cfg.url || "https://sync.edukisto.win"}">
        <label style="display:block;font-size:.85em;margin:10px 0 4px">Jeton secret de la famille</label>
        <input id="sc-jeton" style="width:100%;padding:10px;border-radius:8px;border:1px solid #4a4a4a;background:#333;color:#fff" placeholder="Même mot de passe familial que partout" value="${cfg.jeton}">
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
          <button id="sc-annuler" style="padding:10px 16px;border:none;border-radius:8px;background:#4a4a4a;color:#fff;cursor:pointer">Annuler</button>
          <button id="sc-ok" style="padding:10px 16px;border:none;border-radius:8px;background:#38bdf8;color:#10222e;font-weight:600;cursor:pointer">Enregistrer et publier</button>
        </div>
      </div></div>`;
    const div = document.createElement("div");
    div.innerHTML = html;
    document.body.appendChild(div);
    return new Promise(resolve => {
        div.querySelector("#sc-annuler").onclick = () => { div.remove(); resolve(null); };
        div.querySelector("#sc-ok").onclick = async () => {
            const btnOk = div.querySelector("#sc-ok");
            const c = { url: div.querySelector("#sc-url").value.trim().replace(/\/+$/, ""), jeton: div.querySelector("#sc-jeton").value.trim() };
            if (!c.url || !c.jeton) { toast("Remplissez les 2 champs.", true); return; }
            btnOk.textContent = "⏳ Vérification…";
            const err = await syncVerifier("calfam", c);
            if (err) { btnOk.textContent = "Enregistrer et publier"; toast(err, true); return; }
            syncSauverConfig("calfam", c);
            div.remove();
            resolve(c);
        };
    });
}

async function importerJSON(e) {
    const f = e.target.files[0];
    if (!f) return;
    if (!confirm("Remplacer toutes les données actuelles par ce fichier ?")) { e.target.value = ""; return; }
    try {
        const donnees = JSON.parse(await f.text());
        if (!donnees.anniversaires) throw new Error("Fichier invalide");
        state.donnees = donnees;
        sauverDonnees(donnees);
        state.annee = parseInt(document.getElementById("select-annee").value) || state.annee;
        initSelectAnnees();
        afficherAlerte(); rendreMoisCourant(); rendreAnnee(); rendreProchains(); rendreGestion();
        toast("Données importées");
    } catch (err) {
        toast("Import impossible : " + err.message, true);
    }
    e.target.value = "";
}

/* ================= Utilitaires ================= */
function majDonnees() {
    sauverDonnees(state.donnees);
    afficherAlerte(); rendreMoisCourant(); rendreAnnee(); rendreProchains();
    rendrePersonnes(); rendreEvenements(); rendreFeries(); rendreVacances(); rendrePhotosGestion();
}

/* ===== Signature & lien portfolio ===== */
(function addFooterSignature() {
  const footer = document.createElement("div");
  footer.className = "app-footer-signature";
  footer.innerHTML = '<span class="sig-line">──</span> <a href="https://edukisto.win/" target="_blank" rel="noopener" title="edukisto — relier & orienter" style="color:#0e7490;text-decoration:none"><svg width="14" height="14" viewBox="0 0 64 64" style="vertical-align:-2px"><path d="M32 3l5.2 18.2 10.8-5.2-5.2 10.8L61 32l-18.2 5.2 5.2 10.8-10.8-5.2L32 61l-5.2-18.2-10.8 5.2 5.2-10.8L3 32l18.2-5.2-5.2-10.8 10.8 5.2z" fill="currentColor"/></svg> edukisto</a> <span class="sig-line">──</span>';
  document.body.appendChild(footer);
  const st = document.createElement("style");
  st.textContent = [
    ".app-footer-signature{text-align:center;padding:16px 10px 24px;font-size:12px;opacity:.55}",
    ".app-footer-signature a{color:inherit;text-decoration:none;letter-spacing:.02em}",
    ".app-footer-signature a:hover{opacity:1}",
    ".app-footer-signature .sig-line{opacity:.5;letter-spacing:-2px;vertical-align:middle}",
  ].join("");
  document.head.appendChild(st);
})();
