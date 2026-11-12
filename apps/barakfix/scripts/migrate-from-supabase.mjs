#!/usr/bin/env node
/* Migration des données Supabase → D1 (barakfix)
 *
 * Utilisation (ne partage jamais ta clé service_role) :
 *   SUPABASE_URL=https://ghnwmqsvvvezvfmjneep.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=sb_secret_... \
 *   node scripts/migrate-from-supabase.mjs [--password MonNouveauMotDePasse] > migration.sql
 *
 * Puis initialiser la base D1 avec le schéma + les données :
 *   npx wrangler d1 execute barakfix --remote --file=d1/schema.sql
 *   npx wrangler d1 execute barakfix --remote --file=migration.sql
 *
 * Sans --password, les comptes bailleurs reçoivent un mot de passe
 * "MIGRATED_NEED_RESET" : la connexion refusera jusqu'à réinitialisation.
 * (Les PIN locataires sont conservés tels quels — même algorithme.)
 */

const URL_BASE = process.env.SUPABASE_URL?.replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const args = process.argv.slice(2);
const newPassIdx = args.indexOf("--password");
const newPassword = newPassIdx !== -1 ? args[newPassIdx + 1] : null;

if (!URL_BASE || !KEY) {
  console.error("Renseigne SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY en variables d'environnement.");
  process.exit(1);
}

const sql = (s) => String(s ?? "").replace(/'/g, "''");

async function sbGet(path) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status} sur ${path.split("?")[0]}`);
  return res.json();
}

async function hashPassword(password) {
  const iterations = 100000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `pbkdf2$${iterations}$${hex(salt.buffer)}$${hex(bits)}`;
}

const [profiles, properties, tenants, requests, interventions, photos] = await Promise.all([
  sbGet("profiles?select=*"),
  sbGet("properties?select=*"),
  sbGet("tenants?select=*"),
  sbGet("requests?select=*"),
  sbGet("interventions?select=*"),
  sbGet("request_photos?select=*"),
]);

console.error(
  `Trouvé : ${profiles.length} profils, ${properties.length} logements, ${tenants.length} locataires, ${requests.length} demandes, ${interventions.length} interventions, ${photos.length} photos`
);

const out = [];
out.push("-- Migration des données Supabase → D1 (générée le " + new Date().toISOString() + ")");

const ownerHash = newPassword
  ? await hashPassword(newPassword)
  : "MIGRATED_NEED_RESET$ utilisez --password pour définir un mot de passe";

for (const p of profiles) {
  out.push(
    `INSERT OR REPLACE INTO profiles (id, email, password_hash, role, full_name, phone, created_at) VALUES ('${sql(p.id)}', '${sql((p.email || "").toLowerCase())}', '${sql(ownerHash)}', '${sql(p.role)}', '${sql(p.full_name)}', ${p.phone ? `'${sql(p.phone)}'` : "NULL"}, '${sql(p.created_at)}');`
  );
}
for (const p of properties) {
  out.push(
    `INSERT OR REPLACE INTO properties (id, owner_id, address, type, notes, access_code, access_code_revoked_at, created_at) VALUES ('${sql(p.id)}', '${sql(p.owner_id)}', '${sql(p.address)}', '${sql(p.type)}', ${p.notes ? `'${sql(p.notes)}'` : "NULL"}, '${sql(p.access_code)}', ${p.access_code_revoked_at ? `'${sql(p.access_code_revoked_at)}'` : "NULL"}, '${sql(p.created_at)}');`
  );
}
for (const t of tenants) {
  out.push(
    `INSERT OR REPLACE INTO tenants (id, property_id, full_name, phone, email, pin_hash, pin_attempts, locked_until, created_at) VALUES ('${sql(t.id)}', '${sql(t.property_id)}', '${sql(t.full_name)}', ${t.phone ? `'${sql(t.phone)}'` : "NULL"}, '${sql((t.email || "").toLowerCase())}', '${sql(t.pin_hash)}', ${t.pin_attempts || 0}, ${t.locked_until ? `'${sql(t.locked_until)}'` : "NULL"}, '${sql(t.created_at)}');`
  );
}
for (const r of requests) {
  out.push(
    `INSERT OR REPLACE INTO requests (id, property_id, tenant_id, title, category, urgency, status, description, owner_read, created_at, updated_at) VALUES ('${sql(r.id)}', '${sql(r.property_id)}', ${r.tenant_id ? `'${sql(r.tenant_id)}'` : "NULL"}, '${sql(r.title)}', '${sql(r.category)}', '${sql(r.urgency)}', '${sql(r.status)}', '${sql(r.description)}', ${r.owner_read ? 1 : 0}, '${sql(r.created_at)}', '${sql(r.updated_at)}');`
  );
}
for (const i of interventions) {
  out.push(
    `INSERT OR REPLACE INTO interventions (id, request_id, artisan_name, artisan_phone, cost, scheduled_date, performed_date, created_at) VALUES ('${sql(i.id)}', '${sql(i.request_id)}', ${i.artisan_name ? `'${sql(i.artisan_name)}'` : "NULL"}, ${i.artisan_phone ? `'${sql(i.artisan_phone)}'` : "NULL"}, ${i.cost ?? "NULL"}, ${i.scheduled_date ? `'${sql(i.scheduled_date)}'` : "NULL"}, ${i.performed_date ? `'${sql(i.performed_date)}'` : "NULL"}, '${sql(i.created_at)}');`
  );
}
for (const ph of photos) {
  out.push(
    `INSERT OR REPLACE INTO request_photos (id, request_id, storage_path, created_at) VALUES ('${sql(ph.id)}', '${sql(ph.request_id)}', '${sql(ph.storage_path)}', '${sql(ph.created_at)}');`
  );
}

out.push("");
console.log(out.join("\n"));
console.error("→ SQL généré sur stdout. Redirige-le vers un fichier : > migration.sql");
if (!newPassword) {
  console.error("⚠️  Sans --password, les comptes bailleurs devront être réinitialisés (hash MIGRATED_NEED_RESET).");
}
