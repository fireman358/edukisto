import { jwtVerify } from "./_auth";

interface Env {
  DB: D1Database;
  AUTH_SECRET: string;
}

export const onRequestPost = async (context: { env: Env; request: Request }) => {
  const { env, request } = context;

  let payload: { token?: string };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Requête invalide" }, { status: 400 });
  }

  const { token } = payload;
  if (!token) {
    return Response.json({ error: "Session expirée, reconnectez-vous" }, { status: 401 });
  }
  if (!env.DB) return Response.json({ error: "Base D1 non liée : vérifie le binding DB" }, { status: 500 });
  if (!env.AUTH_SECRET) return Response.json({ error: "AUTH_SECRET manquant dans les variables Cloudflare" }, { status: 500 });

  const claims = await jwtVerify(token, env.AUTH_SECRET);
  if (!claims || !claims.tenant_id || !claims.property_id) {
    return Response.json({ error: "Session invalide, reconnectez-vous" }, { status: 401 });
  }

  try {
    const requests = await env.DB.prepare(
      "SELECT * FROM requests WHERE property_id = ? ORDER BY created_at DESC"
    ).bind(claims.property_id).all();
    const property = await env.DB.prepare(
      "SELECT address FROM properties WHERE id = ?"
    ).bind(claims.property_id).first<any>();
    let owner_phone: string | null = null;
    if (property) {
      const owner = await env.DB.prepare(
        `SELECT pr.phone FROM profiles pr JOIN properties p ON p.owner_id = pr.id WHERE p.id = ?`
      ).bind(claims.property_id).first<any>();
      owner_phone = owner?.phone || null;
    }

    return Response.json({
      requests: (requests.results || []).map((r: any) => ({ ...r, owner_read: !!r.owner_read })),
      property: property ? { address: property.address } : null,
      owner_phone,
    });
  } catch (e: any) {
    return Response.json({ error: "Erreur serveur : " + e.message }, { status: 500 });
  }
};

export const onRequest = async (context: any) => {
  if (context.request.method === "POST") return onRequestPost(context);
  return Response.json({ error: "Method not allowed" }, { status: 405 });
};
