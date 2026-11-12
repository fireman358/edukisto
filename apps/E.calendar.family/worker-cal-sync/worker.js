/* cal-sync — pont de synchronisation Cloudflare D1 (base cal_sync, table famille_sync)
   Déployé sur https://sync.edukisto.win (Custom domain du Worker).

   Endpoints :
     GET  /api/sync?jeton=<id>   → { jeton, contenu, maj } de la ligne famille_sync
     POST /api/sync              → upsert { id, jeton, contenu, maj } (contenu chiffré
                                   côté navigateur, stocké tel quel)
     POST /api/ics (p_url)      → proxy ICS pour les agendas Google (remplace le
                                   RPC Supabase famille_proxy_ics) → { texte }

   CORS : uniquement les apps edukisto (ecal, calfam, repas). */

const ORIGINES = new Set([
  "https://ecal.edukisto.win",
  "https://calfam.edukisto.win",
  "https://repas.edukisto.win",
]);

function cors(request) {
  const origin = request.headers.get("Origin") || "";
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
  };
  if (ORIGINES.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(request, statut, obj) {
  return new Response(JSON.stringify(obj), { status: statut, headers: cors(request) });
}

function maintenantISO() {
  return new Date().toISOString();
}

async function lireSync(env, id) {
  const row = await env.DB
    .prepare("SELECT id, jeton, contenu, maj FROM famille_sync WHERE id = ?")
    .bind(id)
    .first();
  if (!row) return null;
  let contenu = row.contenu;
  if (typeof contenu === "string") {
    try { contenu = JSON.parse(contenu); } catch (e) { /* stocké tel quel */ }
  }
  return { jeton: row.jeton, contenu, maj: row.maj };
}

async function ecrireSync(env, id, jeton, contenu, maj) {
  const bloc = typeof contenu === "string" ? contenu : JSON.stringify(contenu);
  await env.DB
    .prepare(
      "INSERT INTO famille_sync (id, jeton, contenu, maj) VALUES (?, ?, ?, ?) " +
      "ON CONFLICT(id) DO UPDATE SET jeton = excluded.jeton, contenu = excluded.contenu, maj = excluded.maj"
    )
    .bind(id, jeton, bloc, maj || maintenantISO())
    .run();
}

async function proxyICS(pUrl) {
  if (!pUrl || !/^https:\/\/calendar\.google\.com\/calendar\/ical\//.test(pUrl)) {
    return { statut: 400, corps: { erreur: "URL non autorisée : uniquement les agendas calendar.google.com" } };
  }
  try {
    const r = await fetch(pUrl);
    if (!r.ok) return { statut: r.status, corps: { erreur: "Google a répondu " + r.status } };
    return { statut: 200, corps: { texte: await r.text() } };
  } catch (e) {
    return { statut: 502, corps: { erreur: "Proxy indisponible : " + e.message } };
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(request) });
    }

    try {
      if (url.pathname === "/api/sync" && request.method === "GET") {
        const id = (url.searchParams.get("jeton") || "").trim();
        if (!id || id.length > 64) return json(request, 400, { erreur: "Paramètre jeton manquant ou invalide" });
        const ligne = await lireSync(env, id);
        if (!ligne) return json(request, 404, { erreur: "Aucune donnée pour ce jeton" });
        return json(request, 200, ligne);
      }

      if (url.pathname === "/api/sync" && request.method === "POST") {
        const p = await request.json().catch(() => null);
        if (!p || typeof p.id !== "string" || !p.id.trim() || p.id.length > 64) {
          return json(request, 400, { erreur: "Corps invalide : id requis" });
        }
        if (p.contenu === undefined || p.contenu === null) {
          return json(request, 400, { erreur: "Corps invalide : contenu requis" });
        }
        const maj = typeof p.maj === "string" && p.maj ? p.maj : maintenantISO();
        await ecrireSync(env, p.id.trim(), String(p.jeton || "x").slice(0, 60), p.contenu, maj);
        return json(request, 200, { ok: true, maj });
      }

      if (url.pathname === "/api/ics" && request.method === "POST") {
        let pUrl = url.searchParams.get("p_url");
        if (!pUrl) {
          const p = await request.json().catch(() => null);
          pUrl = p && p.p_url;
        }
        const out = await proxyICS(pUrl);
        return json(request, out.statut, out.corps);
      }

      if (url.pathname === "/" && request.method === "GET") {
        return json(request, 200, {
          service: "cal-sync · edukisto",
          endpoints: ["/api/sync (GET jeton, POST upsert)", "/api/ics (POST p_url)"],
        });
      }

      return json(request, 404, { erreur: "Route inconnue" });
    } catch (e) {
      return json(request, 500, { erreur: "Erreur Worker : " + e.message });
    }
  },
};
