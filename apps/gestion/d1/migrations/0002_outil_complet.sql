-- Migration 0002 — outil complet (test mode, édition, catalogue, sessions, relances)
-- À appliquer AVANT le déploiement du Worker qui utilise ces colonnes.
-- Les ALTER ne sont pas idempotents : le script de migration vérifie les colonnes
-- existantes avant de les ajouter (voir scripts/migrate.mjs).

ALTER TABLE clients ADD COLUMN statut TEXT NOT NULL DEFAULT 'actif';
ALTER TABLE clients ADD COLUMN est_test INTEGER NOT NULL DEFAULT 0;

ALTER TABLE devis ADD COLUMN date_prestation TEXT;
ALTER TABLE devis ADD COLUMN notes TEXT NOT NULL DEFAULT '';
ALTER TABLE devis ADD COLUMN accepte_le TEXT;
ALTER TABLE devis ADD COLUMN est_test INTEGER NOT NULL DEFAULT 0;

ALTER TABLE factures ADD COLUMN numero_externe TEXT;
ALTER TABLE factures ADD COLUMN lien_externe TEXT;
ALTER TABLE factures ADD COLUMN date_prestation TEXT;
ALTER TABLE factures ADD COLUMN lignes TEXT;
ALTER TABLE factures ADD COLUMN moyen_paiement TEXT;
ALTER TABLE factures ADD COLUMN relance_le TEXT;
ALTER TABLE factures ADD COLUMN est_test INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS sessions (
  jti TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  ip TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS counters (
  type TEXT NOT NULL,
  year INTEGER NOT NULL,
  last INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (type, year)
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  prix_ht REAL NOT NULL DEFAULT 0,
  taux_tva REAL NOT NULL DEFAULT 0,
  unite TEXT,
  actif INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

-- Reprend les numéros existants pour ne jamais collisionner après migration.
INSERT OR REPLACE INTO counters (type, year, last)
SELECT 'F', CAST(substr(numero, 3, 4) AS INTEGER), MAX(CAST(substr(numero, 8) AS INTEGER))
FROM factures
WHERE numero GLOB 'F-[0-9][0-9][0-9][0-9]-[0-9]*'
GROUP BY 2;

INSERT OR REPLACE INTO counters (type, year, last)
SELECT 'D', CAST(substr(numero, 3, 4) AS INTEGER), MAX(CAST(substr(numero, 8) AS INTEGER))
FROM devis
WHERE numero GLOB 'D-[0-9][0-9][0-9][0-9]-[0-9]*'
GROUP BY 2;

CREATE INDEX IF NOT EXISTS idx_devis_statut ON devis(statut);
CREATE INDEX IF NOT EXISTS idx_devis_date ON devis(date);
CREATE INDEX IF NOT EXISTS idx_factures_statut ON factures(statut);
CREATE INDEX IF NOT EXISTS idx_factures_echeance ON factures(echeance);
CREATE INDEX IF NOT EXISTS idx_factures_date ON factures(date);
CREATE INDEX IF NOT EXISTS idx_factures_devis ON factures(devis_id);
CREATE INDEX IF NOT EXISTS idx_services_actif ON services(actif);
