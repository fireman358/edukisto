import { jwtVerify, uuid, nowIso, hashPassword, verifyPassword } from "./_auth";

interface Env {
  DB: D1Database;
  AUTH_SECRET: string;
}

async function ownerFromToken(env: Env, token: string | undefined): Promise<string | null> {
  if (!token || !env.AUTH_SECRET) return null;
  const claims = await jwtVerify(token, env.AUTH_SECRET);
  if (!claims || claims.role !== "bailleur" || !claims.owner_id) return null;
  const profile = await env.DB.prepare("SELECT id FROM profiles WHERE id = ?").bind(claims.owner_id).first();
  if (!profile) return null;
  return claims.owner_id as string;
}

async function ownProperty(env: Env, ownerId: string, propertyId: string): Promise<any | null> {
  return env.DB.prepare("SELECT * FROM properties WHERE id = ? AND owner_id = ?").bind(propertyId, ownerId).first<any>();
}

export const onRequestPost = async (context: { env: Env; request: Request }) => {
  const { env, request } = context;

  let payload: { token?: string; action?: string } & Record<string, any>;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Requête invalide" }, { status: 400 });
  }

  if (!env.DB) return Response.json({ error: "Base D1 non liée : vérifie le binding DB" }, { status: 500 });

  const ownerId = await ownerFromToken(env, payload.token);
  if (!ownerId) {
    return Response.json({ error: "Session bailleur invalide, reconnectez-vous" }, { status: 401 });
  }

  const { action } = payload;

  try {
    /* --- Tableau de bord : tout ce dont l'écran a besoin --- */
    if (action === "dashboard") {
      const requests = await env.DB.prepare(
        `SELECT r.*, p.address AS property_address FROM requests r
         JOIN properties p ON p.id = r.property_id
         WHERE p.owner_id = ? ORDER BY r.created_at DESC`
      ).bind(ownerId).all();
      const properties = await env.DB.prepare(
        "SELECT * FROM properties WHERE owner_id = ? ORDER BY created_at"
      ).bind(ownerId).all();
      const interventions = await env.DB.prepare(
        `SELECT i.*, r.property_id AS property_id FROM interventions i
         JOIN requests r ON r.id = i.request_id
         JOIN properties p ON p.id = r.property_id
         WHERE p.owner_id = ? ORDER BY i.created_at`
      ).bind(ownerId).all();
      return Response.json({
        requests: (requests.results || []).map((r: any) => ({ ...r, owner_read: !!r.owner_read, properties: { address: r.property_address } })),
        properties: properties.results || [],
        interventions: (interventions.results || []).map((i: any) => ({ ...i, requests: { property_id: i.property_id } })),
      });
    }

    /* --- Logements --- */
    if (action === "list_properties") {
      const rows = await env.DB.prepare(
        "SELECT * FROM properties WHERE owner_id = ? ORDER BY created_at"
      ).bind(ownerId).all();
      return Response.json({ properties: rows.results || [] });
    }

    if (action === "create_property") {
      const { address, type = "appartement", notes = null, access_code } = payload;
      if (!address?.trim() || !access_code) {
        return Response.json({ error: "Adresse et code logement requis" }, { status: 400 });
      }
      const dup = await env.DB.prepare("SELECT id FROM properties WHERE access_code = ?").bind(access_code).first();
      if (dup) {
        return Response.json({ error: "Ce code logement existe déjà — vérifiez l'adresse." }, { status: 409 });
      }
      await env.DB.prepare(
        "INSERT INTO properties (id, owner_id, address, type, notes, access_code) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(uuid(), ownerId, address.trim(), type, notes || null, access_code).run();
      return Response.json({ ok: true });
    }

    if (action === "update_property") {
      const { id, access_code, access_code_revoked_at } = payload;
      if (!(await ownProperty(env, ownerId, id))) {
        return Response.json({ error: "Logement introuvable" }, { status: 404 });
      }
      await env.DB.prepare(
        "UPDATE properties SET access_code = ?, access_code_revoked_at = ? WHERE id = ?"
      ).bind(access_code, access_code_revoked_at || null, id).run();
      return Response.json({ ok: true });
    }

    if (action === "delete_property") {
      const { id } = payload;
      if (!(await ownProperty(env, ownerId, id))) {
        return Response.json({ error: "Logement introuvable" }, { status: 404 });
      }
      await env.DB.prepare(
        `DELETE FROM request_photos WHERE request_id IN (SELECT id FROM requests WHERE property_id = ?)`
      ).bind(id).run();
      await env.DB.prepare(
        `DELETE FROM interventions WHERE request_id IN (SELECT id FROM requests WHERE property_id = ?)`
      ).bind(id).run();
      await env.DB.prepare("DELETE FROM requests WHERE property_id = ?").bind(id).run();
      await env.DB.prepare("DELETE FROM tenants WHERE property_id = ?").bind(id).run();
      await env.DB.prepare("DELETE FROM properties WHERE id = ?").bind(id).run();
      return Response.json({ ok: true });
    }

    /* --- Locataires --- */
    if (action === "list_tenants") {
      const properties = await env.DB.prepare(
        "SELECT * FROM properties WHERE owner_id = ? ORDER BY created_at"
      ).bind(ownerId).all();
      const tenants = await env.DB.prepare(
        `SELECT t.id, t.property_id, t.full_name, t.phone, t.email, t.created_at
         FROM tenants t JOIN properties p ON p.id = t.property_id
         WHERE p.owner_id = ? ORDER BY t.created_at`
      ).bind(ownerId).all();
      return Response.json({ properties: properties.results || [], tenants: tenants.results || [] });
    }

    if (action === "delete_tenant") {
      const { id } = payload;
      const t = await env.DB.prepare(
        `SELECT t.id FROM tenants t JOIN properties p ON p.id = t.property_id
         WHERE t.id = ? AND p.owner_id = ?`
      ).bind(id, ownerId).first();
      if (!t) return Response.json({ error: "Locataire introuvable" }, { status: 404 });
      await env.DB.prepare("UPDATE requests SET tenant_id = NULL WHERE tenant_id = ?").bind(id).run();
      await env.DB.prepare("DELETE FROM tenants WHERE id = ?").bind(id).run();
      return Response.json({ ok: true });
    }

    /* --- Demandes --- */
    if (action === "list_requests") {
      const { status, property_id, category, urgency } = payload;
      let sql = `SELECT r.*, p.address AS property_address, t.full_name AS tenant_name
                 FROM requests r
                 JOIN properties p ON p.id = r.property_id
                 LEFT JOIN tenants t ON t.id = r.tenant_id
                 WHERE p.owner_id = ?`;
      const binds: any[] = [ownerId];
      if (status) { sql += " AND r.status = ?"; binds.push(status); }
      if (property_id) { sql += " AND r.property_id = ?"; binds.push(property_id); }
      if (category) { sql += " AND r.category = ?"; binds.push(category); }
      if (urgency) { sql += " AND r.urgency = ?"; binds.push(urgency); }
      sql += " ORDER BY r.created_at DESC";
      const rows = await env.DB.prepare(sql).bind(...binds).all();
      const properties = await env.DB.prepare(
        "SELECT * FROM properties WHERE owner_id = ? ORDER BY created_at"
      ).bind(ownerId).all();
      return Response.json({
        requests: (rows.results || []).map((r: any) => ({
          ...r,
          owner_read: !!r.owner_read,
          properties: { address: r.property_address },
          tenants: r.tenant_name ? { full_name: r.tenant_name } : null,
        })),
        properties: properties.results || [],
      });
    }

    if (action === "get_request") {
      const { id } = payload;
      const r = await env.DB.prepare(
        `SELECT r.*, p.address AS property_address, t.full_name AS tenant_name
         FROM requests r JOIN properties p ON p.id = r.property_id
         LEFT JOIN tenants t ON t.id = r.tenant_id
         WHERE r.id = ? AND p.owner_id = ?`
      ).bind(id, ownerId).first<any>();
      if (!r) return Response.json({ error: "Demande introuvable" }, { status: 404 });
      const intervention = await env.DB.prepare(
        "SELECT * FROM interventions WHERE request_id = ? ORDER BY created_at DESC LIMIT 1"
      ).bind(id).first<any>();
      const photos = await env.DB.prepare(
        "SELECT * FROM request_photos WHERE request_id = ?"
      ).bind(id).all();
      return Response.json({
        request: {
          ...r,
          owner_read: !!r.owner_read,
          properties: { address: r.property_address },
          tenants: r.tenant_name ? { full_name: r.tenant_name } : null,
        },
        intervention: intervention || null,
        photos: photos.results || [],
      });
    }

    if (action === "update_request") {
      const { id, owner_read, status, updated_at } = payload;
      const r = await env.DB.prepare(
        `SELECT r.id FROM requests r JOIN properties p ON p.id = r.property_id
         WHERE r.id = ? AND p.owner_id = ?`
      ).bind(id, ownerId).first();
      if (!r) return Response.json({ error: "Demande introuvable" }, { status: 404 });
      const sets: string[] = [];
      const binds: any[] = [];
      if (owner_read !== undefined) { sets.push("owner_read = ?"); binds.push(owner_read ? 1 : 0); }
      if (status !== undefined) { sets.push("status = ?"); binds.push(status); }
      sets.push("updated_at = ?"); binds.push(updated_at || nowIso());
      binds.push(id);
      await env.DB.prepare(`UPDATE requests SET ${sets.join(", ")} WHERE id = ?`).bind(...binds).run();
      return Response.json({ ok: true });
    }

    if (action === "save_intervention") {
      const { request_id, artisan_name, artisan_phone, cost, scheduled_date, performed_date } = payload;
      const r = await env.DB.prepare(
        `SELECT r.id FROM requests r JOIN properties p ON p.id = r.property_id
         WHERE r.id = ? AND p.owner_id = ?`
      ).bind(request_id, ownerId).first();
      if (!r) return Response.json({ error: "Demande introuvable" }, { status: 404 });
      const values = {
        artisan_name: artisan_name || null,
        artisan_phone: artisan_phone || null,
        cost: cost !== undefined && cost !== null && cost !== "" ? Number(cost) : null,
        scheduled_date: scheduled_date || null,
        performed_date: performed_date || null,
      };
      const existing = await env.DB.prepare("SELECT id FROM interventions WHERE request_id = ?").bind(request_id).first<any>();
      if (existing) {
        await env.DB.prepare(
          "UPDATE interventions SET artisan_name = ?, artisan_phone = ?, cost = ?, scheduled_date = ?, performed_date = ? WHERE id = ?"
        ).bind(values.artisan_name, values.artisan_phone, values.cost, values.scheduled_date, values.performed_date, existing.id).run();
      } else if (artisan_name || cost || scheduled_date || performed_date) {
        await env.DB.prepare(
          "INSERT INTO interventions (id, request_id, artisan_name, artisan_phone, cost, scheduled_date, performed_date) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).bind(uuid(), request_id, values.artisan_name, values.artisan_phone, values.cost, values.scheduled_date, values.performed_date).run();
      }
      return Response.json({ ok: true });
    }

    /* --- Profil --- */
    if (action === "change_password") {
      const { current_password, new_password } = payload;
      if (!current_password || !new_password) {
        return Response.json({ error: "Ancien et nouveau mot de passe requis" }, { status: 400 });
      }
      if (String(new_password).length < 6) {
        return Response.json({ error: "Le nouveau mot de passe doit contenir au moins 6 caractères" }, { status: 400 });
      }
      const profile = await env.DB.prepare(
        "SELECT id, password_hash FROM profiles WHERE id = ?"
      ).bind(ownerId).first<any>();
      if (!profile) return Response.json({ error: "Compte introuvable" }, { status: 404 });
      const ok = await verifyPassword(String(current_password), profile.password_hash);
      if (!ok) {
        return Response.json({ error: "Ancien mot de passe incorrect" }, { status: 401 });
      }
      const password_hash = await hashPassword(String(new_password));
      await env.DB.prepare("UPDATE profiles SET password_hash = ? WHERE id = ?")
        .bind(password_hash, ownerId).run();
      return Response.json({ ok: true });
    }

    if (action === "me") {
      const p = await env.DB.prepare("SELECT id, email, full_name, phone FROM profiles WHERE id = ?").bind(ownerId).first<any>();
      if (!p) return Response.json({ error: "Compte introuvable" }, { status: 404 });
      return Response.json({ profile: p });
    }

    return Response.json({ error: "Action inconnue" }, { status: 400 });
  } catch (e: any) {
    return Response.json({ error: "Erreur serveur : " + e.message }, { status: 500 });
  }
};

export const onRequest = async (context: any) => {
  if (context.request.method === "POST") return onRequestPost(context);
  return Response.json({ error: "Method not allowed" }, { status: 405 });
};
