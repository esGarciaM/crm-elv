CREATE TABLE IF NOT EXISTS finance_expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  committee TEXT,
  concept TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  responsible TEXT NOT NULL,
  receipts_count INTEGER DEFAULT 0,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_finance_expenses_date ON finance_expenses(date);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_committee ON finance_expenses(committee);

CREATE TABLE IF NOT EXISTS finance_expense_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_id INTEGER NOT NULL REFERENCES finance_expenses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS finance_committee_budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  committee TEXT UNIQUE NOT NULL,
  budget REAL NOT NULL DEFAULT 0,
  spent REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'RIESGO' CHECK(status IN ('RIESGO','Alerta','OK')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

INSERT OR IGNORE INTO finance_committee_budgets (committee, budget, spent, status) VALUES
  ('Finanzas', 0, 0, 'RIESGO'),
  ('Comunicados', 0, 0, 'RIESGO'),
  ('Diseño', 0, 0, 'RIESGO'),
  ('Decoración', 0, 0, 'RIESGO'),
  ('Redes', 0, 0, 'RIESGO'),
  ('Patrocinio', 0, 0, 'RIESGO'),
  ('Logística', 0, 0, 'RIESGO'),
  ('Producción Audiovisual', 0, 0, 'RIESGO'),
  ('Conferencistas', 0, 0, 'RIESGO'),
  ('Otro', 0, 0, 'RIESGO');
