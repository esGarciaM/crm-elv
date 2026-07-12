CREATE TABLE IF NOT EXISTS finance_solicitudes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  committee TEXT NOT NULL,
  responsible TEXT NOT NULL,
  concept TEXT NOT NULL,
  justification TEXT,
  amount_requested REAL NOT NULL DEFAULT 0,
  amount_approved REAL,
  amount_paid REAL,
  priority TEXT NOT NULL DEFAULT 'media' CHECK(priority IN ('baja','media','alta','urgente')),
  quote_file TEXT,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK(status IN ('pendiente','aprobada','rechazada','pagada')),
  reviewed_by INTEGER REFERENCES users(id),
  approved_by INTEGER REFERENCES users(id),
  payment_date TEXT,
  observations TEXT,
  impact_if_not_done TEXT,
  email TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_finance_solicitudes_status ON finance_solicitudes(status);
CREATE INDEX IF NOT EXISTS idx_finance_solicitudes_committee ON finance_solicitudes(committee);
CREATE INDEX IF NOT EXISTS idx_finance_solicitudes_date ON finance_solicitudes(date);

CREATE TABLE IF NOT EXISTS finance_solicitud_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  solicitud_id INTEGER NOT NULL REFERENCES finance_solicitudes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
