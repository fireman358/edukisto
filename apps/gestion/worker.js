/* gestion (gestion.edukisto.win) — outil interne clients / devis / suivi de factures.
   Les factures officielles sont émises dans Accountable (Peppol) ; l'app sert de
   carnet de bord commercial, avec un mode « test / exemple » isolé des statistiques.

   Auth : un seul utilisateur. Mot de passe PBKDF2-SHA256 (settings), session JWT HS256
   avec jti stocké en base (révocation possible), cookie HttpOnly/Secure/SameSite=Strict. */

import {
  addDays,
  cents,
  clampNumber,
  clientDisplayName,
  computeLineTotals,
  computeTotalsFromTtc,
  csvDocument,
  fromCents,
  isDate,
  isValidEmail,
  money,
  parseLines,
  today,
  yearOf,
} from "./lib/core.js";

const enc = new TextEncoder();

const COOKIE = "gestion_session";
const SESSION_MAX_AGE = 7 * 24 * 3600;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_FAILS = 5;
const PBKDF2_ITERATIONS = 100000;
const MAX_BODY = 200 * 1024;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const nowIso = () => new Date().toISOString();
const todayStr = () => today();
const uuid = () => crypto.randomUUID();
const hex = (buffer) => [...new Uint8Array(buffer)].map((x) => x.toString(16).padStart(2, "0")).join("");

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
      ...headers,
    },
  });

const unauthorized = () => json({ error: "Session expirée — reconnectez-vous." }, 401);

/* ------------------------------- Base64 / JWT ------------------------------ */

const b64url = (value) => {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return btoa(unescape(encodeURIComponent(text))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const b64uDecode = (value) => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  return decodeURIComponent(escape(atob(padded)));
};

async function jwtSign(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const data = `${b64url(header)}.${b64url({ ...payload, iat: Math.floor(Date.now() / 1000) })}`;
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return `${data}.${b64url(String.fromCharCode(...new Uint8Array(signature)))}`;
}

async function jwtVerify(token, secret) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length !== 3) return null;
    const header = JSON.parse(b64uDecode(parts[0]));
    if (header.alg !== "HS256") return null;
    const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const signature = Uint8Array.from(b64uDecode(parts[2]), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, signature, enc.encode(`${parts[0]}.${parts[1]}`));
    if (!valid) return null;
    const payload = JSON.parse(b64uDecode(parts[1]));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/* -------------------------------- Mots de passe ---------------------------- */

async function hashPassword(password, iterations = PBKDF2_ITERATIONS) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return `pbkdf2$${iterations}$${hex(salt.buffer)}$${hex(bits)}`;
}

const safeEqual = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

async function verifyPassword(password, stored) {
  try {
    const [scheme, iterStr, saltHex, hashHex] = String(stored).split("$");
    if (scheme !== "pbkdf2" || !iterStr || !saltHex || !hashHex) return false;
    const iterations = clampNumber(iterStr, 10000, 2000000, PBKDF2_ITERATIONS);
    const salt = Uint8Array.from(saltHex.match(/.{2}/g).map((h) => parseInt(h, 16)));
    const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
    return safeEqual(hex(bits), hashHex);
  } catch {
    return false;
  }
}

const passwordProblem = (password) => {
  if (typeof password !== "string" || password.length < 10) return "Le mot de passe doit contenir au moins 10 caractères.";
  if (password.length > 200) return "Le mot de passe est trop long.";
  return null;
};

/* --------------------------------- Cookies -------------------------------- */

const sessionCookie = (token) =>
  `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_MAX_AGE}; Priority=High`;
const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index > 0 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return null;
}

/* -------------------------------- Sessions -------------------------------- */

const ipOf = (request) => request.headers.get("CF-Connecting-IP") || "local";
const uaOf = (request) => (request.headers.get("User-Agent") || "").slice(0, 300);

async function createSession(env, request) {
  const jti = uuid();
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  await env.DB.prepare(
    "INSERT INTO sessions (jti, created_at, expires_at, ip, user_agent) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(jti, nowIso(), new Date(exp * 1000).toISOString(), ipOf(request), uaOf(request))
    .run();
  const token = await jwtSign({ sub: "admin", jti, exp }, env.AUTH_SECRET);
  return token;
}

async function tokenPayload(request, env) {
  if (!env.AUTH_SECRET) return null;
  const token = getCookie(request, COOKIE);
  if (!token) return null;
  return jwtVerify(token, env.AUTH_SECRET);
}

async function requireAuth(request, env) {
  const payload = await tokenPayload(request, env);
  if (!payload || payload.sub !== "admin" || !payload.jti) return null;
  const row = await env.DB.prepare(
    "SELECT jti FROM sessions WHERE jti = ? AND revoked_at IS NULL AND expires_at > ?"
  )
    .bind(payload.jti, nowIso())
    .first();
  return row ? payload : null;
}

async function revokeSession(env, jti) {
  if (!jti) return;
  await env.DB.prepare("UPDATE sessions SET revoked_at = ? WHERE jti = ? AND revoked_at IS NULL").bind(nowIso(), jti).run();
}

/* ----------------------------- Rate limiting ------------------------------ */

async function loginBlocked(env, ip) {
  const row = await env.DB.prepare("SELECT fails, window_start FROM login_attempts WHERE ip = ?").bind(ip).first();
  if (!row) return false;
  if (Date.now() - Date.parse(row.window_start) > LOGIN_WINDOW_MS) return false;
  return row.fails >= MAX_LOGIN_FAILS;
}

async function recordFail(env, ip) {
  const row = await env.DB.prepare("SELECT fails, window_start FROM login_attempts WHERE ip = ?").bind(ip).first();
  if (!row || Date.now() - Date.parse(row.window_start) > LOGIN_WINDOW_MS) {
    await env.DB.prepare("INSERT OR REPLACE INTO login_attempts (ip, fails, window_start) VALUES (?, 1, ?)").bind(ip, nowIso()).run();
  } else {
    await env.DB.prepare("UPDATE login_attempts SET fails = fails + 1 WHERE ip = ?").bind(ip).run();
  }
}

async function clearFails(env, ip) {
  await env.DB.prepare("DELETE FROM login_attempts WHERE ip = ?").bind(ip).run();
}

/* ------------------------------- Validation ------------------------------- */

const text = (value, max = 500) => String(value ?? "").trim().slice(0, max);
const oneOf = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);
const boolInt = (value) => (value === true || value === 1 || value === "1" || value === "true" ? 1 : 0);
const optionalDate = (value) => {
  const date = text(value, 10);
  return isDate(date) ? date : null;
};
const httpUrl = (value) => {
  const url = text(value, 500);
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : "";
  } catch {
    return "";
  }
};

async function readJson(request) {
  const declared = Number(request.headers.get("Content-Length") || 0);
  if (declared > MAX_BODY) throw new HttpError(413, "Requête trop volumineuse.");
  const raw = await request.text();
  if (raw.length > MAX_BODY) throw new HttpError(413, "Requête trop volumineuse.");
  if (!raw.trim()) return {};
  try {
    const body = JSON.parse(raw);
    return body && typeof body === "object" && !Array.isArray(body) ? body : {};
  } catch {
    throw new HttpError(400, "Corps JSON invalide.");
  }
}

function checkOrigin(request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const origin = request.headers.get("Origin");
  if (!origin) return; // curl / tests ; SameSite=Strict protège le navigateur
  try {
    if (new URL(origin).host !== new URL(request.url).host) throw new HttpError(403, "Origine non autorisée.");
  } catch {
    throw new HttpError(403, "Origine non autorisée.");
  }
}

/* --------------------------------- Profil --------------------------------- */

const PROFILE_KEYS = ["nom", "adresse", "tva", "tva_regime", "bce", "iban", "email", "tel", "site", "mentions", "seuil_franchise"];

async function profileData(env) {
  const rows = await env.DB.prepare("SELECT key, value FROM settings WHERE key LIKE 'profile_%'").all();
  const profile = {};
  for (const row of rows.results) profile[row.key.slice("profile_".length)] = row.value;
  if (!profile.site) profile.site = "edukisto.win";
  if (!profile.tva_regime) profile.tva_regime = "franchise";
  if (!profile.seuil_franchise) profile.seuil_franchise = "25000";
  return profile;
}

const tvaRegime = async (env) => ((await profileData(env)).tva_regime === "franchise" ? "franchise" : "assujetti");

async function profilePut(env, body) {
  for (const key of PROFILE_KEYS) {
    if (body[key] === undefined) continue;
    let value = text(body[key], key === "mentions" ? 2000 : 300);
    if (key === "seuil_franchise") value = String(clampNumber(value, 0, 1000000, 25000));
    if (key === "tva_regime" && !["franchise", "assujetti"].includes(value)) value = "franchise";
    await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").bind("profile_" + key, value).run();
  }
  return json({ ok: true, profile: await profileData(env) });
}

/* -------------------------------- Numérotation ---------------------------- */

async function nextNumero(env, table, prefix, date) {
  const year = yearOf(date);
  await env.DB.prepare("INSERT OR IGNORE INTO counters (type, year, last) VALUES (?, ?, 0)").bind(prefix, year).run();
  const current = await env.DB.prepare("SELECT last FROM counters WHERE type = ? AND year = ?").bind(prefix, year).first();
  if (!current || Number(current.last) === 0) {
    const max = await env.DB.prepare(
      `SELECT MAX(CAST(substr(numero, 8) AS INTEGER)) AS max FROM ${table} WHERE numero LIKE ?`
    )
      .bind(`${prefix}-${year}-%`)
      .first();
    const start = Number(max?.max || 0);
    await env.DB.prepare("UPDATE counters SET last = ? WHERE type = ? AND year = ?").bind(start, prefix, year).run();
  }
  const row = await env.DB.prepare("UPDATE counters SET last = last + 1 WHERE type = ? AND year = ? RETURNING last")
    .bind(prefix, year)
    .first();
  const last = Number(row?.last || 0);
  return `${prefix}-${year}-${String(last).padStart(3, "0")}`;
}

/* --------------------------------- Clients -------------------------------- */

function clientFields(body) {
  const nom = text(body.nom, 200);
  if (!nom) throw new HttpError(400, "Le nom est obligatoire.");
  const email = text(body.email, 200);
  if (email && !isValidEmail(email)) throw new HttpError(400, "Adresse e-mail invalide.");
  return {
    nom,
    societe: text(body.societe, 200),
    email,
    tel: text(body.tel, 60),
    adresse: text(body.adresse, 1000),
    tva: text(body.tva, 40).replace(/\s+/g, "").toUpperCase(),
    type: body.type === "b2b" ? "b2b" : "b2c",
    peppol_id: text(body.peppol_id, 100),
    notes: text(body.notes, 5000),
    statut: oneOf(body.statut, ["prospect", "actif", "inactif"], "actif"),
    est_test: boolInt(body.est_test),
  };
}

async function clientsApi(request, env, method, id, body, url) {
  if (method === "GET" && !id) {
    const rows = await env.DB.prepare(
      `SELECT c.*,
        (SELECT COUNT(*) FROM devis d WHERE d.client_id = c.id) AS nb_devis,
        (SELECT COUNT(*) FROM factures f WHERE f.client_id = c.id) AS nb_factures,
        (SELECT COUNT(*) FROM devis d WHERE d.client_id = c.id AND d.est_test = 0) AS nb_devis_reels,
        (SELECT COUNT(*) FROM factures f WHERE f.client_id = c.id AND f.est_test = 0) AS nb_factures_reelles,
        (SELECT COALESCE(SUM(f.total_ttc), 0) FROM factures f WHERE f.client_id = c.id AND f.statut = 'payee') AS ca_total,
        (SELECT MAX(d.date) FROM devis d WHERE d.client_id = c.id) AS dernier_devis,
        (SELECT MAX(f.date) FROM factures f WHERE f.client_id = c.id) AS derniere_facture,
        (SELECT MAX(n.created_at) FROM notes n WHERE n.client_id = c.id) AS derniere_note
       FROM clients c ORDER BY c.nom COLLATE NOCASE`
    ).all();
    const todayValue = todayStr();
    const late = await env.DB.prepare(
      "SELECT client_id, COUNT(*) AS n FROM factures WHERE statut IN ('envoyee_peppol', 'envoyee_email') AND echeance < ? GROUP BY client_id"
    )
      .bind(todayValue)
      .all();
    const lateMap = Object.fromEntries(late.results.map((row) => [row.client_id, Number(row.n)]));
    const results = rows.results.map((client) => ({
      ...client,
      en_retard: lateMap[client.id] || 0,
      derniere_activite:
        [client.dernier_devis, client.derniere_facture, client.derniere_note].filter(Boolean).sort().pop() || client.created_at,
    }));
    return json(results);
  }

  if (method === "POST" && !id) {
    const fields = clientFields(body || {});
    const newId = uuid();
    await env.DB.prepare(
      `INSERT INTO clients (id, nom, societe, email, tel, adresse, tva, type, peppol_id, notes, statut, est_test, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        newId,
        fields.nom,
        fields.societe,
        fields.email,
        fields.tel,
        fields.adresse,
        fields.tva,
        fields.type,
        fields.peppol_id,
        fields.notes,
        fields.statut,
        fields.est_test,
        nowIso()
      )
      .run();
    return json({ ok: true, id: newId }, 201);
  }

  if (method === "GET" && id) {
    const client = await env.DB.prepare("SELECT * FROM clients WHERE id = ?").bind(id).first();
    if (!client) throw new HttpError(404, "Client introuvable.");
    const devis = await env.DB.prepare(
      `SELECT d.*, (SELECT f.id FROM factures f WHERE f.devis_id = d.id LIMIT 1) AS facture_id
       FROM devis d WHERE d.client_id = ? ORDER BY d.date DESC, d.id DESC`
    )
      .bind(id)
      .all();
    const factures = await env.DB.prepare("SELECT * FROM factures WHERE client_id = ? ORDER BY date DESC, id DESC").bind(id).all();
    const notes = await env.DB.prepare("SELECT * FROM notes WHERE client_id = ? ORDER BY created_at DESC, id DESC").bind(id).all();
    const totals = await env.DB.prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN statut = 'payee' THEN total_ttc END), 0) AS ca_paye,
        COALESCE(SUM(CASE WHEN statut != 'payee' THEN total_ttc END), 0) AS en_cours
       FROM factures WHERE client_id = ? AND est_test = 0`
    )
      .bind(id)
      .first();
    return json({ ...client, notes_list: notes.results, devis: devis.results, factures: factures.results, totals });
  }

  if (method === "PUT" && id) {
    const existing = await env.DB.prepare("SELECT * FROM clients WHERE id = ?").bind(id).first();
    if (!existing) throw new HttpError(404, "Client introuvable.");
    const fields = clientFields(body || {});
    await env.DB.prepare(
      `UPDATE clients SET nom = ?, societe = ?, email = ?, tel = ?, adresse = ?, tva = ?, type = ?, peppol_id = ?, notes = ?, statut = ?, est_test = ? WHERE id = ?`
    )
      .bind(
        fields.nom,
        fields.societe,
        fields.email,
        fields.tel,
        fields.adresse,
        fields.tva,
        fields.type,
        fields.peppol_id,
        fields.notes,
        fields.statut,
        fields.est_test,
        id
      )
      .run();
    return json({ ok: true });
  }

  if (method === "DELETE" && id) {
    const client = await env.DB.prepare("SELECT * FROM clients WHERE id = ?").bind(id).first();
    if (!client) throw new HttpError(404, "Client introuvable.");
    const docs = await env.DB.prepare(
      "SELECT COUNT(*) AS n, COALESCE(SUM(CASE WHEN est_test = 0 THEN 1 ELSE 0 END), 0) AS reels FROM factures WHERE client_id = ?"
    )
      .bind(id)
      .first();
    const devis = await env.DB.prepare("SELECT COUNT(*) AS n FROM devis WHERE client_id = ?").bind(id).first();
    const total = Number(docs?.n || 0) + Number(devis?.n || 0);
    if (total > 0) {
      const canForce = url?.searchParams.get("force") === "1" && Number(docs?.reels || 0) === 0 && client.est_test === 1;
      if (!canForce) {
        throw new HttpError(409, "Client lié à des devis ou factures : supprime d'abord ses documents de test, ou archive-le.");
      }
      await env.DB.prepare("DELETE FROM factures WHERE client_id = ?").bind(id).run();
      await env.DB.prepare("DELETE FROM devis WHERE client_id = ?").bind(id).run();
    }
    await env.DB.prepare("DELETE FROM notes WHERE client_id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM clients WHERE id = ?").bind(id).run();
    return json({ ok: true });
  }

  throw new HttpError(404, "Route inconnue.");
}

/* ---------------------------------- Devis --------------------------------- */

async function clientExists(env, clientId) {
  const client = await env.DB.prepare("SELECT id, est_test FROM clients WHERE id = ?").bind(clientId).first();
  if (!client) throw new HttpError(400, "Client invalide.");
  return client;
}

async function devisFields(env, body) {
  const existingId = body.id || null;
  const client = await clientExists(env, text(body.client_id, 100));
  const date = optionalDate(body.date) || todayStr();
  const datePrestation = optionalDate(body.date_prestation);
  const validite = Math.trunc(clampNumber(body.validite_jours, 1, 365, 15));
  const statut = oneOf(body.statut, ["brouillon", "envoye", "accepte", "refuse", "expire"], "brouillon");
  const regime = await tvaRegime(env);
  const taux = regime === "franchise" ? 0 : clampNumber(body.taux_tva, 0, 100, 0);
  let lignes = parseLines(body.lignes);
  const ttcInput = body.montant_ttc == null ? 0 : money(body.montant_ttc);
  let totals;
  if (ttcInput > 0) {
    totals = computeTotalsFromTtc(ttcInput, taux);
    lignes = [
      {
        description: text(body.description, 300) || lignes[0]?.description || "Prestation",
        qty: 1,
        prix_ht: totals.ht,
      },
    ];
  } else {
    if (!lignes.length) throw new HttpError(400, "Ajoute au moins une ligne au devis.");
    totals = computeLineTotals(lignes, taux);
  }
  return {
    client_id: client.id,
    date,
    date_prestation: datePrestation,
    validite_jours: validite,
    statut,
    lignes,
    notes: text(body.notes, 5000),
    taux_tva: taux,
    total_ht: totals.ht,
    total_ttc: totals.ttc,
    accepte_le: statut === "accepte" ? optionalDate(body.accepte_le) || todayStr() : null,
    est_test: client.est_test ? 1 : boolInt(body.est_test),
    _totals: totals,
    _existingId: existingId,
  };
}

async function devisApi(request, env, method, id, body, url) {
  if (method === "GET" && !id) {
    const rows = await env.DB.prepare(
      `SELECT d.*, c.nom AS client_nom, c.societe AS client_societe, c.email AS client_email,
        (SELECT f.id FROM factures f WHERE f.devis_id = d.id LIMIT 1) AS facture_id,
        (SELECT f.numero FROM factures f WHERE f.devis_id = d.id LIMIT 1) AS facture_numero
       FROM devis d JOIN clients c ON c.id = d.client_id
       ORDER BY d.date DESC, d.id DESC`
    ).all();
    return json(rows.results);
  }

  if (method === "POST" && !id) {
    const fields = await devisFields(env, body || {});
    const numero = await nextNumero(env, "devis", "D", fields.date);
    const newId = uuid();
    await env.DB.prepare(
      `INSERT INTO devis (id, client_id, numero, date, date_prestation, validite_jours, statut, lignes, notes, taux_tva, total_ht, total_ttc, accepte_le, est_test, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        newId,
        fields.client_id,
        numero,
        fields.date,
        fields.date_prestation,
        fields.validite_jours,
        fields.statut,
        JSON.stringify(fields.lignes),
        fields.notes,
        fields.taux_tva,
        fields.total_ht,
        fields.total_ttc,
        fields.accepte_le,
        fields.est_test,
        nowIso()
      )
      .run();
    return json({ ok: true, id: newId, numero, total_ht: fields.total_ht, total_ttc: fields.total_ttc }, 201);
  }

  if (method === "PUT" && id) {
    const existing = await env.DB.prepare("SELECT * FROM devis WHERE id = ?").bind(id).first();
    if (!existing) throw new HttpError(404, "Devis introuvable.");
    const fields = await devisFields(env, {
      ...(body || {}),
      id,
      accepte_le: body?.accepte_le ?? existing.accepte_le,
    });
    await env.DB.prepare(
      `UPDATE devis SET client_id = ?, date = ?, date_prestation = ?, validite_jours = ?, statut = ?, lignes = ?, notes = ?, taux_tva = ?, total_ht = ?, total_ttc = ?, accepte_le = ?, est_test = ? WHERE id = ?`
    )
      .bind(
        fields.client_id,
        fields.date,
        fields.date_prestation,
        fields.validite_jours,
        fields.statut,
        JSON.stringify(fields.lignes),
        fields.notes,
        fields.taux_tva,
        fields.total_ht,
        fields.total_ttc,
        fields.accepte_le,
        fields.est_test,
        id
      )
      .run();
    return json({ ok: true, total_ht: fields.total_ht, total_ttc: fields.total_ttc });
  }

  if (method === "DELETE" && id) {
    await env.DB.prepare("UPDATE factures SET devis_id = NULL WHERE devis_id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM devis WHERE id = ?").bind(id).run();
    return json({ ok: true });
  }

  throw new HttpError(404, "Route inconnue.");
}

async function duplicateDevis(env, id) {
  const devis = await env.DB.prepare("SELECT * FROM devis WHERE id = ?").bind(id).first();
  if (!devis) throw new HttpError(404, "Devis introuvable.");
  const date = todayStr();
  const numero = await nextNumero(env, "devis", "D", date);
  const newId = uuid();
  await env.DB.prepare(
    `INSERT INTO devis (id, client_id, numero, date, date_prestation, validite_jours, statut, lignes, notes, taux_tva, total_ht, total_ttc, accepte_le, est_test, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'brouillon', ?, ?, ?, ?, ?, NULL, ?, ?)`
  )
    .bind(
      newId,
      devis.client_id,
      numero,
      date,
      null,
      devis.validite_jours,
      devis.lignes,
      devis.notes,
      devis.taux_tva,
      devis.total_ht,
      devis.total_ttc,
      devis.est_test,
      nowIso()
    )
    .run();
  return json({ ok: true, id: newId, numero }, 201);
}

async function facturerDevis(env, id) {
  const devis = await env.DB.prepare("SELECT * FROM devis WHERE id = ?").bind(id).first();
  if (!devis) throw new HttpError(404, "Devis introuvable.");
  if (["refuse", "expire"].includes(devis.statut)) throw new HttpError(409, "Ce devis est refusé ou expiré : impossible de le facturer.");
  const existing = await env.DB.prepare("SELECT id, numero FROM factures WHERE devis_id = ? LIMIT 1").bind(id).first();
  if (existing) throw new HttpError(409, `Ce devis a déjà une facture (${existing.numero}).`);
  const date = todayStr();
  const numero = await nextNumero(env, "factures", "F", date);
  const newId = uuid();
  const echeance = addDays(date, 30);
  await env.DB.prepare(
    `INSERT INTO factures (id, client_id, devis_id, numero, date, echeance, montant_ht, taux_tva, total_ttc, lignes, statut, note, est_test, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'a_envoyer', ?, ?, ?)`
  )
    .bind(
      newId,
      devis.client_id,
      devis.id,
      numero,
      date,
      echeance,
      devis.total_ht,
      devis.taux_tva,
      devis.total_ttc,
      devis.lignes,
      "",
      devis.est_test,
      nowIso()
    )
    .run();
  if (devis.statut !== "accepte") {
    await env.DB.prepare("UPDATE devis SET statut = 'accepte', accepte_le = ? WHERE id = ?").bind(date, id).run();
  }
  return json({ ok: true, id: newId, numero }, 201);
}

/* -------------------------------- Factures -------------------------------- */

async function factureFields(env, body) {
  const client = await clientExists(env, text(body.client_id, 100));
  const date = optionalDate(body.date) || todayStr();
  const datePrestation = optionalDate(body.date_prestation);
  const echeance = optionalDate(body.echeance) || addDays(date, 30);
  const regime = await tvaRegime(env);
  const taux = regime === "franchise" ? 0 : clampNumber(body.taux_tva, 0, 100, 0);
  const statut = oneOf(body.statut, ["a_envoyer", "envoyee_peppol", "envoyee_email", "payee"], "a_envoyer");
  let lignes = parseLines(body.lignes);
  const ttcInput = body.montant_ttc == null ? 0 : money(body.montant_ttc);
  const htInput = body.montant_ht == null ? null : money(body.montant_ht);
  let totals;
  if (ttcInput > 0) {
    totals = computeTotalsFromTtc(ttcInput, taux);
    lignes = [{ description: text(body.description, 300) || (lignes[0]?.description ?? "Prestation"), qty: 1, prix_ht: totals.ht }];
  } else if (lignes.length) {
    totals = computeLineTotals(lignes, taux);
  } else if (htInput !== null && htInput > 0) {
    lignes = [{ description: text(body.description, 300) || "Prestation", qty: 1, prix_ht: htInput }];
    totals = computeLineTotals(lignes, taux);
  } else {
    throw new HttpError(400, "Montant obligatoire (HT ou TTC).");
  }
  if (totals.ttc <= 0) throw new HttpError(400, "Le montant doit être supérieur à 0.");
  const numeroExterne = text(body.numero_externe, 100);
  const lienExterne = httpUrl(body.lien_externe);
  if (text(body.lien_externe, 500) && !lienExterne) throw new HttpError(400, "Lien Accountable invalide.");
  return {
    client_id: client.id,
    date,
    date_prestation: datePrestation,
    echeance,
    montant_ht: totals.ht,
    taux_tva: taux,
    total_ttc: totals.ttc,
    lignes: lignes.length ? JSON.stringify(lignes) : null,
    statut,
    numero_externe: numeroExterne,
    lien_externe: lienExterne,
    moyen_paiement: text(body.moyen_paiement, 50),
    note: text(body.note, 2000),
    est_test: client.est_test ? 1 : boolInt(body.est_test),
    _totals: totals,
  };
}

async function facturesApi(request, env, method, id, body, url) {
  if (method === "GET" && !id) {
    const rows = await env.DB.prepare(
      `SELECT f.*, c.nom AS client_nom, c.societe AS client_societe, c.tva AS client_tva, c.type AS client_type,
        c.email AS client_email,
        CASE WHEN f.statut != 'payee' AND f.statut != 'a_envoyer' AND f.echeance < ? THEN 1 ELSE 0 END AS en_retard
       FROM factures f JOIN clients c ON c.id = f.client_id ORDER BY f.date DESC, f.id DESC`
    )
      .bind(todayStr())
      .all();
    return json(rows.results);
  }

  if (method === "POST" && !id) {
    const fields = await factureFields(env, body || {});
    const numero = await nextNumero(env, "factures", "F", fields.date);
    const newId = uuid();
    const payeeLe = fields.statut === "payee" ? optionalDate(body?.payee_le) || todayStr() : null;
    await env.DB.prepare(
      `INSERT INTO factures (id, client_id, devis_id, numero, numero_externe, lien_externe, date, date_prestation, echeance, montant_ht, taux_tva, total_ttc, lignes, statut, payee_le, moyen_paiement, note, est_test, created_at)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        newId,
        fields.client_id,
        numero,
        fields.numero_externe,
        fields.lien_externe,
        fields.date,
        fields.date_prestation,
        fields.echeance,
        fields.montant_ht,
        fields.taux_tva,
        fields.total_ttc,
        fields.lignes,
        fields.statut,
        payeeLe,
        fields.moyen_paiement,
        fields.note,
        fields.est_test,
        nowIso()
      )
      .run();
    return json({ ok: true, id: newId, numero, total_ttc: fields.total_ttc }, 201);
  }

  if (method === "PUT" && id) {
    const existing = await env.DB.prepare("SELECT * FROM factures WHERE id = ?").bind(id).first();
    if (!existing) throw new HttpError(404, "Facture introuvable.");
    const fields = await factureFields(env, { ...(body || {}), id });
    const payeeLe = fields.statut === "payee" ? optionalDate(body?.payee_le) || existing.payee_le || todayStr() : null;
    await env.DB.prepare(
      `UPDATE factures SET client_id = ?, date = ?, date_prestation = ?, echeance = ?, montant_ht = ?, taux_tva = ?, total_ttc = ?, lignes = ?, statut = ?, payee_le = ?, numero_externe = ?, lien_externe = ?, moyen_paiement = ?, note = ?, est_test = ? WHERE id = ?`
    )
      .bind(
        fields.client_id,
        fields.date,
        fields.date_prestation,
        fields.echeance,
        fields.montant_ht,
        fields.taux_tva,
        fields.total_ttc,
        fields.lignes,
        fields.statut,
        payeeLe,
        fields.numero_externe,
        fields.lien_externe,
        fields.moyen_paiement,
        fields.note,
        fields.est_test,
        id
      )
      .run();
    return json({ ok: true, total_ttc: fields.total_ttc });
  }

  if (method === "DELETE" && id) {
    await env.DB.prepare("DELETE FROM factures WHERE id = ?").bind(id).run();
    return json({ ok: true });
  }

  throw new HttpError(404, "Route inconnue.");
}

async function duplicateFacture(env, id) {
  const facture = await env.DB.prepare("SELECT * FROM factures WHERE id = ?").bind(id).first();
  if (!facture) throw new HttpError(404, "Facture introuvable.");
  const date = todayStr();
  const numero = await nextNumero(env, "factures", "F", date);
  const newId = uuid();
  await env.DB.prepare(
    `INSERT INTO factures (id, client_id, devis_id, numero, date, echeance, montant_ht, taux_tva, total_ttc, lignes, statut, note, est_test, created_at)
     VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, 'a_envoyer', ?, ?, ?)`
  )
    .bind(
      newId,
      facture.client_id,
      numero,
      date,
      addDays(date, 30),
      facture.montant_ht,
      facture.taux_tva,
      facture.total_ttc,
      facture.lignes,
      facture.note,
      facture.est_test,
      nowIso()
    )
    .run();
  return json({ ok: true, id: newId, numero }, 201);
}

async function relanceFacture(env, id) {
  const facture = await env.DB.prepare("SELECT * FROM factures WHERE id = ?").bind(id).first();
  if (!facture) throw new HttpError(404, "Facture introuvable.");
  await env.DB.prepare("UPDATE factures SET relance_le = ? WHERE id = ?").bind(todayStr(), id).run();
  return json({ ok: true, relance_le: todayStr() });
}

async function devisStatut(env, id, body) {
  const devis = await env.DB.prepare("SELECT * FROM devis WHERE id = ?").bind(id).first();
  if (!devis) throw new HttpError(404, "Devis introuvable.");
  const statut = oneOf(body?.statut, ["brouillon", "envoye", "accepte", "refuse", "expire"], null);
  if (!statut) throw new HttpError(400, "Statut invalide.");
  const accepteLe = statut === "accepte" ? devis.accepte_le || todayStr() : null;
  await env.DB.prepare("UPDATE devis SET statut = ?, accepte_le = ? WHERE id = ?").bind(statut, accepteLe, id).run();
  return json({ ok: true, statut, accepte_le: accepteLe });
}

async function factureStatut(env, id, body) {
  const facture = await env.DB.prepare("SELECT * FROM factures WHERE id = ?").bind(id).first();
  if (!facture) throw new HttpError(404, "Facture introuvable.");
  const statut = oneOf(body?.statut, ["a_envoyer", "envoyee_peppol", "envoyee_email", "payee"], null);
  if (!statut) throw new HttpError(400, "Statut invalide.");
  const payeeLe = statut === "payee" ? facture.payee_le || todayStr() : null;
  await env.DB.prepare("UPDATE factures SET statut = ?, payee_le = ? WHERE id = ?").bind(statut, payeeLe, id).run();
  return json({ ok: true, statut, payee_le: payeeLe });
}

/* --------------------------------- Services ------------------------------- */

async function servicesApi(request, env, method, id, body) {
  if (method === "GET" && !id) {
    const rows = await env.DB.prepare("SELECT * FROM services ORDER BY actif DESC, description COLLATE NOCASE").all();
    return json(rows.results);
  }
  if (method === "POST" && !id) {
    const description = text(body?.description, 300);
    if (!description) throw new HttpError(400, "La description est obligatoire.");
    const newId = uuid();
    await env.DB.prepare(
      "INSERT INTO services (id, description, prix_ht, taux_tva, unite, actif, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(newId, description, money(body.prix_ht), clampNumber(body.taux_tva, 0, 100, 0), text(body.unite, 30), boolInt(body.actif ?? 1), nowIso())
      .run();
    return json({ ok: true, id: newId }, 201);
  }
  if (method === "PUT" && id) {
    const description = text(body?.description, 300);
    if (!description) throw new HttpError(400, "La description est obligatoire.");
    await env.DB.prepare("UPDATE services SET description = ?, prix_ht = ?, taux_tva = ?, unite = ?, actif = ? WHERE id = ?")
      .bind(description, money(body.prix_ht), clampNumber(body.taux_tva, 0, 100, 0), text(body.unite, 30), boolInt(body.actif ?? 1), id)
      .run();
    return json({ ok: true });
  }
  if (method === "DELETE" && id) {
    await env.DB.prepare("DELETE FROM services WHERE id = ?").bind(id).run();
    return json({ ok: true });
  }
  throw new HttpError(404, "Route inconnue.");
}

/* ---------------------------------- Notes --------------------------------- */

async function notesApi(request, env, method, id, body, url) {
  if (method === "GET" && !id) {
    const clientId = url.searchParams.get("client_id");
    const rows = clientId
      ? await env.DB.prepare("SELECT * FROM notes WHERE client_id = ? ORDER BY created_at DESC, id DESC").bind(clientId).all()
      : await env.DB.prepare(
          "SELECT n.*, c.nom AS client_nom FROM notes n JOIN clients c ON c.id = n.client_id ORDER BY n.created_at DESC, n.id DESC LIMIT 200"
        ).all();
    return json(rows.results);
  }
  if (method === "POST" && !id) {
    const client = await clientExists(env, text(body?.client_id, 100));
    const texte = text(body?.texte, 5000);
    if (!texte) throw new HttpError(400, "Le texte est obligatoire.");
    const newId = uuid();
    await env.DB.prepare("INSERT INTO notes (id, client_id, texte, created_at) VALUES (?, ?, ?, ?)")
      .bind(newId, client.id, texte, nowIso())
      .run();
    return json({ ok: true, id: newId }, 201);
  }
  if (method === "PUT" && id) {
    const texte = text(body?.texte, 5000);
    if (!texte) throw new HttpError(400, "Le texte est obligatoire.");
    await env.DB.prepare("UPDATE notes SET texte = ? WHERE id = ?").bind(texte, id).run();
    return json({ ok: true });
  }
  if (method === "DELETE" && id) {
    await env.DB.prepare("DELETE FROM notes WHERE id = ?").bind(id).run();
    return json({ ok: true });
  }
  throw new HttpError(404, "Route inconnue.");
}

/* ---------------------------------- Stats --------------------------------- */

async function statsApi(env, url) {
  const includeTest = url.searchParams.get("include_test") === "1";
  const test = includeTest ? "" : "AND est_test = 0";
  const current = todayStr();
  const month = current.slice(0, 7);
  const year = current.slice(0, 4);
  const one = async (query, ...args) => (await env.DB.prepare(query).bind(...args).first()) || {};

  const [
    caPayeTotal,
    caPayeMois,
    caPayeAnnee,
    caAttente,
    aEnvoyer,
    enRetard,
    devisEnvoyes,
    devisAcceptes,
    nbClients,
    nbClientsActifs,
    caParMois,
    aRelancer,
    aEnvoyerList,
    devisOuverts,
    profile,
  ] = await Promise.all([
    one(`SELECT COALESCE(SUM(total_ttc), 0) AS v, COUNT(*) AS n FROM factures WHERE statut = 'payee' ${test}`),
    one(
      `SELECT COALESCE(SUM(total_ttc), 0) AS v, COUNT(*) AS n FROM factures WHERE statut = 'payee' AND substr(COALESCE(payee_le, date), 1, 7) = ? ${test}`,
      month
    ),
    one(
      `SELECT COALESCE(SUM(total_ttc), 0) AS v, COUNT(*) AS n FROM factures WHERE statut = 'payee' AND substr(COALESCE(payee_le, date), 1, 4) = ? ${test}`,
      year
    ),
    one(
      `SELECT COALESCE(SUM(total_ttc), 0) AS v, COUNT(*) AS n FROM factures WHERE statut IN ('envoyee_peppol', 'envoyee_email') ${test}`
    ),
    one(`SELECT COALESCE(SUM(total_ttc), 0) AS v, COUNT(*) AS n FROM factures WHERE statut = 'a_envoyer' ${test}`),
    one(
      `SELECT COALESCE(SUM(total_ttc), 0) AS v, COUNT(*) AS n FROM factures WHERE statut IN ('envoyee_peppol', 'envoyee_email') AND echeance < ? ${test}`,
      current
    ),
    one(`SELECT COALESCE(SUM(total_ttc), 0) AS v, COUNT(*) AS n FROM devis WHERE statut = 'envoye' ${test}`),
    one(`SELECT COUNT(*) AS n FROM devis WHERE statut = 'accepte' ${test}`),
    one(`SELECT COUNT(*) AS n FROM clients WHERE 1 = 1 ${test}`),
    one(`SELECT COUNT(*) AS n FROM clients WHERE statut = 'actif' ${test}`),
    env.DB.prepare(
      `SELECT substr(COALESCE(payee_le, date), 1, 7) AS mois, COALESCE(SUM(total_ttc), 0) AS v
       FROM factures WHERE statut = 'payee' ${test}
       GROUP BY mois ORDER BY mois DESC LIMIT 6`
    ).all(),
    env.DB.prepare(
      `SELECT f.*, c.nom AS client_nom, c.societe AS client_societe,
        CAST(julianday(?) - julianday(f.echeance) AS INTEGER) AS jours_retard
       FROM factures f JOIN clients c ON c.id = f.client_id
       WHERE f.statut IN ('envoyee_peppol', 'envoyee_email') AND f.echeance < ? ${test.replace("est_test", "f.est_test")}
       ORDER BY f.echeance ASC LIMIT 10`
    )
      .bind(current, current)
      .all(),
    env.DB.prepare(
      `SELECT f.*, c.nom AS client_nom, c.societe AS client_societe
       FROM factures f JOIN clients c ON c.id = f.client_id
       WHERE f.statut = 'a_envoyer' ${test.replace("est_test", "f.est_test")}
       ORDER BY f.date ASC LIMIT 10`
    ).all(),
    env.DB.prepare(
      `SELECT d.*, c.nom AS client_nom, c.societe AS client_societe
       FROM devis d JOIN clients c ON c.id = d.client_id
       WHERE d.statut = 'envoye' ${test.replace("est_test", "d.est_test")}
       ORDER BY d.date ASC LIMIT 20`
    ).all(),
    profileData(env),
  ]);

  const months = [];
  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(Date.UTC(Number(year), Number(month.slice(5, 7)) - 1 - index, 1));
    months.push(date.toISOString().slice(0, 7));
  }
  const map = Object.fromEntries(caParMois.results.map((row) => [row.mois, Number(row.v || 0)]));
  const caMois = months.map((key) => ({ mois: key, value: map[key] || 0 }));

  const devisARelancer = devisOuverts.results
    .map((devis) => {
      const validUntil = addDays(devis.date, devis.validite_jours);
      const jours = Math.round((Date.parse(validUntil) - Date.parse(current)) / 86400000);
      return { ...devis, valid_until: validUntil, jours_restants: jours };
    })
    .filter((devis) => devis.jours_restants <= 7)
    .map((devis) => ({ ...devis, expire: devis.jours_restants < 0 }));

  const seuil = Number(profile.seuil_franchise || 25000);
  // Seuil de franchise : chiffre d'affaires facturé de l'année (pas seulement encaissé).
  const caAnneeHt = await one(
    `SELECT COALESCE(SUM(montant_ht), 0) AS v FROM factures WHERE substr(date, 1, 4) = ? ${test}`,
    year
  );

  return json({
    ca_paye_total: Number(caPayeTotal.v || 0),
    nb_paye_total: Number(caPayeTotal.n || 0),
    ca_paye_mois: Number(caPayeMois.v || 0),
    nb_paye_mois: Number(caPayeMois.n || 0),
    ca_paye_annee: Number(caPayeAnnee.v || 0),
    ca_en_attente: Number(caAttente.v || 0),
    nb_en_attente: Number(caAttente.n || 0),
    ca_a_envoyer: Number(aEnvoyer.v || 0),
    nb_a_envoyer: Number(aEnvoyer.n || 0),
    en_retard: Number(enRetard.v || 0),
    nb_en_retard: Number(enRetard.n || 0),
    devis_envoyes: Number(devisEnvoyes.v || 0),
    nb_devis_envoyes: Number(devisEnvoyes.n || 0),
    nb_devis_acceptes: Number(devisAcceptes.n || 0),
    nb_clients: Number(nbClients.n || 0),
    nb_clients_actifs: Number(nbClientsActifs.n || 0),
    ca_par_mois: caMois,
    a_relancer: aRelancer.results,
    a_envoyer: aEnvoyerList.results,
    devis_a_relancer: devisARelancer,
    franchise: {
      regime: profile.tva_regime || "franchise",
      seuil,
      ca_annee_ht: Number(caAnneeHt.v || 0),
      pourcentage: seuil > 0 ? Math.min(100, Math.round((Number(caAnneeHt.v || 0) / seuil) * 100)) : 0,
    },
    include_test: includeTest,
  });
}

/* --------------------------------- Exports -------------------------------- */

async function exportApi(env, url) {
  const type = url.searchParams.get("type") || "clients";
  const includeTest = url.searchParams.get("include_test") === "1";
  const filter = includeTest ? "" : "WHERE est_test = 0";
  const todayValue = todayStr();

  if (type === "clients") {
    const rows = await env.DB.prepare(`SELECT * FROM clients ${filter} ORDER BY nom COLLATE NOCASE`).all();
    return csvResponse(
      "clients.csv",
      ["id", "nom", "societe", "email", "tel", "adresse", "tva", "type", "statut", "peppol_id", "notes", "est_test", "created_at"],
      rows.results.map((client) => [
        client.id,
        client.nom,
        client.societe,
        client.email,
        client.tel,
        client.adresse,
        client.tva,
        client.type,
        client.statut,
        client.peppol_id,
        client.notes,
        client.est_test,
        client.created_at,
      ])
    );
  }
  if (type === "devis") {
    const rows = await env.DB.prepare(
      `SELECT d.*, c.nom AS client_nom FROM devis d JOIN clients c ON c.id = d.client_id ${includeTest ? "" : "WHERE d.est_test = 0"} ORDER BY d.date DESC`
    ).all();
    return csvResponse(
      "devis.csv",
      ["id", "numero", "date", "date_prestation", "client", "statut", "taux_tva", "total_ht", "total_ttc", "validite_jours", "notes", "lignes", "est_test", "created_at"],
      rows.results.map((devis) => [
        devis.id,
        devis.numero,
        devis.date,
        devis.date_prestation,
        devis.client_nom,
        devis.statut,
        devis.taux_tva,
        devis.total_ht,
        devis.total_ttc,
        devis.validite_jours,
        devis.notes,
        devis.lignes,
        devis.est_test,
        devis.created_at,
      ])
    );
  }
  if (type === "factures") {
    const rows = await env.DB.prepare(
      `SELECT f.*, c.nom AS client_nom FROM factures f JOIN clients c ON c.id = f.client_id ${includeTest ? "" : "WHERE f.est_test = 0"} ORDER BY f.date DESC`
    ).all();
    return csvResponse(
      "factures.csv",
      ["id", "numero", "numero_externe", "date", "date_prestation", "echeance", "client", "montant_ht", "taux_tva", "total_ttc", "statut", "payee_le", "moyen_paiement", "relance_le", "note", "est_test", "created_at"],
      rows.results.map((facture) => [
        facture.id,
        facture.numero,
        facture.numero_externe,
        facture.date,
        facture.date_prestation,
        facture.echeance,
        facture.client_nom,
        facture.montant_ht,
        facture.taux_tva,
        facture.total_ttc,
        facture.statut,
        facture.payee_le,
        facture.moyen_paiement,
        facture.relance_le,
        facture.note,
        facture.est_test,
        facture.created_at,
      ])
    );
  }
  if (type === "services") {
    const rows = await env.DB.prepare("SELECT * FROM services ORDER BY description COLLATE NOCASE").all();
    return csvResponse(
      "prestations.csv",
      ["id", "description", "prix_ht", "taux_tva", "unite", "actif", "created_at"],
      rows.results.map((service) => [service.id, service.description, service.prix_ht, service.taux_tva, service.unite, service.actif, service.created_at])
    );
  }
  throw new HttpError(400, "Type inconnu (clients|devis|factures|services).");
}

function csvResponse(filename, header, rows) {
  const payload = csvDocument(header, rows);
  return new Response(payload, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/* -------------------------------- Document -------------------------------- */

async function documentApi(env, url) {
  const type = url.searchParams.get("type");
  const id = url.searchParams.get("id");
  if (!id || (type !== "devis" && type !== "facture")) {
    throw new HttpError(400, "Paramètres invalides (type=devis|facture, id=…).");
  }
  const table = type === "devis" ? "devis" : "factures";
  const doc = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(id).first();
  if (!doc) throw new HttpError(404, "Document introuvable.");
  const client = await env.DB.prepare("SELECT * FROM clients WHERE id = ?").bind(doc.client_id).first();
  if (!client) throw new HttpError(404, "Client introuvable.");
  const profile = await profileData(env);
  const franchise = profile.tva_regime === "franchise";
  let lignes = [];
  if (type === "devis") {
    lignes = parseLines(doc.lignes);
  } else {
    lignes = parseLines(doc.lignes);
    if (!lignes.length && doc.devis_id) {
      const devis = await env.DB.prepare("SELECT lignes FROM devis WHERE id = ?").bind(doc.devis_id).first();
      if (devis) lignes = parseLines(devis.lignes);
    }
    if (!lignes.length) {
      lignes = [{ description: "Prestation", qty: 1, prix_ht: doc.montant_ht }];
    }
  }
  const totalHt = type === "devis" ? Number(doc.total_ht || 0) : Number(doc.montant_ht || 0);
  const totalTtc = franchise ? totalHt : Number(doc.total_ttc || totalHt);
  const tva = franchise ? 0 : Math.max(0, Math.round((totalTtc - totalHt) * 100) / 100);
  const todayValue = todayStr();
  return json({
    type,
    est_test: Number(doc.est_test || 0),
    franchise,
    mention_tva: franchise ? "Régime particulier de franchise des petites entreprises — TVA non applicable (art. 56bis du Code TVA)." : null,
    profile,
    client: {
      nom: client.nom,
      societe: client.societe,
      email: client.email,
      adresse: client.adresse,
      tva: client.tva,
      type: client.type,
      display_name: clientDisplayName(client.nom, client.societe),
    },
    doc: {
      numero: doc.numero,
      numero_externe: doc.numero_externe || null,
      date: doc.date,
      date_prestation: doc.date_prestation || null,
      validite_jours: doc.validite_jours || 0,
      statut: doc.statut,
      echeance: doc.echeance || null,
      lignes,
      taux_tva: franchise ? 0 : Number(doc.taux_tva || 0),
      total_ht: totalHt,
      tva,
      total_ttc: totalTtc,
      note: doc.note || doc.notes || "",
      en_retard: type === "facture" && doc.statut !== "payee" && doc.statut !== "a_envoyer" && doc.echeance < todayValue ? 1 : 0,
    },
  });
}

/* ---------------------------------- Auth ---------------------------------- */

async function authApi(request, env) {
  if (!env.AUTH_SECRET) throw new HttpError(500, "AUTH_SECRET manquant.");
  const body = await readJson(request);
  const mode = body.mode === "signup" ? "signup" : "login";
  const password = typeof body.password === "string" ? body.password : "";
  if (!password) throw new HttpError(400, "Mot de passe requis.");
  const stored = await env.DB.prepare("SELECT value FROM settings WHERE key = 'password_hash'").bind().first();
  const ip = ipOf(request);

  if (mode === "signup") {
    if (stored) throw new HttpError(409, "Le mot de passe est déjà défini. Connectez-vous.");
    const problem = passwordProblem(password);
    if (problem) throw new HttpError(400, problem);
    const hash = await hashPassword(password);
    await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('password_hash', ?)").bind(hash).run();
    const token = await createSession(env, request);
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(token) });
  }

  if (!stored) throw new HttpError(400, "Aucun mot de passe défini.");
  if (await loginBlocked(env, ip)) throw new HttpError(429, "Trop de tentatives. Réessayez dans 15 minutes.");
  const ok = await verifyPassword(password, stored.value);
  if (!ok) {
    await recordFail(env, ip);
    throw new HttpError(401, "Mot de passe incorrect.");
  }
  await clearFails(env, ip);
  await env.DB.prepare("DELETE FROM login_attempts WHERE window_start < ?").bind(new Date(Date.now() - 86400000).toISOString()).run();
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(nowIso()).run();
  const token = await createSession(env, request);
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(token) });
}

async function meApi(request, env) {
  const stored = await env.DB.prepare("SELECT value FROM settings WHERE key = 'password_hash'").bind().first();
  const authed = await requireAuth(request, env);
  return json({ configured: !!stored, authed: !!authed });
}

async function logoutApi(request, env) {
  const payload = await tokenPayload(request, env);
  if (payload?.jti) await revokeSession(env, payload.jti);
  return json({ ok: true }, 200, { "Set-Cookie": clearCookie() });
}

async function passwordApi(request, env) {
  const session = await requireAuth(request, env);
  if (!session) return unauthorized();
  const body = await readJson(request);
  const current = typeof body.current === "string" ? body.current : "";
  const next = typeof body.new === "string" ? body.new : "";
  const stored = await env.DB.prepare("SELECT value FROM settings WHERE key = 'password_hash'").bind().first();
  if (!stored || !(await verifyPassword(current, stored.value))) throw new HttpError(400, "Mot de passe actuel incorrect.");
  const problem = passwordProblem(next);
  if (problem) throw new HttpError(400, problem);
  await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('password_hash', ?)").bind(await hashPassword(next)).run();
  await env.DB.prepare("UPDATE sessions SET revoked_at = ? WHERE revoked_at IS NULL").bind(nowIso()).run();
  const token = await createSession(env, request);
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(token) });
}

async function logoutAllApi(request, env) {
  const session = await requireAuth(request, env);
  if (!session) return unauthorized();
  await env.DB.prepare("UPDATE sessions SET revoked_at = ? WHERE revoked_at IS NULL").bind(nowIso()).run();
  return json({ ok: true }, 200, { "Set-Cookie": clearCookie() });
}

/* --------------------------------- Routage -------------------------------- */

async function handleApi(request, env, url) {
  const path = url.pathname.slice("/api/".length);
  const segments = path.split("/").filter(Boolean);
  const method = request.method;
  const [resource, id, action] = segments;

  if (path === "health" && method === "GET") return json({ ok: true, app: "gestion" });
  if (path === "auth" && method === "POST") return authApi(request, env);
  if (path === "logout" && method === "POST") return logoutApi(request, env);
  if (path === "me" && method === "GET") return meApi(request, env);

  const session = await requireAuth(request, env);
  if (!session) return unauthorized();
  if (path === "logout-all" && method === "POST") return logoutAllApi(request, env);
  if (path === "password" && method === "POST") return passwordApi(request, env);

  const body = ["POST", "PUT", "PATCH"].includes(method) ? await readJson(request) : null;

  if (resource === "profile" && method === "GET") return json(await profileData(env));
  if (resource === "profile" && method === "PUT") return profilePut(env, body || {});
  if (resource === "document" && method === "GET") return documentApi(env, url);
  if (resource === "clients") return clientsApi(request, env, method, id, body, url);
  if (resource === "notes") return notesApi(request, env, method, id, body, url);
  if (resource === "services") return servicesApi(request, env, method, id, body);
  if (resource === "stats" && method === "GET") return statsApi(env, url);
  if (resource === "export" && method === "GET") return exportApi(env, url);

  if (resource === "devis") {
    if (id && action === "statut" && method === "POST") return devisStatut(env, id, body);
    if (id && action === "duplicate" && method === "POST") return duplicateDevis(env, id);
    if (id && action === "facture" && method === "POST") return facturerDevis(env, id);
    return devisApi(request, env, method, id, body, url);
  }
  if (resource === "factures") {
    if (id && action === "statut" && method === "POST") return factureStatut(env, id, body);
    if (id && action === "duplicate" && method === "POST") return duplicateFacture(env, id);
    if (id && action === "relance" && method === "POST") return relanceFacture(env, id);
    return facturesApi(request, env, method, id, body, url);
  }

  throw new HttpError(404, "Route inconnue.");
}

/* ---------------------------------- Fetch --------------------------------- */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // HTTPS obligatoire (hors développement local).
    const scheme =
      (request.headers.get("CF-Visitor") || "").match(/"scheme":"(https?)"/)?.[1] || url.protocol.replace(":", "");
    if (scheme === "http" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }

    if (!url.pathname.startsWith("/api/")) {
      if (env.ASSETS) return env.ASSETS.fetch(request);
      return json({ error: "Assets non configurés." }, 404);
    }
    if (!env.DB) return json({ error: "Base D1 non liée." }, 500);

    try {
      checkOrigin(request);
      return await handleApi(request, env, url);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      const errorId = uuid().slice(0, 8);
      console.error(JSON.stringify({ errorId, path: url.pathname, method: request.method, message: String(error?.message || error) }));
      if (String(error?.message || "").includes("no such table")) {
        return json({ error: "Base non initialisée : exécute d1/schema.sql.", errorId }, 500);
      }
      return json({ error: `Erreur interne (réf. ${errorId}).`, errorId }, 500);
    }
  },
};
