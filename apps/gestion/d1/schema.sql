-- Gestion (gestion.edukisto.win) — schéma D1 (Cloudflare, SQLite)
-- Outil interne de gestion clients / devis / suivi de factures.
-- Les factures officielles sont émises dans Accountable (Peppol) ; l'app sert de
-- carnet de bord commercial (devis, suivi, relances, exemples/tests).

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  jti TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  ip TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS login_attempts (
  ip TEXT PRIMARY KEY,
  fails INTEGER NOT NULL DEFAULT 0,
  window_start TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS counters (
  type TEXT NOT NULL,
  year INTEGER NOT NULL,
  last INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (type, year)
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  societe TEXT,
  email TEXT,
  tel TEXT,
  adresse TEXT,
  tva TEXT,
  type TEXT NOT NULL DEFAULT 'b2c' CHECK (type IN ('b2b', 'b2c')),
  peppol_id TEXT,
  notes TEXT,
  statut TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('prospect', 'actif', 'inactif')),
  est_test INTEGER NOT NULL DEFAULT 0 CHECK (est_test IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS devis (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  numero TEXT NOT NULL UNIQUE,
  date TEXT NOT NULL,
  date_prestation TEXT,
  validite_jours INTEGER NOT NULL DEFAULT 15,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'envoye', 'accepte', 'refuse', 'expire')),
  lignes TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  taux_tva REAL NOT NULL DEFAULT 0,
  total_ht REAL NOT NULL DEFAULT 0,
  total_ttc REAL NOT NULL DEFAULT 0,
  accepte_le TEXT,
  est_test INTEGER NOT NULL DEFAULT 0 CHECK (est_test IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS factures (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  devis_id TEXT REFERENCES devis(id) ON DELETE SET NULL,
  numero TEXT NOT NULL UNIQUE,
  numero_externe TEXT,
  lien_externe TEXT,
  date TEXT NOT NULL,
  date_prestation TEXT,
  echeance TEXT NOT NULL,
  montant_ht REAL NOT NULL,
  taux_tva REAL NOT NULL DEFAULT 0,
  total_ttc REAL NOT NULL,
  lignes TEXT,
  statut TEXT NOT NULL DEFAULT 'a_envoyer' CHECK (statut IN ('a_envoyer', 'envoyee_peppol', 'envoyee_email', 'payee')),
  payee_le TEXT,
  moyen_paiement TEXT,
  relance_le TEXT,
  note TEXT,
  est_test INTEGER NOT NULL DEFAULT 0 CHECK (est_test IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  texte TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  prix_ht REAL NOT NULL DEFAULT 0,
  taux_tva REAL NOT NULL DEFAULT 0,
  unite TEXT,
  actif INTEGER NOT NULL DEFAULT 1 CHECK (actif IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_devis_client ON devis(client_id);
CREATE INDEX IF NOT EXISTS idx_devis_statut ON devis(statut);
CREATE INDEX IF NOT EXISTS idx_devis_date ON devis(date);
CREATE INDEX IF NOT EXISTS idx_factures_client ON factures(client_id);
CREATE INDEX IF NOT EXISTS idx_factures_statut ON factures(statut);
CREATE INDEX IF NOT EXISTS idx_factures_echeance ON factures(echeance);
CREATE INDEX IF NOT EXISTS idx_factures_date ON factures(date);
CREATE INDEX IF NOT EXISTS idx_factures_devis ON factures(devis_id);
CREATE INDEX IF NOT EXISTS idx_notes_client ON notes(client_id);
CREATE INDEX IF NOT EXISTS idx_services_actif ON services(actif);
