/* Worker laetisoftlove : actifs statiques + API /api/sync (D1) */

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

const HASH_COACH = '1fa8ed21d21fe92bee3e429cb9c08ba67b700b7f91362fec1874975bd0f24c5c';
const HASH_MANAGER = 'da0dbb3aa640e44b6f94e372745d2f7d94df53896ae2725103240a58ebedb105';
const KEYS = ['faq', 'team'];

function authorized(request) {
  const s = request.headers.get('x-app-secret') || '';
  return s === HASH_COACH || s === HASH_MANAGER;
}

async function handleSync(request, env) {
  if (!authorized(request)) return json({ error: 'Non autorisé' }, 401);
  if (!env.DB) return json({ error: 'Base D1 non liée : vérifie le binding DB dans wrangler.toml', detail: 'env.DB manquant' }, 500);
  const url = new URL(request.url);

  if (request.method === 'GET') {
    const key = url.searchParams.get('key');
    if (!KEYS.includes(key)) return json({ error: 'Clé inconnue' }, 400);
    try {
      const row = await env.DB.prepare('SELECT data FROM app_data WHERE key = ?').bind(key).first();
      return json({ data: row ? JSON.parse(row.data) : null });
    } catch (e) {
      return json({ error: 'Base de données non initialisée : exécute schema.sql dans la console D1 (laetisoftlove)', detail: String(e.message || e) }, 500);
    }
  }

  if (request.method === 'POST') {
    const body = await request.json().catch(() => null);
    const key = body?.key;
    if (!KEYS.includes(key)) return json({ error: 'Clé inconnue' }, 400);
    const data = JSON.stringify(body.data === undefined ? null : body.data);
    try {
      await env.DB.prepare(
        "INSERT INTO app_data (key, data, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at"
      ).bind(key, data).run();
      return json({ ok: true });
    } catch (e) {
      return json({ error: 'Base de données non initialisée : exécute schema.sql dans la console D1 (laetisoftlove)', detail: String(e.message || e) }, 500);
    }
  }

  return json({ error: 'Méthode non supportée' }, 405);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/sync') return handleSync(request, env);
    return env.ASSETS.fetch(request);
  },
};
