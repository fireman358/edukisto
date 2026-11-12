"use strict";
/* ===== Pont Cloud — partagé entre calfam, repas et Edukisto Home =====
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

function syncSauverConfig(app, cfg) {
    if (cfg && cfg.url) {
        cfg.url = syncNormaliserURL(cfg.url);
    }
    localStorage.setItem(SYNC_CLES[app], JSON.stringify(cfg));
}

function syncNormaliserURL(url) {
    return String(url || "")
        .replace(/\/+$/, "")
        .replace(/\/rest\/v1$/, "")
        .replace(/\/api$/, "");
}

/* Id de ligne unique par client, dérivé du mot de passe : chaque famille
   sauvegarde sur SA ligne (jamais celle d'un autre). */
async function syncIdLigne(motDePasse) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("ligne:" + motDePasse));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
}

/* Serveur de sauvegarde edukisto — pré-configuré, le client ne choisit
   que son mot de passe de sauvegarde (jeton familial). */
const SYNC_DEFAUT = {
    url: "https://sync.edukisto.win"
};

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
        /* Config partielle → complétée avec les valeurs par défaut */
        if (!cfg.url) return { ...SYNC_DEFAUT, ...cfg };
        return cfg;
    } catch (e) { return null; }
}

/* Configuration minimale du client : son mot de passe de sauvegarde */
function syncMotDePasseConfigure() {
    const cfg = syncChargerConfig("ecal");
    return !!(cfg && cfg.jeton && cfg.jeton.length >= 4);
}

function syncConfigurerMotDePasse(motDePasse) {
    syncSauverConfig("ecal", { ...SYNC_DEFAUT, jeton: motDePasse });
}

function syncConfigurerMotDePasseEtNom(motDePasse, nomFamille) {
    syncSauverConfig("ecal", { ...SYNC_DEFAUT, jeton: motDePasse, nomFamille });
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

/* ----- Accès REST à la table famille_sync ----- */
async function syncHeaders(cfg) {
    return { "Content-Type": "application/json" };
}

async function syncPublier(app, id, donnees) {
    const cfg = syncChargerConfig(app);
    if (!cfg || !cfg.url) throw new Error("Sauvegarde non configurée");
    const idLigne = await syncIdLigne(cfg.jeton);
    /* ident visible : nom de famille fourni par le client — permet à l'éditeur
       de retrouver/supprimer la ligne (RGPD) sans pouvoir lire les données
       (chiffrées avec le mot de passe). */
    const ident = (cfg.nomFamille || "famille").slice(0, 60);
    const chiffe = await syncChiffrer(cfg.jeton, donnees);
    /* POST upsert — le worker gère l'insertion comme la mise à jour (ON CONFLICT) */
    const r = await fetch(cfg.url + "/api/sync", {
        method: "POST",
        headers: await syncHeaders(cfg),
        body: JSON.stringify({ id: idLigne, jeton: ident, contenu: { c: chiffe }, maj: new Date().toISOString() })
    });
    if (!r.ok) {
        const t = await r.text();
        throw new Error("HTTP " + r.status + " — " + t.slice(0, 120));
    }
    return true;
}

async function syncLire(app, id) {
    const cfg = syncChargerConfig(app);
    if (!cfg || !cfg.url) throw new Error("Sauvegarde non configurée");
    const idLigne = await syncIdLigne(cfg.jeton);
    const r = await fetch(cfg.url + "/api/sync?jeton=" + encodeURIComponent(idLigne), {
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

/* ===== Sync live multi-appareils =====
   Publication automatique après chaque modification locale (l'appelant la
   déclenche via syncAutoPublier), relecture périodique côté écrans de
   consultation. Dernière écriture gagne ; jamais de recul (le local plus
   récent que le cloud n'est jamais écrasé). */

let syncDernierePublication = 0;   /* horodatage de MA dernière publication cloud */
let syncEnCours = false;          /* anti-rebond */

/* Publier (silencieux) — appelé après chaque save() si le sync est actif */
/* Version allégée des données pour le cloud : les photos et MP3 (base64
   volumineux) ne partent PAS — ils restent locaux à chaque appareil. Le
   texte (agenda, anniversaires, événements, tâches, repas, réglages)
   se synchronise en quelques Ko. */
function donneesPourCloud() {
    var copie = JSON.parse(JSON.stringify(state.d));
    copie.photosUpload = [];
    copie.musiques = [];
    return copie;
}

async function syncAutoPublier() {
    const cfg = syncChargerConfig("ecal");
    if (!cfg || !cfg.jeton) return;   /* pas de sync sans mot de passe configuré */
    if (syncEnCours) return;
    syncEnCours = true;
    try {
        await syncPublier("ecal", "ecal", donneesPourCloud());
        syncDernierePublication = Date.now();
    } catch (e) { /* réseau coupé : rattrapage au prochain save */ }
    finally { syncEnCours = false; }
}

/* Fusion intelligente de deux versions : les modifications des DEUX
   appareils survivent (union par id pour les listes, par date pour les plans).
   Arbitre pour une même ligne touchée des deux côtés : l'horodatage. */
function syncFusionner(local, distant) {
    const fusion = { ...local };

    /* Listes d'objets avec id : union par id, l'élément le plus récemment
       modifié gagne en cas de double édition du MÊME objet */
    const listesObjets = ["anniversaires", "evenements", "taches", "objectifs", "plats", "membres", "listes", "radios", "evenementsICS"];
    for (const cle of listesObjets) {
        const L = local[cle] || [];
        const D = distant[cle] || [];
        const parId = new Map(L.map(o => [o.id, o]));
        for (const d of D) {
            const l = parId.get(d.id);
            if (!l) parId.set(d.id, d);                          /* nouveauté distante → ajouter */
            else {
                const dl = l._modif || 0, dd = d._modif || 0;
                parId.set(d.id, dd > dl ? d : l);                /* même objet : le plus frais */
            }
        }
        fusion[cle] = [...parId.values()];
        /* suppression : un objet présent local mais absent distant + distant plus
           récent globalement → considéré supprimé sur l'autre appareil */
        if (D.length < L.length && (distant._derniereModif || 0) > (local._derniereModif || 0)) {
            const idsDistants = new Set(D.map(o => o.id));
            fusion[cle] = L.filter(o => idsDistants.has(o.id) || D.some(x => x.id === o.id));
        }
    }

    /* Plans par date : fusion clé par clé (repas, étoiles par membre/jour…) */
    const plans = ["planRepas"];
    for (const cle of plans) {
        fusion[cle] = { ...(local[cle] || {}), ...(distant[cle] || {}) };
    }

    /* faitPar (étoiles cochées) : structure imbriquée membre → date → fusion des 2 niveaux */
    const fpL = local.taches ? {} : null;
    if (local.taches && distant.taches) {
        const parIdT = new Map(fusion.taches.map(t => [t.id, t]));
        for (const t of fusion.taches) {
            /* les faitPar ont fusionné via la liste taches (le plus frais par tâche) */
        }
    }

    /* dictionnaires simples : garder le plus frais */
    fusion.jours_feries = (distant._derniereModif || 0) > (local._derniereModif || 0) ? (distant.jours_feries || local.jours_feries) : (local.jours_feries || distant.jours_feries);
    fusion.vacances_scolaires = (distant._derniereModif || 0) > (local._derniereModif || 0) ? (distant.vacances_scolaires || local.vacances_scolaires) : (local.vacances_scolaires || distant.vacances_scolaires);
    fusion.icsSources = fusion.icsSources || distant.icsSources || [];

    /* les réglages restent LOCAUX (densité, PIN, sons — par appareil) */
    fusion.reglages = local.reglages;
    fusion.licence = local.licence;           /* licence locale (déjà synchronisée par la clé) */
    fusion.derniereSauvegarde = Math.max(local.derniereSauvegarde || 0, distant.derniereSauvegarde || 0);
    fusion.dateInstallation = local.dateInstallation;
    fusion._derniereModif = Date.now();
    return fusion;
}

/* Lire le cloud : FUSIONNER si le cloud contient des modifications d'un autre appareil */
async function syncAutoLire() {
    const cfg = syncChargerConfig("ecal");
    if (!cfg || !cfg.jeton) return null;
    try {
        const c = await syncLire("ecal", "ecal");
        if (!c || !c.donnees) return null;
        const majCloud = new Date(c.publie).getTime();
        /* Le cloud contient-il une modification d'un autre appareil ? */
        if (majCloud > syncDernierePublication) {
            return syncFusionner(state.d, c.donnees);
        }
        return null;   /* rien de neuf côté cloud */
    } catch (e) { return null; }
}

/* Vérifie la config : URL + clé + jeton cohérents. Retourne null si OK, sinon un message. */
async function syncVerifier(app, cfg) {
    if (!cfg || !cfg.url) return "Sauvegarde non configurée";
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
