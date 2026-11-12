import { jwtVerify, uuid, nowIso } from "./_auth";
import { sendEmail, emailLayout } from "./_email";

interface Env {
  DB: D1Database;
  AUTH_SECRET: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  APP_URL?: string;
}

const CATEGORIES = ["plomberie", "electricite", "chauffage", "menuiserie", "toiture", "serrurerie", "electromenager", "autre"];
const URGENCIES = ["basse", "normale", "haute", "urgente"];

export const onRequestPost = async (context: { env: Env; request: Request }) => {
  const { env, request } = context;

  let payload: {
    token?: string;
    title?: string;
    category?: string;
    urgency?: string;
    description?: string;
  };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Requête invalide" }, { status: 400 });
  }

  const { token, title, category, urgency, description } = payload;
  if (!title?.trim() || !description?.trim()) {
    return Response.json({ error: "Titre et description requis" }, { status: 400 });
  }
  const titleTrim = title!.trim();
  const descTrim = description!.trim();
  if (!category || !urgency || !CATEGORIES.includes(category) || !URGENCIES.includes(urgency)) {
    return Response.json({ error: "Catégorie ou urgence invalide" }, { status: 400 });
  }
  if (!env.DB) return Response.json({ error: "Base D1 non liée : vérifie le binding DB" }, { status: 500 });
  if (!env.AUTH_SECRET) return Response.json({ error: "AUTH_SECRET manquant dans les variables Cloudflare" }, { status: 500 });

  const claims = await jwtVerify(token || "", env.AUTH_SECRET);
  if (!claims || !claims.tenant_id || !claims.property_id || claims.role !== "locataire") {
    return Response.json({ error: "Session locataire invalide, reconnectez-vous" }, { status: 401 });
  }

  try {
    const property = await env.DB.prepare(
      "SELECT address, access_code_revoked_at FROM properties WHERE id = ?"
    ).bind(claims.property_id).first<any>();
    if (!property || property.access_code_revoked_at) {
      return Response.json({ error: "Ce code logement a été révoqué" }, { status: 403 });
    }

    const id = uuid();
    const now = nowIso();
    await env.DB.prepare(
      "INSERT INTO requests (id, property_id, tenant_id, title, category, urgency, status, description, owner_read, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'nouveau', ?, 0, ?, ?)"
    ).bind(id, claims.property_id, claims.tenant_id, titleTrim, category, urgency, descTrim, now, now).run();

    const request = {
      id,
      property_id: claims.property_id,
      tenant_id: claims.tenant_id,
      title: titleTrim,
      category,
      urgency,
      status: "nouveau",
      description: descTrim,
      owner_read: false,
      created_at: now,
      updated_at: now,
    };

    let emailSent = false;
    let emailError: string | undefined;
    const owner = await env.DB.prepare(
      `SELECT pr.email, pr.full_name FROM profiles pr JOIN properties p ON p.owner_id = pr.id WHERE p.id = ?`
    ).bind(claims.property_id).first<any>();
    const tenantRow = await env.DB.prepare("SELECT full_name FROM tenants WHERE id = ?").bind(claims.tenant_id).first<any>();
    const tenantName = tenantRow?.full_name || "Votre locataire";
    if (owner?.email) {
      const r = await sendEmail(
        env,
        owner.email,
        `Nouvelle demande : ${request.title}`,
        emailLayout(
          "Nouvelle demande de réparation",
          `<p style="margin:0 0 12px;color:#334155;line-height:1.6;"><b>${tenantName}</b> a signalé un problème au <b>${property.address}</b> :</p>
           <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:0 0 12px;">
             <p style="margin:0 0 4px;"><b>Titre :</b> ${request.title}</p>
             <p style="margin:0 0 4px;"><b>Catégorie :</b> ${request.category}</p>
             <p style="margin:0 0 4px;"><b>Urgence :</b> ${request.urgency}</p>
             <p style="margin:0;"><b>Description :</b> ${request.description}</p>
           </div>`,
          { label: "Voir la demande", url: `${env.APP_URL || "https://barakfix.edukisto.win"}` }
        )
      );
      emailSent = r.ok;
      emailError = r.ok ? undefined : r.error;
    }

    return Response.json({ request, email_sent: emailSent, email_error: emailError });
  } catch (e: any) {
    return Response.json({ error: "Erreur serveur : " + e.message }, { status: 500 });
  }
};

export const onRequest = async (context: any) => {
  if (context.request.method === "POST") return onRequestPost(context);
  return Response.json({ error: "Method not allowed" }, { status: 405 });
};
