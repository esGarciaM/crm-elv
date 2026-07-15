-- Tabla de historial de pagos de patrocinadores
CREATE TABLE IF NOT EXISTS sponsorship_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patrocinio_id INTEGER NOT NULL REFERENCES patrocinios(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  payment_date TEXT NOT NULL,
  payment_method TEXT,
  reference TEXT,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
