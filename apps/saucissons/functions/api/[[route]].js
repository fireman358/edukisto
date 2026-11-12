const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

const unauthorized = () => json({ error: 'Non autorisé' }, 401);

const DEFAULT_ADMIN_TOKEN = 'demsau';

async function isAdmin(request, env) {
  const expected = env.ADMIN_TOKEN || DEFAULT_ADMIN_TOKEN;
  if (!expected) return false;
  const token = request.headers.get('x-admin-token') || '';
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

function dbError(e) {
  const m = String((e && e.message) || e);
  if (m.includes('no such table')) return json({ error: 'Base de données non initialisée : exécute schema.sql (wrangler d1 execute saucissons --remote --file=schema.sql)', detail: m }, 500);
  if (m.includes('D1') || m.includes('binding')) return json({ error: 'Base D1 non liée : vérifie le binding DB et le database_id dans wrangler.toml', detail: m }, 500);
  return json({ error: 'Erreur serveur : ' + m }, 500);
}

export async function onRequestGet(context) {
  try {
    return await handleGet(context.request, context.env, context.params);
  } catch (e) { return dbError(e); }
}

export async function onRequestPost(context) {
  try {
    return await handlePost(context.request, context.env, context.params);
  } catch (e) { return dbError(e); }
}

async function handleGet(request, env, params) {
  const [path] = params.route || [];
  if (path === 'flavors') {
    const admin = await isAdmin(request, env);
    const rows = await env.DB
      .prepare(admin ? 'SELECT * FROM flavors ORDER BY sort, name' : 'SELECT id, name, price FROM flavors WHERE active = 1 ORDER BY sort, name')
      .all();
    return json(rows.results);
  }

  if (path === 'orders') {
    if (!(await isAdmin(request, env))) return unauthorized();
    const orders = await env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC, id DESC').all();
    const items = await env.DB.prepare(`
      SELECT oi.order_id, oi.flavor_id, oi.qty, f.name
      FROM order_items oi JOIN flavors f ON f.id = oi.flavor_id
    `).all();
    const byOrder = {};
    for (const it of items.results) {
      (byOrder[it.order_id] ||= []).push({ flavor_id: it.flavor_id, name: it.name, qty: it.qty });
    }
    return json(orders.results.map(o => ({ ...o, items: byOrder[o.id] || [] })));
  }

  if (path === 'export') {
    if (!(await isAdmin(request, env))) return unauthorized();
    const orders = await env.DB.prepare(`
      SELECT o.id, o.last_name, o.first_name, o.total, o.paid, o.created_at, o.remarks,
             GROUP_CONCAT(f.name || ' x' || oi.qty, ' | ') AS details
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN flavors f ON f.id = oi.flavor_id
      GROUP BY o.id ORDER BY o.created_at DESC
    `).all();
    const header = 'id;nom;prenom;total;paye;date;remarques;detail\n';
    const esc = (v) => String(v ?? '').replace(/;/g, ',').replace(/\n/g, ' ');
    const csv = header + orders.results.map(o =>
      [o.id, o.last_name, o.first_name, o.total.toFixed(2), o.paid ? 'oui' : 'non', o.created_at, esc(o.remarks), esc(o.details)].join(';')
    ).join('\n');
    return new Response('\uFEFF' + csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="commandes-saucissons.csv"' } });
  }

  return json({ error: 'Route inconnue' }, 404);
}

async function handlePost(request, env, params) {
  const [path, id] = params.route || [];
  const body = await request.json().catch(() => null);

  if (path === 'orders' && !id) {
    if (body?.action === 'reset') {
      if (!(await isAdmin(request, env))) return unauthorized();
      await env.DB.prepare('DELETE FROM order_items').run();
      await env.DB.prepare('DELETE FROM orders').run();
      return json({ ok: true });
    }
    const { last_name, first_name, remarks = '', items = [] } = body || {};
    if (!last_name?.trim() || !first_name?.trim()) return json({ error: 'Nom et prénom obligatoires' }, 400);
    const clean = items.filter(i => i.qty > 0);
    if (!clean.length) return json({ error: 'Aucun saucisson sélectionné' }, 400);

    const flavors = await env.DB.prepare('SELECT id, price, active FROM flavors').all();
    const map = new Map(flavors.results.map(f => [f.id, f]));
    let total = 0;
    for (const it of clean) {
      const f = map.get(it.flavor_id);
      if (!f || !f.active || !Number.isInteger(it.qty) || it.qty < 1 || it.qty > 99) {
        return json({ error: 'Saucisson invalide ou en rupture' }, 400);
      }
      total += f.price * it.qty;
    }

    const res = await env.DB.prepare(
      'INSERT INTO orders (last_name, first_name, remarks, total) VALUES (?, ?, ?, ?)'
    ).bind(last_name.trim(), first_name.trim(), remarks.trim(), total).run();

    const stmt = env.DB.prepare('INSERT INTO order_items (order_id, flavor_id, qty) VALUES (?, ?, ?)');
    for (const it of clean) {
      await stmt.bind(res.meta.last_row_id, it.flavor_id, it.qty).run();
    }
    return json({ ok: true, id: res.meta.last_row_id, total });
  }

  if (path === 'flavors' && !id) {
    if (!(await isAdmin(request, env))) return unauthorized();
    const { name, price = 3.0 } = body || {};
    if (!name?.trim()) return json({ error: 'Nom obligatoire' }, 400);
    const max = await env.DB.prepare('SELECT COALESCE(MAX(sort), 0) AS m FROM flavors').first();
    try {
      const res = await env.DB.prepare(
        'INSERT INTO flavors (name, price, sort) VALUES (?, ?, ?)'
      ).bind(name.trim(), Number(price), max.m + 1).run();
      return json({ ok: true, id: res.meta.last_row_id });
    } catch (e) {
      return json({ error: 'Cette saveur existe déjà' }, 409);
    }
  }

  if (path === 'orders' && id) {
    if (!(await isAdmin(request, env))) return unauthorized();
    if (body?.action === 'delete') {
      await env.DB.prepare('DELETE FROM order_items WHERE order_id = ?').bind(id).run();
      await env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(id).run();
      return json({ ok: true });
    }
    if (typeof body?.paid === 'boolean') {
      await env.DB.prepare('UPDATE orders SET paid = ? WHERE id = ?').bind(body.paid ? 1 : 0, id).run();
      return json({ ok: true });
    }
    return json({ error: 'Action inconnue' }, 400);
  }

  if (path === 'flavors' && id) {
    if (!(await isAdmin(request, env))) return unauthorized();
    const { name, price, active } = body || {};
    if (name !== undefined) {
      if (!name.trim()) return json({ error: 'Nom obligatoire' }, 400);
      await env.DB.prepare('UPDATE flavors SET name = ? WHERE id = ?').bind(name.trim(), id).run();
    }
    if (price !== undefined) await env.DB.prepare('UPDATE flavors SET price = ? WHERE id = ?').bind(Number(price), id).run();
    if (active !== undefined) await env.DB.prepare('UPDATE flavors SET active = ? WHERE id = ?').bind(active ? 1 : 0, id).run();
    return json({ ok: true });
  }

  return json({ error: 'Route inconnue' }, 404);
}
