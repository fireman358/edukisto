"use strict";
/* ===== Pont Cloud — partagé entre calfam, repas et eCalendar Family =====
   Mode "API cal-sync" (Worker Cloudflare + base D1 cal_sync, table famille_sync) :
   - GET  /api/sync?jeton=<id>  → lecture de la ligne
   - POST /api/sync             → upsert de la ligne (contenu chiffré stocké tel quel)
   - POST /api/ics (p_url)      → proxy ICS des agendas Google
   - le contenu est CHIFFRÉ côté navigateur (AES-GCM) avec le jeton familial :
     sans le jeton, les données sont illisibles — même avec l'URL.
   Config par app : URL du worker cal-sync + jeton secret famille. */

const SYNC_CLES = {
    calfam: "ecalfam-sync-config",
    repas: "ecalfam-sync-config-repas",
    ecal: "ecalfam-sync-config"
};

/* Serveur de sauvegarde edukisto — pré-configuré */
const SYNC_DEFAUT = {
    url: "https://sync.edukisto.win"
};

function syncSauverConfig(app, cfg) {
    if (cfg && cfg.url) {
        cfg.url = syncNormaliserURL(cfg.url);
    }
    localStorage.setItem(SYNC_CLES[app], JSON.stringify(cfg));
}

function syncNormaliserURL(url) {
    return String(url || "")
        .replace(/\/*$/, "")
        .replace(/\/rest\/v1$/, "")
        .replace(/\/api$/, "");
}

function syncChargerConfig(app) {
    try {
        let cfg = JSON.parse(localStorage.getItem(SYNC_CLES[app]) || "null");
        if (!cfg) return null;
        /* Migration auto : ancienne config Supabase → worker cal-sync */
        if (cfg.url && /supabase\.co$/.test(cfg.url)) {
            cfg = { ...cfg, url: SYNC_DEFAUT.url };
            delete cfg.anon;
        }
        if (cfg.url) cfg.url = syncNormaliserURL(cfg.url);
        return cfg;
    } catch (e) { return null; }
}

/* ----- Chiffrement AES-GCM dérivé du jeton (Web Crypto) ----- */
async function syncCle(jeton) {
    const enc = new TextEncoder();
    const base = await crypto.subtle.importKey("raw", enc.encode(jeton), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: enc.encode("ecalendar-family"), iterations: 100000, hash: "SHA-256" },
        base,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

async function syncChiffrer(jeton, donnees) {
    const cle = await syncCle(jeton);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const clair = new TextEncoder().encode(JSON.stringify(donnees));
    const buf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cle, clair);
    const bytes = new Uint8Array(buf);
    let bin = "";
    bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin) + ":" + btoa(String.fromCharCode(...iv));
}

async function syncDechiffrer(jeton, code) {
    try {
        const [dataB64, ivB64] = code.split(":");
        if (!ivB64) return null;
        const cle = await syncCle(jeton);
        const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
        const data = Uint8Array.from(atob(dataB64), c => c.charCodeAt(0));
        const buf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cle, data);
        return JSON.parse(new TextDecoder().decode(buf));
    } catch (e) {
        return null;
    }
}

/* ----- Accès à l'API cal-sync (table famille_sync via D1) ----- */
async function syncHeaders(cfg) {
    return { "Content-Type": "application/json" };
}

async function syncPublier(app, id, donnees) {
    const cfg = syncChargerConfig(app);
    if (!cfg || !cfg.url) throw new Error("Cloud non configuré");
    const chiffe = await syncChiffrer(cfg.jeton, donnees);
    /* POST upsert — le worker gère l'insertion comme la mise à jour (ON CONFLICT) */
    const r = await fetch(cfg.url + "/api/sync", {
        method: "POST",
        headers: await syncHeaders(cfg),
        body: JSON.stringify({ id: id, jeton: "x", contenu: { c: chiffe }, maj: new Date().toISOString() })
    });
    if (!r.ok) {
        const t = await r.text();
        throw new Error("HTTP " + r.status + " — " + t.slice(0, 120));
    }
    return true;
}

async function syncLire(app, id) {
    const cfg = syncChargerConfig(app);
    if (!cfg || !cfg.url) throw new Error("Cloud non configuré");
    const r = await fetch(cfg.url + "/api/sync?jeton=" + encodeURIComponent(id), {
        headers: await syncHeaders(cfg)
    });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error("HTTP " + r.status);
    const ligne = await r.json();
    if (!ligne || !ligne.contenu || !ligne.contenu.c) return null;
    const donnees = await syncDechiffrer(cfg.jeton, ligne.contenu.c);
    if (donnees === null) return null;
    return { donnees, publie: ligne.maj, app: id };
}

/* Vérifie la config : URL + jeton cohérents. Retourne null si OK, sinon un message. */
async function syncVerifier(app, cfg) {
    if (!cfg || !cfg.url) return "Cloud non configuré";
    if (!/^https:\/\/[a-z0-9.-]+$/.test(cfg.url))
        return "L'URL doit être de la forme https://sync.edukisto.win (sans slash final) — actuellement : " + cfg.url;
    if (!cfg.jeton || cfg.jeton.length < 4) return "Choisissez un jeton familial (au moins 4 caractères)";
    try {
        const r = await fetch(cfg.url + "/api/sync?jeton=verification", {
            headers: await syncHeaders(cfg)
        });
        if (r.status === 401) return "Accès refusé (401) — vérifiez l'origine de l'app";
        if (!r.ok && r.status !== 404) return "Serveur injoignable (HTTP " + r.status + ")";
        return null;
    } catch (e) {
        return "URL injoignable : " + e.message;
    }
}

async function syncHorodatage(app, id) {
    try {
        const cfg = syncChargerConfig(app);
        const r = await fetch(cfg.url + "/api/sync?jeton=" + encodeURIComponent(id), {
            headers: await syncHeaders(cfg)
        });
        if (!r.ok) return null;
        const ligne = await r.json();
        return ligne && ligne.maj ? ligne.maj : null;
    } catch (e) { return null; }
}

/* Proxy ICS des agendas Google (endpoint /api/ics du worker cal-sync) */
async function syncProxyICS(app, url) {
    const cfg = syncChargerConfig(app);
    const r = await fetch(cfg.url + "/api/ics", {
        method: "POST",
        headers: await syncHeaders(cfg),
        body: JSON.stringify({ p_url: url })
    });
    if (!r.ok) throw new Error("proxy indisponible");
    const out = await r.json();
    if (!out || !out.texte) throw new Error("Réponse proxy vide");
    return out.texte;
}
