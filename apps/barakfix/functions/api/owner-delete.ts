import { jwtVerify } from "./_auth";

interface Env {
  DB: D1Database;
  AUTH_SECRET: string;
}

export const onRequestPost = async (context: { env: Env; request: Request }) => {
  const { env, request } = context;

  let payload: { owner_token?: string };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Requête invalide" }, { status: 400 });
  }

  const { owner_token } = payload;
  if (!owner_token) {
    return Response.json({ error: "Session expirée, reconnectez-vous" }, { status: 401 });
  }
  if (!env.DB) return Response.json({ error: "Base D1 non liée : vérifie le binding DB" }, { status: 500 });
  if (!env.AUTH_SECRET) return Response.json({ error: "AUTH_SECRET manquant dans les variables Cloudflare" }, { status: 500 });

  const claims = await jwtVerify(owner_token, env.AUTH_SECRET);
  if (!claims || claims.role !== "bailleur" || !claims.owner_id) {
    return Response.json({ error: "Session invalide, reconnectez-vous" }, { status: 401 });
  }
  const ownerId = claims.owner_id as string;

  try {
    const props = await env.DB.prepare("SELECT id FROM properties WHERE owner_id = ?").bind(ownerId).all();
    for (const p of props.results || []) {
      await env.DB.prepare(
        "DELETE FROM request_photos WHERE request_id IN (SELECT id FROM requests WHERE property_id = ?)"
      ).bind(p.id).run();
      await env.DB.prepare(
        "DELETE FROM interventions WHERE request_id IN (SELECT id FROM requests WHERE property_id = ?)"
      ).bind(p.id).run();
      await env.DB.prepare("DELETE FROM requests WHERE property_id = ?").bind(p.id).run();
      await env.DB.prepare("DELETE FROM tenants WHERE property_id = ?").bind(p.id).run();
    }
    await env.DB.prepare("DELETE FROM properties WHERE owner_id = ?").bind(ownerId).run();
    await env.DB.prepare("DELETE FROM profiles WHERE id = ?").bind(ownerId).run();
    return Response.json({ success: true });
  } catch (e: any) {
    return Response.json({ error: "Erreur serveur : " + e.message }, { status: 500 });
  }
};

export const onRequest = async (context: any) => {
  if (context.request.method === "POST") return onRequestPost(context);
  return Response.json({ error: "Method not allowed" }, { status: 405 });
};
