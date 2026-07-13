CREATE TABLE IF NOT EXISTS logistics_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#64748b',
  icon TEXT DEFAULT '📋'
);

CREATE TABLE IF NOT EXISTS logistics_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#64748b',
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS logistics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type_id INTEGER NOT NULL REFERENCES logistics_types(id),
  title TEXT NOT NULL,
  description TEXT,
  responsible_id INTEGER REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'Pendiente' CHECK(status IN ('Pendiente','En curso','Completo','Cancelado')),
  start_date TEXT,
  end_date TEXT,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_logistics_status ON logistics(status);
CREATE INDEX IF NOT EXISTS idx_logistics_type ON logistics(type_id);
CREATE INDEX IF NOT EXISTS idx_logistics_dates ON logistics(start_date, end_date);

INSERT OR IGNORE INTO logistics_types (name, color, icon) VALUES
  ('Actividad', '#3b82f6', '📋'),
  ('Evento', '#8b5cf6', '🎉'),
  ('Anuncio', '#f59e0b', '📢'),
  ('Viaje', '#06b6d4', '✈️'),
  ('Reunión', '#10b981', '🤝');

INSERT OR IGNORE INTO logistics_status (name, color, sort_order) VALUES
  ('Pendiente', '#f59e0b', 1),
  ('En curso', '#3b82f6', 2),
  ('Completo', '#22c55e', 3),
  ('Cancelado', '#ef4444', 4);
