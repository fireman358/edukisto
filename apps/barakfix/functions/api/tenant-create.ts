import { jwtVerify, hashPin, uuid } from "./_auth";
import { sendEmail, emailLayout } from "./_email";

interface Env {
  DB: D1Database;
  AUTH_SECRET: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  APP_URL?: string;
}

export const onRequestPost = async (context: { env: Env; request: Request }) => {
  const { env, request } = context;

  let payload: {
    owner_token?: string;
    property_id?: string;
    full_name?: string;
    phone?: string;
    email?: string;
    pin?: string;
  };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Requête invalide" }, { status: 400 });
  }

  const { owner_token, property_id, full_name, phone, email, pin } = payload;
  if (!owner_token || !property_id || !full_name || !email || !pin || !/^\d{4}$/.test(pin)) {
    return Response.json({ error: "Champs requis manquants (nom, email, PIN 4 chiffres)" }, { status: 400 });
  }
  if (!env.DB) return Response.json({ error: "Base D1 non liée : vérifie le binding DB" }, { status: 500 });
  if (!env.AUTH_SECRET) return Response.json({ error: "AUTH_SECRET manquant dans les variables Cloudflare" }, { status: 500 });

  const claims = await jwtVerify(owner_token, env.AUTH_SECRET);
  if (!claims || claims.role !== "bailleur" || !claims.owner_id) {
    return Response.json({ error: "Session bailleur invalide, déconnectez-vous puis reconnectez-vous." }, { status: 401 });
  }
  const ownerId = claims.owner_id as string;

  try {
    const property = await env.DB.prepare(
      "SELECT p.id, p.address, p.access_code, p.owner_id, pr.full_name AS owner_name FROM properties p JOIN profiles pr ON pr.id = p.owner_id WHERE p.id = ?"
    ).bind(property_id).first<any>();
    if (!property) {
      return Response.json({ error: "Logement introuvable" }, { status: 404 });
    }
    if (property.owner_id !== ownerId) {
      return Response.json({ error: "Ce logement ne vous appartient pas" }, { status: 403 });
    }

    const existing = await env.DB.prepare(
      "SELECT id FROM tenants WHERE property_id = ? AND lower(email) = ?"
    ).bind(property_id, email.trim().toLowerCase()).first();
    if (existing) {
      return Response.json({ error: "Un locataire avec cet email existe déjà sur ce logement" }, { status: 409 });
    }

    const id = uuid();
    const pin_hash = await hashPin(pin);
    await env.DB.prepare(
      "INSERT INTO tenants (id, property_id, full_name, phone, email, pin_hash) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(id, property_id, full_name.trim(), phone || null, email.trim(), pin_hash).run();

    const appUrl = env.APP_URL || "https://barakfix.edukisto.win";
    const ownerName = property.owner_name || "votre bailleur";
    const emailResult = await sendEmail(
      env,
      email.trim(),
      "Vos accès Barakfix",
      emailLayout(
        `Bienvenue ${full_name.trim()} !`,
        `<p style="margin:0 0 12px;color:#334155;line-height:1.6;">${ownerName} vous a ajouté(e) comme locataire sur Barakfix, l'application de suivi des demandes de réparation.</p>
         <p style="margin:0 0 12px;color:#334155;line-height:1.6;">Votre logement : <b>${property.address}</b></p>
         <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:0 0 12px;">
           <p style="margin:0 0 8px;color:#334155;">Vos identifiants de connexion :</p>
           <p style="margin:0 0 4px;"><b>Code logement :</b> <span style="font-family:monospace;font-size:16px;">${property.access_code}</span></p>
           <p style="margin:0 0 4px;"><b>Email :</b> ${email.trim()}</p>
           <p style="margin:0;"><b>PIN (4 chiffres) :</b> ${pin}</p>
         </div>
         <p style="margin:0;color:#64748b;line-height:1.6;">Conservez cet email : le code logement et le PIN vous seront demandés à chaque connexion. Pour des raisons de sécurité, pensez à mémoriser votre PIN et à supprimer cet email ensuite.</p>`,
        { label: "Accéder à Barakfix", url: appUrl }
      )
    );

    return Response.json({
      tenant: {
        id,
        full_name: full_name.trim(),
        email: email.trim(),
        phone: phone || null,
        created_at: new Date().toISOString(),
      },
      email_sent: emailResult.ok,
      email_error: emailResult.ok ? undefined : emailResult.error,
    });
  } catch (e: any) {
    return Response.json({ error: "Erreur serveur : " + e.message }, { status: 500 });
  }
};

export const onRequest = async (context: any) => {
  if (context.request.method === "POST") return onRequestPost(context);
  return Response.json({ error: "Method not allowed" }, { status: 405 });
};
