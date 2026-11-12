import { jwtSign, hashPassword, verifyPassword, uuid, nowIso } from "./_auth";

interface Env {
  DB: D1Database;
  AUTH_SECRET: string;
}

export const onRequestPost = async (context: { env: Env; request: Request }) => {
  const { env, request } = context;

  let payload: { mode?: string; email?: string; password?: string; full_name?: string };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Requête invalide" }, { status: 400 });
  }

  const { mode = "login", email, password, full_name } = payload;
  if (!email?.trim() || !password) {
    return Response.json({ error: "Email et mot de passe requis" }, { status: 400 });
  }
  if (mode === "signup" && password.length < 6) {
    return Response.json({ error: "Le mot de passe doit contenir au moins 6 caractères" }, { status: 400 });
  }
  if (!env.DB) return Response.json({ error: "Base D1 non liée : vérifie le binding DB" }, { status: 500 });
  if (!env.AUTH_SECRET) return Response.json({ error: "AUTH_SECRET manquant dans les variables Cloudflare" }, { status: 500 });

  const emailNorm = email.trim().toLowerCase();

  try {
    if (mode === "signup") {
      const existing = await env.DB.prepare("SELECT id FROM profiles WHERE email = ?").bind(emailNorm).first();
      if (existing) {
        return Response.json({ error: "Un compte existe déjà avec cet email. Connectez-vous." }, { status: 409 });
      }
      const id = uuid();
      const password_hash = await hashPassword(password);
      await env.DB.prepare(
        "INSERT INTO profiles (id, email, password_hash, role, full_name) VALUES (?, ?, ?, 'bailleur', ?)"
      ).bind(id, emailNorm, password_hash, (full_name || emailNorm.split("@")[0]).trim()).run();
      const token = await jwtSign({ owner_id: id, role: "bailleur", exp: Math.floor(Date.now() / 1000) + 30 * 24 * 3600 }, env.AUTH_SECRET);
      return Response.json({ token, profile: { id, email: emailNorm, full_name: (full_name || emailNorm.split("@")[0]).trim() } });
    }

    const profile = await env.DB.prepare(
      "SELECT id, email, password_hash, full_name, phone FROM profiles WHERE email = ?"
    ).bind(emailNorm).first<any>();
    if (!profile) {
      return Response.json({ error: "Email ou mot de passe incorrect." }, { status: 401 });
    }
    if (profile.password_hash.startsWith("MIGRATED")) {
      return Response.json({ error: "Ce compte a été migré : réinitialisez votre mot de passe via le script de migration (--password)." }, { status: 401 });
    }
    const ok = await verifyPassword(password, profile.password_hash);
    if (!ok) {
      return Response.json({ error: "Email ou mot de passe incorrect." }, { status: 401 });
    }
    const token = await jwtSign({ owner_id: profile.id, role: "bailleur", exp: Math.floor(Date.now() / 1000) + 30 * 24 * 3600 }, env.AUTH_SECRET);
    return Response.json({
      token,
      profile: { id: profile.id, email: profile.email, full_name: profile.full_name, phone: profile.phone },
    });
  } catch (e: any) {
    return Response.json({ error: "Erreur serveur : " + e.message }, { status: 500 });
  }
};

export const onRequest = async (context: any) => {
  if (context.request.method === "POST") return onRequestPost(context);
  return Response.json({ error: "Method not allowed" }, { status: 405 });
};
