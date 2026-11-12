import { jwtSign, verifyPin } from "./_auth";

interface Env {
  DB: D1Database;
  AUTH_SECRET: string;
}

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const CODE_RE = /^[A-Z0-9]{2,4}-[A-Z0-9]{2,4}-[A-Z0-9]{1,6}$/;

export const onRequestPost = async (context: { env: Env; request: Request }) => {
  const { env, request } = context;

  let payload: { access_code?: string; email?: string; pin?: string };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Requête invalide" }, { status: 400 });
  }

  const { access_code, email, pin } = payload;
  if (!access_code || !email || !pin || !CODE_RE.test(access_code.toUpperCase())) {
    return Response.json({ error: "Code logement, email et PIN requis" }, { status: 400 });
  }
  if (!env.DB) return Response.json({ error: "Base D1 non liée : vérifie le binding DB" }, { status: 500 });
  if (!env.AUTH_SECRET) return Response.json({ error: "AUTH_SECRET manquant dans les variables Cloudflare" }, { status: 500 });

  try {
    const property = await env.DB.prepare(
      "SELECT id, access_code_revoked_at FROM properties WHERE access_code = ?"
    ).bind(access_code.toUpperCase()).first<any>();
    if (!property) {
      return Response.json({ error: "Code logement inconnu" }, { status: 404 });
    }
    if (property.access_code_revoked_at) {
      return Response.json({ error: "Ce code logement a été révoqué par le bailleur" }, { status: 403 });
    }

    const tenant = await env.DB.prepare(
      "SELECT id, full_name, email, pin_hash, pin_attempts, locked_until FROM tenants WHERE property_id = ? AND lower(email) = ?"
    ).bind(property.id, email.trim().toLowerCase()).first<any>();
    if (!tenant) {
      return Response.json({ error: "Aucun locataire avec cet email sur ce logement" }, { status: 404 });
    }

    if (tenant.locked_until && new Date(tenant.locked_until) > new Date()) {
      const min = Math.ceil((new Date(tenant.locked_until).getTime() - Date.now()) / 60000);
      return Response.json({ error: `Trop de tentatives. Réessayez dans ${min} minute(s).` }, { status: 423 });
    }

    const ok = await verifyPin(pin, tenant.pin_hash);
    if (!ok) {
      const attempts = (tenant.pin_attempts || 0) + 1;
      const locked = attempts >= MAX_ATTEMPTS;
      const lockedUntil = locked ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null;
      await env.DB.prepare("UPDATE tenants SET pin_attempts = ?, locked_until = ? WHERE id = ?")
        .bind(locked ? 0 : attempts, lockedUntil, tenant.id).run();
      return Response.json(
        {
          error: locked
            ? `PIN incorrect ${MAX_ATTEMPTS} fois. Accès bloqué ${LOCK_MINUTES} minutes.`
            : `PIN incorrect. ${MAX_ATTEMPTS - attempts} essai(s) restant(s).`,
        },
        { status: 401 }
      );
    }

    await env.DB.prepare("UPDATE tenants SET pin_attempts = 0, locked_until = NULL WHERE id = ?").bind(tenant.id).run();

    const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
    const token = await jwtSign({ tenant_id: tenant.id, property_id: property.id, role: "locataire", exp }, env.AUTH_SECRET);

    return Response.json({
      token,
      tenant: { id: tenant.id, full_name: tenant.full_name, email: tenant.email },
      property_id: property.id,
    });
  } catch (e: any) {
    return Response.json({ error: "Erreur serveur : " + e.message }, { status: 500 });
  }
};

export const onRequest = async (context: any) => {
  if (context.request.method === "POST") return onRequestPost(context);
  return Response.json({ error: "Method not allowed" }, { status: 405 });
};
