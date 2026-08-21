-- Audit trail para cambios de estado de pago de patrocinios
CREATE TABLE IF NOT EXISTS payment_status_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patrocinio_id INTEGER NOT NULL REFERENCES patrocinios(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

ALTER TABLE patrocinios ADD COLUMN payment_status_updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE patrocinios ADD COLUMN payment_status_updated_at TEXT;

CREATE INDEX IF NOT EXISTS idx_psc_patrocinio ON payment_status_changes(patrocinio_id);
