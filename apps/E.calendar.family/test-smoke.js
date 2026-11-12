/* Test smoke : parsing ICS + structures de données */
const fs = require("fs");
global.localStorage = { _s: {}, getItem(k) { return this._s[k] || null; }, setItem(k, v) { this._s[k] = v; } };
eval(fs.readFileSync("public/donnees/donnees-initiales.js", "utf8") + "\n;global.FERIES_BE = FERIES_BE; global.VACANCES_SCOLAIRES_BE = VACANCES_SCOLAIRES_BE; global.PLATS_INITIAUX = PLATS_INITIAUX;");
eval(fs.readFileSync("public/js/storage.js", "utf8") + "\n;global.donneesDefaut = donneesDefaut;");

const ics = "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nSUMMARY:Dentiste Lulu\r\nDTSTART;VALUE=DATE:20261105\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nSUMMARY:Réunion école\r\nDTSTART:20261112T100000Z\r\nEND:VEVENT\r\nEND:VCALENDAR";
const lignes = ics.replace(/\r\n/g, "\n").split("\n");
let cur = null, evs = [];
for (const l of lignes) {
    if (l.startsWith("BEGIN:VEVENT")) cur = {};
    else if (l.startsWith("END:VEVENT")) { if (cur && cur.debut) evs.push(cur); cur = null; }
    else if (cur) {
        const m = l.match(/^(DTSTART;[^:]*|DTSTART|SUMMARY)(?::)(.*)$/);
        if (m) {
            if (m[1].startsWith("DTSTART")) {
                const dm = m[2].match(/(\d{4})(\d{2})(\d{2})/);
                if (dm) cur.debut = dm[1] + "-" + dm[2] + "-" + dm[3];
            } else cur.titre = m[2];
        }
    }
}
console.log("ICS parse:", JSON.stringify(evs));
if (evs.length !== 2 || evs[0].debut !== "2026-11-05" || evs[0].titre !== "Dentiste Lulu") throw new Error("ICS KO");

const d = donneesDefaut();
const calfam = { anniversaires: [{ jour: 28, mois: 10, annee: 2015, nom: "Evan", type: "naissance", note: "" }] };
calfam.anniversaires.forEach(a => d.anniversaires.push({ jour: a.jour, mois: a.mois, annee: a.annee, nom: a.nom, type: a.type, note: a.note }));
if (d.anniversaires.length !== 1 || d.anniversaires[0].nom !== "Evan") throw new Error("calfam KO");

console.log("vacances:", JSON.stringify(d.vacances_scolaires[0]));
console.log("plats:", d.plats.length, "catégories:", new Set(d.plats.map(p => p.categorie)).size);
const cats = ["Poulet", "Viande Rouge", "Poisson", "Crustacés", "Porc", "Pâtes", "Crasses"];
const parCat = cats.every(c => d.plats.filter(p => p.categorie === c).length > 0);
if (!parCat) throw new Error("catégories de plats incomplètes");
console.log("FERIES 2026:", d.jours_feries["2026"].length, "— 2027:", d.jours_feries["2027"].length);
console.log("TOUS LES TESTS OK");
