CREATE TABLE IF NOT EXISTS patrocinio_doc_urls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patrocinio_id INTEGER NOT NULL REFERENCES patrocinios(id) ON DELETE CASCADE,
  document_type_id INTEGER NOT NULL REFERENCES document_types(id) ON DELETE CASCADE,
  url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  UNIQUE(patrocinio_id, document_type_id)
);

CREATE INDEX IF NOT EXISTS idx_patrocinio_doc_urls_patrocinio ON patrocinio_doc_urls(patrocinio_id);
