CREATE TABLE IF NOT EXISTS solicitud_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  solicitud_id INTEGER NOT NULL REFERENCES finance_solicitudes(id) ON DELETE CASCADE,
  comment TEXT,
  link TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_solicitud_comments_solicitud_id ON solicitud_comments(solicitud_id);

CREATE TABLE IF NOT EXISTS solicitud_comment_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id INTEGER NOT NULL REFERENCES solicitud_comments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_solicitud_comment_files_comment_id ON solicitud_comment_files(comment_id);
