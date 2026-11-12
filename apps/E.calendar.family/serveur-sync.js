#!/usr/bin/env node
/* ============================================================
   eCalendar Family — serveur de synchronisation local (zéro dépendance)
   ------------------------------------------------------------
   Remplace le projet Supabase pour la famille de données partagées.
   Imite l'API REST utilisée par js/sync.js (famille_publier,
   famille_lire, famille_horodatage) + le proxy ICS (famille_proxy_ics).

   Démarrage :  node serveur-sync.js           (port 8788)
   Partage :    node serveur-sync.js 0.0.0.0    (accessible sur le réseau)

   Ensuite, dans chaque app (calfam, repas, eCalendar Family) :
     URL du Cloud : http://localhost:8788
     Clé anon    : local (n'importe quoi, non utilisée)
     Jeton       : le même mot de passe familial partout
   ============================================================ */
"use strict";
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const HOST = process.argv[2] || "127.0.0.1";
const PORT = parseInt(process.argv[3] || "8788", 10);
const FICHIER = path.join(__dirname, "sync-donnees.json");

const HASH_JETON = process.env.FAMILLE_JETON || "";

function charger() {
    try { return JSON.parse(fs.readFileSync(FICHIER, "utf8")); }
    catch (e) { return { familles: {} }; }
}
function sauver(d) {
    fs.writeFileSync(FICHIER, JSON.stringify(d, null, 2));
}
function hash(txt) {
    return crypto.createHash("sha256").update(String(txt)).digest("hex");
}

function corps(req) {
    return new Promise((resolve, reject) => {
        let t = "";
        req.on("data", c => { t += c; if (t.length > 5e6) req.destroy(); });
        req.on("end", () => { try { resolve(t ? JSON.parse(t) : {}); } catch (e) { resolve({}); } });
        req.on("error", reject);
    });
}

function telecharger(url) {
    return new Promise((resolve, reject) => {
        (async () => {
            const r = await fetch(url);
            const txt = await r.text();
            resolve({ statut: r.status, texte: txt });
        })().catch(reject);
    });
}

const server = http.createServer(async (req, res) => {
    const envoyer = (code, obj) => {
        res.writeHead(code, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, apikey, Authorization"
        });
        res.end(JSON.stringify(obj));
    };
    if (req.method === "OPTIONS") return envoyer(204, {});

    const url = new URL(req.url, "http://x");
    const route = url.pathname.replace(/\/$/, "");

    if (route === "/health") return envoyer(200, { ok: true, service: "eCalendar Family sync" });

    if (route.startsWith("/rest/v1/rpc/")) {
        const fn = route.split("/").pop();
        const p = await corps(req);
        const d = charger();

        if (fn === "famille_publier") {
            if (HASH_JETON && hash(p.p_jeton) !== HASH_JETON) return envoyer(403, { error: "Jeton invalide" });
            d.familles[p.p_id] = { jeton: hash(p.p_jeton), contenu: p.p_contenu, maj: new Date().toISOString() };
            sauver(d);
            return envoyer(200, true);
        }
        if (fn === "famille_lire") {
            const f = d.familles[p.p_id];
            if (!f || f.jeton !== hash(p.p_jeton)) return envoyer(200, { vide: true });
            return envoyer(200, f.contenu);
        }
        if (fn === "famille_horodatage") {
            const f = d.familles[p.p_id];
            return envoyer(200, f && f.jeton === hash(p.p_jeton) ? f.maj : null);
        }
        if (fn === "famille_proxy_ics") {
            if (!/^https:\/\/calendar\.google\.com\/calendar\/ical\//.test(p.p_url || "")) {
                return envoyer(400, { error: "URL non autorisée" });
            }
            try {
                const r = await telecharger(p.p_url);
                return envoyer(200, r);
            } catch (e) {
                return envoyer(502, { erreur: "Téléchargement impossible", texte: null });
            }
        }
        return envoyer(404, { error: "Fonction inconnue" });
    }
    return envoyer(404, { error: "Route inconnue" });
});

server.listen(PORT, HOST, () => {
    console.log("☁️  Sync eCalendar Family : http://" + (HOST === "0.0.0.0" ? "<IP-de-cette-machine>" : HOST) + ":" + PORT);
    console.log("   Fichier de données : " + FICHIER);
    console.log("   Dans les apps → URL du Cloud : cette adresse, clé anon : 'local', jeton : votre mot de passe familial");
});
