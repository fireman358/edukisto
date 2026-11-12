/* Worker cal-sync — API de synchro chiffrée pour Ecal, calfam et repas.
 * Endpoints :
 *   GET  /api/sync?jeton=<id>   → { contenu, maj } (jeton=verification → test de connexion)
 *   POST /api/sync {id, jeton, contenu, maj} → upsert
 *   POST /api/ics {p_url}        → proxy ICS (agendas Google)
 * Base D1 : cal_sync, table famille_sync (id, jeton, contenu, maj). */

const ALLOWED_ORIGINS = [
  "https://ecal.edukisto.win",
  "https://calfam.edukisto.win",
  "https://repas.edukisto.win",
];

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  if (!ALLOWED_ORIGINS.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

const json = (data, status, extra = {}) =>
  new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "Content-Type": "application/json", ...extra },
  });

async function handleSync(request, env) {
  const url = new URL(request.url);

  if (request.method === "GET") {
    const jeton = url.searchParams.get("jeton") || "";
    if (jeton === "verification") {
      return json({ ok: true, service: "cal-sync" });
    }
    if (!env.DB) return json({ error: "Base D1 non liée : binding DB manquant" }, 500);
    if (!jeton || jeton.length < 3 || jeton.length > 100) {
      return json({ error: "Jeton manquant ou invalide" }, 400);
    }
    try {
      const row = await env.DB.prepare("SELECT contenu, maj FROM famille_sync WHERE id = ?")
        .bind(jeton)
        .first();
      if (!row) return json({ contenu: null, maj: null });
      return json({
        contenu: JSON.parse(row.contenu),
        maj: row.maj,
      });
    } catch (e) {
      return json({ error: "Base non initialisée : exécute le schéma famille_sync dans la console D1 (cal_sync)", detail: String(e.message || e) }, 500);
    }
  }

  if (request.method === "POST") {
    if (!env.DB) return json({ error: "Base D1 non liée : binding DB manquant" }, 500);
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Requête invalide" }, 400);
    }
    const { id, jeton, contenu, maj } = body || {};
    if (!id || !jeton || contenu === undefined || contenu === null) {
      return json({ error: "Champs requis manquants (id, jeton, contenu)" }, 400);
    }
    if (String(id).length > 100 || String(jeton).length > 200) {
      return json({ error: "Identifiants trop longs" }, 400);
    }
    const contenuStr = JSON.stringify(contenu);
    if (contenuStr.length > 500000) {
      return json({ error: "Contenu trop volumineux (max 500 Ko)" }, 413);
    }
    try {
      await env.DB.prepare(
        "INSERT INTO famille_sync (id, jeton, contenu, maj) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET jeton = excluded.jeton, contenu = excluded.contenu, maj = excluded.maj"
      ).bind(String(id), String(jeton), contenuStr, maj || new Date().toISOString()).run();
      return json({ ok: true });
    } catch (e) {
      return json({ error: "Base non initialisée : exécute le schéma famille_sync dans la console D1 (cal_sync)", detail: String(e.message || e) }, 500);
    }
  }

  return json({ error: "Method not allowed" }, 405);
}

async function handleIcs(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Requête invalide" }, 400);
  }
  const p_url = body?.p_url;
  if (!p_url || !/^https?:\/\//.test(p_url)) {
    return json({ error: "p_url invalide" }, 400);
  }
  try {
    const r = await fetch(p_url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; cal-sync/1.0)" },
      redirect: "follow",
    });
    if (!r.ok) return json({ error: "ICS inaccessible (HTTP " + r.status + ")" }, 502);
    const text = await r.text();
    return new Response(text, {
      status: 200,
      headers: { "Content-Type": "text/calendar; charset=utf-8" },
    });
  } catch (e) {
    return json({ error: "Proxy ICS impossible : " + (e.message || e) }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      if (url.pathname === "/api/sync") {
        const res = await handleSync(request, env);
        const headers = { ...Object.fromEntries(res.headers), ...cors };
        return new Response(res.body, { status: res.status, headers });
      }
      if (url.pathname === "/api/ics") {
        const res = await handleIcs(request, env);
        const headers = { ...Object.fromEntries(res.headers), ...cors };
        return new Response(res.body, { status: res.status, headers });
      }
      return json({ service: "cal-sync", endpoints: ["/api/sync", "/api/ics"] }, 200, cors);
    } catch (e) {
      return json({ error: "Erreur serveur : " + (e.message || e) }, 500, cors);
    }
  },
};
