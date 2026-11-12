-- cal-sync — schéma de la table famille_sync (base D1 cal_sync).
-- La base est déjà initialisée avec les données existantes ; ce script est
-- de référence uniquement (idempotent).

CREATE TABLE IF NOT EXISTS famille_sync (
  id      TEXT PRIMARY KEY,     -- identifiant de ligne dérivé du jeton familial
  jeton   TEXT NOT NULL DEFAULT 'x', -- ident visible (nom de famille) — données chiffrées côté client
  contenu TEXT NOT NULL,        -- bloc chiffré AES-GCM stocké tel quel (JSON {"c": "..."})
  maj     TEXT NOT NULL         -- horodatage ISO de dernière mise à jour
);
