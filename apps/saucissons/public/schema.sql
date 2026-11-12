-- Base de données D1 : saucissons
CREATE TABLE IF NOT EXISTS flavors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  price REAL NOT NULL DEFAULT 3.0,
  active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  remarks TEXT DEFAULT '',
  total REAL NOT NULL DEFAULT 0,
  paid INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  flavor_id INTEGER NOT NULL REFERENCES flavors(id),
  qty INTEGER NOT NULL
);

INSERT OR IGNORE INTO flavors (name, price, active, sort) VALUES
  ('Ail', 3.0, 1, 1),
  ('Beaufort', 3.0, 1, 2),
  ("Bleu d'auvergne", 3.0, 1, 3),
  ('Canard', 3.0, 1, 4),
  ('Cèpes', 3.0, 1, 5),
  ('Cerf', 3.0, 1, 6),
  ('Chèvre', 3.0, 1, 7),
  ('Comté', 3.0, 1, 8),
  ('Poivre', 3.0, 1, 9),
  ('Provençale', 3.0, 1, 10),
  ('Figues', 3.0, 1, 11),
  ('Fumé', 3.0, 1, 12),
  ('Herbe de provence', 3.0, 1, 13),
  ('Lardons', 3.0, 1, 14),
  ('Noisettes', 3.0, 1, 15),
  ('Noix', 3.0, 1, 16),
  ('Oignons', 3.0, 1, 17),
  ('Olives', 3.0, 1, 18),
  ("Piment d'espelette", 3.0, 1, 19),
  ('Pur porc', 3.0, 1, 20),
  ('Sanglier', 3.0, 1, 21),
  ('Taureau', 3.0, 1, 22),
  ('Tomates séchées', 3.0, 1, 23),
  ('Chorizo', 3.0, 1, 24),
  ('Ail des ours', 3.0, 1, 25);
