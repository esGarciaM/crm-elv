CREATE TABLE IF NOT EXISTS finance_monthly_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  initial_balance REAL NOT NULL DEFAULT 0,
  contributions_total REAL NOT NULL DEFAULT 0,
  sponsorships_cash REAL NOT NULL DEFAULT 0,
  sponsorships_kind REAL NOT NULL DEFAULT 0,
  expenses_total REAL NOT NULL DEFAULT 0,
  final_balance REAL NOT NULL DEFAULT 0,
  written_report TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  UNIQUE(month, year)
);

CREATE INDEX IF NOT EXISTS idx_finance_monthly_reports_period ON finance_monthly_reports(year, month);
