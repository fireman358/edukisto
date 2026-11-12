"use strict";
/* ===== Sons Edukisto Home — Web Audio (synthétiques, zéro fichier) =====
   - jingleAnniversaire() : petit « Joyeux anniversaire » synthétique le jour J
   - carillonEtoile() : note joyeuse quand un enfant gagne une étoile
   - carillonTache() : coche de tâche validée
   - ambianceMural() : musique d'ambiance générative (mode mural)
   Tous désactivables dans Réglages → Écran (option Sons). */

let ctxAudio = null;

function contexteAudio() {
    if (!ctxAudio) {
        try { ctxAudio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    }
    if (ctxAudio.state === "suspended") ctxAudio.resume();
    return ctxAudio;
}

/* Joue une note (fréquence Hz, durée s, délai s, volume) */
function note(freq, duree = 0.3, delai = 0, volume = 0.25, type = "triangle") {
    const ctx = contexteAudio();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime + delai);
    g.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + delai + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delai + duree);
    o.connect(g).connect(ctx.destination);
    o.start(ctx.currentTime + delai);
    o.stop(ctx.currentTime + delai + duree + 0.05);
}

function sonsActifs() {
    try { return JSON.parse(localStorage.getItem("ecalfam-sons") || "true") !== false; } catch (e) { return true; }
}
function basculerSons() {
    localStorage.setItem("ecalfam-sons", sonsActifs() ? "false" : "true");
}

/* 🎂 Jingle d'anniversaire — extrait de « Joyeux anniversaire » */
function jingleAnniversaire() {
    if (!sonsActifs()) return;
    // G G A G C B (début du thème)
    const G4 = 392, A4 = 440, C5 = 523.25, B4 = 493.88;
    note(G4, 0.28, 0.00); note(G4, 0.28, 0.30);
    note(A4, 0.28, 0.60); note(G4, 0.28, 0.90); note(C5, 0.28, 1.20);
    note(B4, 0.50, 1.50);
}

/* ⭐ Carillon étoile — petite montée joyeuse */
function carillonEtoile() {
    if (!sonsActifs()) return;
    const notes = [523.25, 659.25, 783.99];  // C5 E5 G5
    notes.forEach((f, i) => note(f, 0.22, i * 0.09, 0.22, "sine"));
}

/* ✅ Coche de tâche */
function carillonTache() {
    if (!sonsActifs()) return;
    note(659.25, 0.15, 0, 0.2, "sine");
    note(987.77, 0.20, 0.08, 0.18, "sine");
}

/* ===== Ambiances musicales : mélodies complètes et distinctes =====
   Chaque ambiance est une vraie séquence composée (mélodie + basse),
   jouée en boucle avec un léger espace entre les répétitions. */

let ambianceTimer = null;
let ambiancePiste = 0;

/* Notes de référence : C4=261.63, D4=293.66, E4=329.63, F4=349.23, G4=392.00,
   A4=440.00, B4=493.88, et à l'octave : C5=523.25, D5=587.33, E5=659.25, G5=783.99, A5=880 */

const AMBIANCES = [
    {
        nom: "Bergerie",
        /* Mélodie pastorale en Do majeur — calme, évoque la campagne */
        duree: 18,
        notes: [
            [523.25, 0.5, 0.0, 0.10], [587.33, 0.5, 0.5, 0.10], [659.25, 1.0, 1.0, 0.11],
            [587.33, 0.5, 2.0, 0.10], [523.25, 0.5, 2.5, 0.10], [392.00, 1.0, 3.0, 0.10],
            [440.00, 0.5, 4.0, 0.10], [523.25, 0.5, 4.5, 0.10], [587.33, 1.0, 5.0, 0.11],
            [523.25, 0.5, 6.5, 0.10], [493.88, 0.5, 7.0, 0.10], [523.25, 1.0, 7.5, 0.12],
            [659.25, 0.5, 9.0, 0.10], [783.99, 0.5, 9.5, 0.11], [659.25, 1.0, 10.0, 0.11],
            [587.33, 0.5, 11.5, 0.10], [523.25, 0.5, 12.0, 0.10], [587.33, 1.0, 12.5, 0.11],
            [523.25, 1.5, 14.0, 0.12], [392.00, 2.0, 15.5, 0.10],
            [130.81, 2.0, 0.0, 0.07], [98.00, 2.0, 2.5, 0.07], [130.81, 2.0, 5.0, 0.07],
            [87.31, 2.0, 7.5, 0.07], [130.81, 2.0, 10.0, 0.07], [98.00, 2.0, 12.5, 0.07], [130.81, 2.5, 15.5, 0.07]
        ]
    },
    {
        nom: "Vagues",
        /* Mélodie contemplative en La mineur — envoûtante, bord de mer */
        duree: 20,
        notes: [
            [440.00, 1.0, 0.0, 0.10], [523.25, 1.0, 1.0, 0.10], [659.25, 1.5, 2.0, 0.11],
            [587.33, 0.5, 3.5, 0.10], [523.25, 1.0, 4.0, 0.10], [440.00, 1.5, 5.0, 0.11],
            [493.88, 0.5, 6.5, 0.10], [523.25, 1.0, 7.0, 0.10], [587.33, 1.5, 8.0, 0.11],
            [523.25, 0.5, 9.5, 0.10], [493.88, 1.0, 10.0, 0.10], [440.00, 1.5, 11.0, 0.11],
            [392.00, 0.5, 12.5, 0.10], [440.00, 1.0, 13.0, 0.10], [523.25, 2.0, 14.0, 0.12],
            [440.00, 1.0, 16.0, 0.10], [392.00, 1.0, 17.0, 0.10], [329.63, 2.0, 18.0, 0.10],
            [110.00, 2.0, 0.0, 0.07], [110.00, 2.0, 4.0, 0.07], [87.31, 2.0, 8.0, 0.07], [110.00, 2.0, 11.0, 0.07],
            [130.81, 2.0, 14.0, 0.07], [110.00, 2.0, 17.0, 0.07]
        ]
    },
    {
        nom: "Nuit étoilée",
        /* Berceuse en Sol majeur — douce, pour les soirs */
        duree: 16,
        notes: [
            [783.99, 0.5, 0.0, 0.09], [659.25, 0.5, 0.5, 0.09], [587.33, 1.0, 1.0, 0.10],
            [659.25, 0.5, 2.0, 0.09], [587.33, 0.5, 2.5, 0.09], [493.88, 1.0, 3.0, 0.10],
            [392.00, 0.5, 4.0, 0.09], [493.88, 0.5, 4.5, 0.09], [587.33, 1.0, 5.0, 0.10],
            [659.25, 0.5, 6.5, 0.09], [587.33, 0.5, 7.0, 0.09], [493.88, 1.0, 7.5, 0.10],
            [587.33, 1.0, 9.0, 0.10], [783.99, 1.0, 10.0, 0.10], [880.00, 1.5, 11.0, 0.11],
            [783.99, 0.5, 12.5, 0.09], [659.25, 0.5, 13.0, 0.09], [587.33, 1.5, 13.5, 0.10],
            [392.00, 3.0, 15.0, 0.10],
            [98.00, 2.0, 0.0, 0.06], [98.00, 2.0, 3.0, 0.06], [130.81, 2.0, 6.5, 0.06],
            [98.00, 2.0, 9.0, 0.06], [87.31, 2.0, 12.5, 0.06], [98.00, 3.0, 15.0, 0.06]
        ]
    },
    {
        nom: "Jardin zen",
        /* Séquence pentatonique orientale — apaisante, méditative */
        duree: 15,
        notes: [
            [587.33, 0.75, 0.0, 0.09], [659.25, 0.75, 0.75, 0.09], [783.99, 1.0, 1.5, 0.10],
            [659.25, 0.5, 2.5, 0.09], [587.33, 1.0, 3.0, 0.09],
            [440.00, 0.75, 4.0, 0.09], [523.25, 0.75, 4.75, 0.09], [587.33, 1.0, 5.5, 0.10],
            [523.25, 0.5, 6.5, 0.09], [440.00, 1.0, 7.0, 0.09],
            [783.99, 0.75, 8.0, 0.10], [880.00, 0.75, 8.75, 0.10], [1174.66, 1.0, 9.5, 0.10],
            [880.00, 0.5, 10.5, 0.09], [783.99, 1.0, 11.0, 0.09],
            [587.33, 1.0, 12.0, 0.09], [523.25, 1.0, 13.0, 0.09], [440.00, 1.5, 14.0, 0.10],
            [146.83, 2.0, 0.0, 0.06], [110.00, 2.0, 4.0, 0.06], [146.83, 2.0, 8.0, 0.06], [110.00, 2.0, 12.0, 0.06]
        ]
    }
];

function demarrerAmbiance(piste) {
    if (!sonsActifs()) return;
    arreterAmbiance();
    if (typeof piste === "number") ambiancePiste = piste;
    const a = AMBIANCES[ambiancePiste % AMBIANCES.length];
    const jouerTour = () => {
        a.notes.forEach(function (n) {
            note(n[0], n[1], n[2], n[3], "sine");
        });
    };
    jouerTour();
    ambianceTimer = setInterval(jouerTour, (a.duree + 2) * 1000);
}

function ambianceSuivante() {
    ambiancePiste = (ambiancePiste + 1) % AMBIANCES.length;
    demarrerAmbiance(ambiancePiste);
}

function arreterAmbiance() {
    clearInterval(ambianceTimer);
    ambianceTimer = null;
}
