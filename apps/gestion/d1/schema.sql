-- Gestion (gestion.edukisto.win) — schéma D1 (Cloudflare, SQLite)
-- Tout l'accès passe par le Worker (clé serveur implicite), pas de RLS.

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS login_attempts (
  ip TEXT PRIMARY KEY,
  fails INTEGER NOT NULL DEFAULT 0,
  window_start TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  societe TEXT,
  email TEXT,
  tel TEXT,
  adresse TEXT,
  tva TEXT,
  type TEXT NOT NULL DEFAULT 'b2b' CHECK (type IN ('b2b', 'b2c')),
  peppol_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS devis (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  numero TEXT NOT NULL UNIQUE,
  date TEXT NOT NULL,
  validite_jours INTEGER NOT NULL DEFAULT 30,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'envoye', 'accepte', 'refuse', 'expire')),
  lignes TEXT NOT NULL DEFAULT '[]',
  taux_tva REAL NOT NULL DEFAULT 21,
  total_ht REAL NOT NULL DEFAULT 0,
  total_ttc REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS factures (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  devis_id TEXT REFERENCES devis(id) ON DELETE SET NULL,
  numero TEXT NOT NULL UNIQUE,
  date TEXT NOT NULL,
  echeance TEXT NOT NULL,
  montant_ht REAL NOT NULL,
  taux_tva REAL NOT NULL DEFAULT 21,
  total_ttc REAL NOT NULL,
  statut TEXT NOT NULL DEFAULT 'a_envoyer' CHECK (statut IN ('a_envoyer', 'envoyee_peppol', 'envoyee_email', 'payee')),
  payee_le TEXT,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  texte TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_devis_client ON devis(client_id);
CREATE INDEX IF NOT EXISTS idx_factures_client ON factures(client_id);
CREATE INDEX IF NOT EXISTS idx_notes_client ON notes(client_id);
