/* gestion (gestion.edukisto.win) — outil de gestion clients / devis / factures d'Edukisto.
   Worker unique : API /api/* protégée par cookie de session JWT + assets statiques (public/).

   Auth : un seul utilisateur. Mot de passe hashé en PBKDF2-SHA256 (table settings),
   session = JWT HS256 signé avec le secret AUTH_SECRET, cookie HttpOnly/Secure/SameSite=Strict.
   Factures : émises via Accountable (envoi Peppol BIS 3.0 obligatoire en B2B belge depuis 2026) ;
   l'app ne fait que tracer les factures et leur statut. */

const enc = new TextEncoder();

const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

function b64url(o) {
  const s = typeof o === "string" ? o : JSON.stringify(o);
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64uDecode(s) {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(s.length + ((4 - (s.length % 4)) % 4), "=");
  return decodeURIComponent(escape(atob(padded)));
}

async function jwtSign(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const data = `${b64url(header)}.${b64url({ ...payload, iat: Math.floor(Date.now() / 1000) })}`;
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return `${data}.${b64url(String.fromCharCode(...new Uint8Array(sig)))}`;
}

async function jwtVerify(token, secret) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const sig = Uint8Array.from(b64uDecode(parts[2]), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sig, enc.encode(`${parts[0]}.${parts[1]}`));
    if (!valid) return null;
    const payload = JSON.parse(b64uDecode(parts[1]));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

async function hashPassword(password, iterations = 100000) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return `pbkdf2$${iterations}$${hex(salt.buffer)}$${hex(bits)}`;
}

async function verifyPassword(password, stored) {
  try {
    const [scheme, iterStr, saltHex, hashHex] = stored.split("$");
    if (scheme !== "pbkdf2" || !iterStr || !saltHex || !hashHex) return false;
    const salt = Uint8Array.from(saltHex.match(/.{2}/g).map((h) => parseInt(h, 16)));
    const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations: parseInt(iterStr, 10) },
      key,
      256
    );
    return hex(bits) === hashHex;
  } catch {
    return false;
  }
}

const uuid = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();
const today = () => nowIso().slice(0, 10);

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
      ...headers,
    },
  });

const unauthorized = () => json({ error: "Non autorisé — reconnectez-vous." }, 401);

const COOKIE = "gestion_session";
const SESSION_MAX_AGE = 7 * 24 * 3600;

const sessionCookie = (token) =>
  `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_MAX_AGE}`;
const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx > 0 && part.slice(0, idx).trim() === name) return part.slice(idx + 1).trim();
  }
  return null;
}

async function requireAuth(request, env) {
  if (!env.AUTH_SECRET) return null;
  const token = getCookie(request, COOKIE);
  if (!token) return null;
  const payload = await jwtVerify(token, env.AUTH_SECRET);
  if (!payload || payload.sub !== "admin") return null;
  return payload;
}

/* Rate-limiting des connexions : 5 échecs / 15 min par IP */
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
async function loginBlocked(env, ip) {
  const row = await env.DB.prepare("SELECT fails, window_start FROM login_attempts WHERE ip = ?").bind(ip).first();
  if (!row) return false;
  if (Date.now() - Date.parse(row.window_start) > LOGIN_WINDOW_MS) return false;
  return row.fails >= 5;
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

const s = (v) => (v == null ? "" : String(v).trim());
const num = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

function computeTotals(lignes, tauxTva) {
  const totalHt = lignes.reduce((acc, l) => acc + num(l.qty, 0) * num(l.prix_ht, 0), 0);
  const ttc = totalHt * (1 + num(tauxTva, 21) / 100);
  return { totalHt: Math.round(totalHt * 100) / 100, totalTtc: Math.round(ttc * 100) / 100 };
}

async function nextNumero(env, table, prefix) {
  const year = new Date().getFullYear();
  const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE numero LIKE ?`).bind(`${prefix}-${year}-%`).first();
  return `${prefix}-${year}-${String((row?.n || 0) + 1).padStart(3, "0")}`;
}

function clientFields(body) {
  return {
    nom: s(body.nom),
    societe: s(body.societe),
    email: s(body.email),
    tel: s(body.tel),
    adresse: s(body.adresse),
    tva: s(body.tva).replace(/\s+/g, "").toUpperCase(),
    type: body.type === "b2c" ? "b2c" : "b2b",
    peppol_id: s(body.peppol_id),
    notes: s(body.notes),
  };
}

function parseLignes(raw) {
  let lignes = raw;
  if (typeof raw === "string") {
    try { lignes = JSON.parse(raw); } catch { lignes = []; }
  }
  if (!Array.isArray(lignes)) return [];
  return lignes
    .map((l) => ({ description: s(l.description), qty: num(l.qty, 0), prix_ht: num(l.prix_ht, 0) }))
    .filter((l) => l.description || l.qty || l.prix_ht);
}

async function handleAuth(request, env) {
  if (!env.AUTH_SECRET) return json({ error: "AUTH_SECRET manquant (wrangler secret put AUTH_SECRET)" }, 500);
  const body = await request.json().catch(() => null);
  const mode = body?.mode || "login";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password) return json({ error: "Mot de passe requis" }, 400);

  const ip = request.headers.get("CF-Connecting-IP") || "inconnu";
  const stored = await env.DB.prepare("SELECT value FROM settings WHERE key = 'password_hash'").bind().first();

  if (mode === "signup") {
    if (stored) return json({ error: "Le mot de passe est déjà défini. Connectez-vous." }, 409);
    if (password.length < 8) return json({ error: "Le mot de passe doit contenir au moins 8 caractères" }, 400);
    const hash = await hashPassword(password);
    await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('password_hash', ?)").bind(hash).run();
    const token = await jwtSign({ sub: "admin", exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE }, env.AUTH_SECRET);
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(token) });
  }

  if (!stored) return json({ error: "Aucun mot de passe défini : créez-le d'abord (mode signup)." }, 400);
  if (await loginBlocked(env, ip)) return json({ error: "Trop de tentatives. Réessayez dans 15 minutes." }, 429);
  const ok = await verifyPassword(password, stored.value);
  if (!ok) {
    await recordFail(env, ip);
    return json({ error: "Mot de passe incorrect." }, 401);
  }
  await clearFails(env, ip);
  const token = await jwtSign({ sub: "admin", exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE }, env.AUTH_SECRET);
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(token) });
}

async function handleApi(request, env, url) {
  const path = url.pathname.slice("/api/".length);
  const segments = path.split("/").filter(Boolean);
  const method = request.method;

  if (path === "auth" && method === "POST") return handleAuth(request, env);
  if (path === "logout" && method === "POST") return json({ ok: true }, 200, { "Set-Cookie": clearCookie() });
  if (path === "me" && method === "GET") {
    const stored = await env.DB.prepare("SELECT value FROM settings WHERE key = 'password_hash'").bind().first();
    const authed = await requireAuth(request, env);
    return json({ configured: !!stored, authed: !!authed });
  }

  if (!(await requireAuth(request, env))) return unauthorized();
  const body = ["POST", "PUT", "PATCH"].includes(method) ? await request.json().catch(() => null) : null;
  const [resource, id] = segments;

  if (resource === "profile" && method === "GET") return json(await profileData(env));
  if (resource === "profile" && method === "PUT") return profilePut(env, body);
  if (resource === "document" && method === "GET") return documentApi(env, url);
  if (resource === "clients") return clientsApi(request, env, method, id, body);
  if (resource === "devis") return devisApi(request, env, method, id, body);
  if (resource === "factures") return facturesApi(request, env, method, id, body);
  if (resource === "notes") return notesApi(request, env, method, id, body, url);
  if (resource === "stats" && method === "GET") return statsApi(env);
  if (resource === "export" && method === "GET") return exportApi(env, url);

  return json({ error: "Route inconnue" }, 404);
}

async function clientsApi(request, env, method, id, body) {
  if (method === "GET" && !id) {
    const rows = await env.DB.prepare(
      `SELECT c.*,
        (SELECT COUNT(*) FROM devis d WHERE d.client_id = c.id) AS nb_devis,
        (SELECT COUNT(*) FROM factures f WHERE f.client_id = c.id) AS nb_factures
       FROM clients c ORDER BY c.nom COLLATE NOCASE`
    ).all();
    return json(rows.results);
  }
  if (method === "POST" && !id) {
    const f = clientFields(body || {});
    if (!f.nom) return json({ error: "Le nom est obligatoire" }, 400);
    const newId = uuid();
    await env.DB.prepare(
      `INSERT INTO clients (id, nom, societe, email, tel, adresse, tva, type, peppol_id, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(newId, f.nom, f.societe, f.email, f.tel, f.adresse, f.tva, f.type, f.peppol_id, f.notes, nowIso()).run();
    return json({ ok: true, id: newId }, 201);
  }
  if (method === "GET" && id) {
    const client = await env.DB.prepare("SELECT * FROM clients WHERE id = ?").bind(id).first();
    if (!client) return json({ error: "Client introuvable" }, 404);
    const devis = await env.DB.prepare("SELECT * FROM devis WHERE client_id = ? ORDER BY date DESC, id DESC").bind(id).all();
    const factures = await env.DB.prepare("SELECT * FROM factures WHERE client_id = ? ORDER BY date DESC, id DESC").bind(id).all();
    const notes = await env.DB.prepare("SELECT * FROM notes WHERE client_id = ? ORDER BY created_at DESC, id DESC").bind(id).all();
    return json({ ...client, devis: devis.results, factures: factures.results, notes: notes.results });
  }
  if (method === "PUT" && id) {
    const existing = await env.DB.prepare("SELECT id FROM clients WHERE id = ?").bind(id).first();
    if (!existing) return json({ error: "Client introuvable" }, 404);
    const f = clientFields(body || {});
    if (!f.nom) return json({ error: "Le nom est obligatoire" }, 400);
    await env.DB.prepare(
      `UPDATE clients SET nom = ?, societe = ?, email = ?, tel = ?, adresse = ?, tva = ?, type = ?, peppol_id = ?, notes = ? WHERE id = ?`
    ).bind(f.nom, f.societe, f.email, f.tel, f.adresse, f.tva, f.type, f.peppol_id, f.notes, id).run();
    return json({ ok: true });
  }
  if (method === "DELETE" && id) {
    const doc = await env.DB.prepare(
      "SELECT (SELECT COUNT(*) FROM devis WHERE client_id = ?) + (SELECT COUNT(*) FROM factures WHERE client_id = ?) AS n"
    ).bind(id, id).first();
    if (doc && doc.n > 0) return json({ error: "Client lié à des devis ou factures : impossible à supprimer (archive légale)." }, 409);
    await env.DB.prepare("DELETE FROM notes WHERE client_id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM clients WHERE id = ?").bind(id).run();
    return json({ ok: true });
  }
  return json({ error: "Route inconnue" }, 404);
}

async function devisApi(request, env, method, id, body) {
  if (method === "GET" && !id) {
    const rows = await env.DB.prepare(
      "SELECT d.*, c.nom AS client_nom, c.societe AS client_societe FROM devis d JOIN clients c ON c.id = d.client_id ORDER BY d.date DESC, d.id DESC"
    ).all();
    return json(rows.results);
  }
  if (method === "POST" && !id) {
    const b = body || {};
    const client = await env.DB.prepare("SELECT id FROM clients WHERE id = ?").bind(s(b.client_id)).first();
    if (!client) return json({ error: "Client invalide" }, 400);
    const lignes = parseLignes(b.lignes);
    if (!lignes.length) return json({ error: "Au moins une ligne de devis requise" }, 400);
    const taux = num(b.taux_tva, 21);
    const { totalHt, totalTtc } = computeTotals(lignes, taux);
    const numero = s(b.numero) || (await nextNumero(env, "devis", "D"));
    const newId = uuid();
    const date = s(b.date) || today();
    const validite = Math.max(1, Math.min(365, Math.trunc(num(b.validite_jours, 30))));
    const statut = ["brouillon", "envoye", "accepte", "refuse", "expire"].includes(b.statut) ? b.statut : "brouillon";
    await env.DB.prepare(
      `INSERT INTO devis (id, client_id, numero, date, validite_jours, statut, lignes, taux_tva, total_ht, total_ttc, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(newId, client.id, numero, date, validite, statut, JSON.stringify(lignes), taux, totalHt, totalTtc, nowIso()).run();
    return json({ ok: true, id: newId, numero, total_ht: totalHt, total_ttc: totalTtc }, 201);
  }
  if (method === "PUT" && id) {
    const existing = await env.DB.prepare("SELECT * FROM devis WHERE id = ?").bind(id).first();
    if (!existing) return json({ error: "Devis introuvable" }, 404);
    const b = body || {};
    const lignes = b.lignes !== undefined ? parseLignes(b.lignes) : JSON.parse(existing.lignes || "[]");
    const taux = b.taux_tva !== undefined ? num(b.taux_tva, 21) : existing.taux_tva;
    const { totalHt, totalTtc } = computeTotals(lignes, taux);
    const statut = ["brouillon", "envoye", "accepte", "refuse", "expire"].includes(b.statut) ? b.statut : existing.statut;
    const date = s(b.date) || existing.date;
    const validite = b.validite_jours !== undefined ? Math.max(1, Math.min(365, Math.trunc(num(b.validite_jours, 30)))) : existing.validite_jours;
    await env.DB.prepare(
      "UPDATE devis SET date = ?, validite_jours = ?, statut = ?, lignes = ?, taux_tva = ?, total_ht = ?, total_ttc = ? WHERE id = ?"
    ).bind(date, validite, statut, JSON.stringify(lignes), taux, totalHt, totalTtc, id).run();
    return json({ ok: true, total_ht: totalHt, total_ttc: totalTtc });
  }
  if (method === "DELETE" && id) {
    await env.DB.prepare("UPDATE factures SET devis_id = NULL WHERE devis_id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM devis WHERE id = ?").bind(id).run();
    return json({ ok: true });
  }
  return json({ error: "Route inconnue" }, 404);
}

async function facturesApi(request, env, method, id, body) {
  if (method === "GET" && !id) {
    const rows = await env.DB.prepare(
      `SELECT f.*, c.nom AS client_nom, c.societe AS client_societe, c.tva AS client_tva, c.type AS client_type,
        CASE WHEN f.statut != 'payee' AND f.echeance < ? THEN 1 ELSE 0 END AS en_retard
       FROM factures f JOIN clients c ON c.id = f.client_id ORDER BY f.date DESC, f.id DESC`
    ).bind(today()).all();
    return json(rows.results);
  }
  if (method === "POST" && !id) {
    const b = body || {};
    const client = await env.DB.prepare("SELECT id FROM clients WHERE id = ?").bind(s(b.client_id)).first();
    if (!client) return json({ error: "Client invalide" }, 400);
    const montantHt = num(b.montant_ht, 0);
    if (montantHt <= 0) return json({ error: "Montant HT obligatoire" }, 400);
    const taux = num(b.taux_tva, 21);
    const totalTtc = Math.round(montantHt * (1 + taux / 100) * 100) / 100;
    const numero = s(b.numero) || (await nextNumero(env, "factures", "F"));
    const date = s(b.date) || today();
    let echeance = s(b.echeance);
    if (!echeance) {
      const d = new Date(date + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() + 30);
      echeance = d.toISOString().slice(0, 10);
    }
    const statut = ["a_envoyer", "envoyee_peppol", "envoyee_email", "payee"].includes(b.statut) ? b.statut : "a_envoyer";
    const newId = uuid();
    await env.DB.prepare(
      `INSERT INTO factures (id, client_id, devis_id, numero, date, echeance, montant_ht, taux_tva, total_ttc, statut, payee_le, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(newId, client.id, s(b.devis_id) || null, numero, date, echeance, montantHt, taux, totalTtc, statut, statut === "payee" ? today() : null, s(b.note), nowIso()).run();
    return json({ ok: true, id: newId, numero, total_ttc: totalTtc }, 201);
  }
  if (method === "PUT" && id) {
    const existing = await env.DB.prepare("SELECT * FROM factures WHERE id = ?").bind(id).first();
    if (!existing) return json({ error: "Facture introuvable" }, 404);
    const b = body || {};
    const montantHt = b.montant_ht !== undefined ? num(b.montant_ht, 0) : existing.montant_ht;
    const taux = b.taux_tva !== undefined ? num(b.taux_tva, 21) : existing.taux_tva;
    const totalTtc = Math.round(montantHt * (1 + taux / 100) * 100) / 100;
    const statut = ["a_envoyer", "envoyee_peppol", "envoyee_email", "payee"].includes(b.statut) ? b.statut : existing.statut;
    const echeance = s(b.echeance) || existing.echeance;
    const date = s(b.date) || existing.date;
    const payeeLe = statut === "payee" ? (existing.payee_le || today()) : null;
    await env.DB.prepare(
      "UPDATE factures SET date = ?, echeance = ?, montant_ht = ?, taux_tva = ?, total_ttc = ?, statut = ?, payee_le = ?, note = ? WHERE id = ?"
    ).bind(date, echeance, montantHt, taux, totalTtc, statut, payeeLe, b.note !== undefined ? s(b.note) : existing.note, id).run();
    return json({ ok: true, total_ttc: totalTtc });
  }
  if (method === "DELETE" && id) {
    await env.DB.prepare("DELETE FROM factures WHERE id = ?").bind(id).run();
    return json({ ok: true });
  }
  return json({ error: "Route inconnue" }, 404);
}

async function notesApi(request, env, method, id, body, url) {
  if (method === "GET" && !id) {
    const clientId = url.searchParams.get("client_id");
    const rows = clientId
      ? await env.DB.prepare("SELECT * FROM notes WHERE client_id = ? ORDER BY created_at DESC, id DESC").bind(clientId).all()
      : await env.DB.prepare("SELECT n.*, c.nom AS client_nom FROM notes n JOIN clients c ON c.id = n.client_id ORDER BY n.created_at DESC, n.id DESC LIMIT 200").all();
    return json(rows.results);
  }
  if (method === "POST" && !id) {
    const b = body || {};
    const client = await env.DB.prepare("SELECT id FROM clients WHERE id = ?").bind(s(b.client_id)).first();
    if (!client) return json({ error: "Client invalide" }, 400);
    const texte = s(b.texte);
    if (!texte) return json({ error: "Le texte est obligatoire" }, 400);
    const newId = uuid();
    await env.DB.prepare("INSERT INTO notes (id, client_id, texte, created_at) VALUES (?, ?, ?, ?)")
      .bind(newId, client.id, texte, nowIso()).run();
    return json({ ok: true, id: newId }, 201);
  }
  if (method === "DELETE" && id) {
    await env.DB.prepare("DELETE FROM notes WHERE id = ?").bind(id).run();
    return json({ ok: true });
  }
  return json({ error: "Route inconnue" }, 404);
}

const PROFILE_KEYS = ["nom", "adresse", "tva", "iban", "email", "tel", "site", "mentions"];

async function profileData(env) {
  const rows = await env.DB.prepare("SELECT key, value FROM settings WHERE key LIKE 'profile_%'").all();
  const p = {};
  for (const r of rows.results) p[r.key.slice("profile_".length)] = r.value;
  if (!p.site) p.site = "edukisto.win";
  return p;
}

async function profilePut(env, body) {
  const b = body || {};
  for (const k of PROFILE_KEYS) {
    if (b[k] !== undefined) {
      await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
        .bind("profile_" + k, s(b[k])).run();
    }
  }
  return json({ ok: true });
}

async function documentApi(env, url) {
  const type = url.searchParams.get("type");
  const id = url.searchParams.get("id");
  if (!id || (type !== "devis" && type !== "facture")) {
    return json({ error: "Paramètres invalides (type=devis|facture, id=…)" }, 400);
  }
  const table = type === "devis" ? "devis" : "factures";
  const doc = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(id).first();
  if (!doc) return json({ error: "Document introuvable" }, 404);
  const client = await env.DB.prepare("SELECT * FROM clients WHERE id = ?").bind(doc.client_id).first();
  if (!client) return json({ error: "Client introuvable" }, 404);
  const out = {
    type,
    profile: await profileData(env),
    client: { nom: client.nom, societe: client.societe, email: client.email, adresse: client.adresse, tva: client.tva, type: client.type },
  };
  if (type === "devis") {
    out.doc = {
      numero: doc.numero, date: doc.date, validite_jours: doc.validite_jours, statut: doc.statut,
      lignes: JSON.parse(doc.lignes || "[]"), taux_tva: doc.taux_tva,
      total_ht: doc.total_ht, total_ttc: doc.total_ttc,
    };
  } else {
    let lignes = null;
    if (doc.devis_id) {
      const d = await env.DB.prepare("SELECT lignes, taux_tva FROM devis WHERE id = ?").bind(doc.devis_id).first();
      if (d) lignes = JSON.parse(d.lignes || "[]");
    }
    out.doc = {
      numero: doc.numero, date: doc.date, echeance: doc.echeance, statut: doc.statut,
      montant_ht: doc.montant_ht, taux_tva: doc.taux_tva, total_ttc: doc.total_ttc,
      note: doc.note, lignes,
      en_retard: doc.statut !== "payee" && doc.echeance < today() ? 1 : 0,
    };
  }
  return json(out);
}

async function statsApi(env) {
  const t = today();
  const mois = t.slice(0, 7);
  const one = async (q, ...args) => (await env.DB.prepare(q).bind(...args).first()) || {};
  const caPayeTotal = await one("SELECT COALESCE(SUM(total_ttc), 0) AS v FROM factures WHERE statut = 'payee'");
  const caPayeMois = await one("SELECT COALESCE(SUM(total_ttc), 0) AS v FROM factures WHERE statut = 'payee' AND substr(date, 1, 7) = ?", mois);
  const caAttente = await one("SELECT COALESCE(SUM(total_ttc), 0) AS v, COUNT(*) AS n FROM factures WHERE statut IN ('envoyee_peppol', 'envoyee_email')");
  const enRetard = await one("SELECT COALESCE(SUM(total_ttc), 0) AS v, COUNT(*) AS n FROM factures WHERE statut != 'payee' AND echeance < ?", t);
  const devisEnvoyes = await one("SELECT COALESCE(SUM(total_ttc), 0) AS v, COUNT(*) AS n FROM devis WHERE statut = 'envoye'");
  const devisAcceptes = await one("SELECT COUNT(*) AS n FROM devis WHERE statut = 'accepte'");
  const nbClients = await one("SELECT COUNT(*) AS n FROM clients");
  const aRelancer = await env.DB.prepare(
    `SELECT f.*, c.nom AS client_nom FROM factures f JOIN clients c ON c.id = f.client_id
     WHERE f.statut != 'payee' AND f.echeance < ? ORDER BY f.echeance ASC LIMIT 10`
  ).bind(t).all();
  return json({
    ca_paye_total: Math.round(caPayeTotal.v * 100) / 100,
    ca_paye_mois: Math.round(caPayeMois.v * 100) / 100,
    ca_en_attente: Math.round(caAttente.v * 100) / 100,
    nb_en_attente: caAttente.n,
    en_retard: Math.round(enRetard.v * 100) / 100,
    nb_en_retard: enRetard.n,
    devis_envoyes: Math.round(devisEnvoyes.v * 100) / 100,
    nb_devis_envoyes: devisEnvoyes.n,
    nb_devis_acceptes: devisAcceptes.n,
    nb_clients: nbClients.n,
    a_relancer: aRelancer.results,
  });
}

function csvResponse(filename, header, rows) {
  const esc = (v) => String(v ?? "").replace(/;/g, ",").replace(/\n/g, " ");
  const body = "﻿" + header + "\n" + rows.map((r) => r.map(esc).join(";")).join("\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function exportApi(env, url) {
  const type = url.searchParams.get("type") || "clients";
  if (type === "clients") {
    const rows = await env.DB.prepare("SELECT * FROM clients ORDER BY nom COLLATE NOCASE").all();
    return csvResponse("clients.csv",
      "id;nom;societe;email;tel;adresse;tva;type;peppol_id;notes;created_at",
      rows.results.map((c) => [c.id, c.nom, c.societe, c.email, c.tel, c.adresse, c.tva, c.type, c.peppol_id, c.notes, c.created_at]));
  }
  if (type === "devis") {
    const rows = await env.DB.prepare("SELECT d.*, c.nom AS client_nom FROM devis d JOIN clients c ON c.id = d.client_id ORDER BY d.date DESC").all();
    return csvResponse("devis.csv",
      "id;numero;date;client;statut;taux_tva;total_ht;total_ttc;lignes;created_at",
      rows.results.map((d) => [d.id, d.numero, d.date, d.client_nom, d.statut, d.taux_tva, d.total_ht, d.total_ttc, d.lignes, d.created_at]));
  }
  if (type === "factures") {
    const rows = await env.DB.prepare("SELECT f.*, c.nom AS client_nom FROM factures f JOIN clients c ON c.id = f.client_id ORDER BY f.date DESC").all();
    return csvResponse("factures.csv",
      "id;numero;date;echeance;client;montant_ht;taux_tva;total_ttc;statut;payee_le;note;created_at",
      rows.results.map((f) => [f.id, f.numero, f.date, f.echeance, f.client_nom, f.montant_ht, f.taux_tva, f.total_ttc, f.statut, f.payee_le, f.note, f.created_at]));
  }
  return json({ error: "Type inconnu (clients|devis|factures)" }, 400);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      if (!env.DB) return json({ error: "Base D1 non liée : vérifie le binding DB dans wrangler.jsonc" }, 500);
      try {
        return await handleApi(request, env, url);
      } catch (e) {
        const m = String((e && e.message) || e);
        if (m.includes("no such table")) {
          return json({ error: "Base non initialisée : exécute d1/schema.sql (wrangler d1 execute gestion --remote --file=d1/schema.sql)" }, 500);
        }
        return json({ error: "Erreur serveur : " + m }, 500);
      }
    }
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return json({ error: "Assets non configurés" }, 404);
  },
};
