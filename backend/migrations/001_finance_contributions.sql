CREATE TABLE IF NOT EXISTS finance_contributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  salon TEXT NOT NULL CHECK(salon IN ('A','B','C','D')),
  amount REAL NOT NULL DEFAULT 0,
  description TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_finance_contributions_date ON finance_contributions(date);
CREATE INDEX IF NOT EXISTS idx_finance_contributions_salon ON finance_contributions(salon);
