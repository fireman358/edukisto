"use strict";
/* ===== Persistance locale (localStorage) — aucune donnée envoyée en ligne ===== */
const CLE = "ecalendar-famille-donnees";

function donneesDefaut() {
    return {
        membres: [
            { id: "m1", nom: "Membre 1", couleur: "#0e7490", points: 0 },
            { id: "m2", nom: "Membre 2", couleur: "#38bdf8", points: 0 }
        ],
        anniversaires: [],
        jours_feries: JSON.parse(JSON.stringify(FERIES_BE)),
        vacances_scolaires: JSON.parse(JSON.stringify(VACANCES_SCOLAIRES_BE)),
        evenements: [],
        evenementsICS: [],
        icsSources: [],
        plats: JSON.parse(JSON.stringify(PLATS_INITIAUX)),
        planRepas: {},
        taches: [],
        objectifs: [],
        listes: [
            { id: "l1", nom: "Courses", items: [] }
        ],
        dateInstallation: null,
        reglages: {
            sombre: false, veille: false, memoireRepas: 2, nbPersonnes: 4,
            equilibreParfait: true,
            frequences: { "Végétarien": -1, "Poulet": 1, "Viande Rouge": 1, "Poisson": 1, "Crustacés": 1, "Porc": 1, "Pâtes": 1, "Crasses": 1, "À commander": 1 }, cadreTiming: 8, cadreDouble: false, muralVues: ["aujourdhui", "calendrier", "repas"], muralDuree: 30 },
        photosUpload: [],
        musiques: [],
        radios: [
            { id: "r-contact", nom: "Radio Contact", url: "http://audiostream.rtl.be/1/autres" },
            { id: "r-belrtl", nom: "Bel RTL", url: "http://audiostream.rtl.be/2/autres" },
            { id: "r-vivacite", nom: "VivaCité Bruxelles", url: "https://radio.rtbf.be/viva-bxl/mp3-160/me" },
            { id: "r-classic21", nom: "Classic 21", url: "https://radio.rtbf.be/c21/mp3-160/me" },
            { id: "r-tipik", nom: "TIP!K", url: "https://radio.rtbf.be/tipik/mp3-160/me" },
            { id: "r-contactmax", nom: "Contact MAX", url: "http://audiostream.rtl.be/4/autres" },
            { id: "r-europe1", nom: "Europe 1", url: "https://stream.europe1.fr/europe1.mp3" }
        ]
    };
}

function chargerDonnees() {
    try {
        const brut = localStorage.getItem(CLE);
        if (!brut) return donneesDefaut();
        const d = Object.assign(donneesDefaut(), JSON.parse(brut));
        /* Fusion profonde des réglages : les nouveaux champs par défaut
           (frequences, equilibreParfait…) survivent aux anciennes sauvegardes */
        d.reglages = Object.assign({}, donneesDefaut().reglages, d.reglages || {});
        if (!d.reglages.frequences) d.reglages.frequences = donneesDefaut().reglages.frequences;
        return d;
    } catch (e) {
        console.warn("Stockage illisible, remise à zéro :", e);
        return donneesDefaut();
    }
}

function sauverDonnees(d) {
    localStorage.setItem(CLE, JSON.stringify(d));
}
