CREATE TABLE IF NOT EXISTS audiovisual_patrocinios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patrocinio_id INTEGER NOT NULL REFERENCES patrocinios(id) ON DELETE CASCADE,
  video_url TEXT,
  reels_url TEXT,
  delivery_date TEXT,
  status TEXT DEFAULT 'incompleto' CHECK(status IN ('completo','progreso','incompleto')),
  observations TEXT,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_av_patrocinios_patrocinio ON audiovisual_patrocinios(patrocinio_id);

CREATE TABLE IF NOT EXISTS audiovisual_checklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audiovisual_patrocinio_id INTEGER NOT NULL REFERENCES audiovisual_patrocinios(id) ON DELETE CASCADE,
  item_text TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_av_checklist_patrocinio ON audiovisual_checklist(audiovisual_patrocinio_id);

CREATE TABLE IF NOT EXISTS audiovisual_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  event_date TEXT,
  video_url TEXT,
  reels_url TEXT,
  observations TEXT,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS audiovisual_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audiovisual_patrocinio_id INTEGER REFERENCES audiovisual_patrocinios(id) ON DELETE CASCADE,
  audiovisual_event_id INTEGER REFERENCES audiovisual_events(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  responsible_id INTEGER REFERENCES users(id),
  video_link TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  deleted INTEGER NOT NULL DEFAULT 0,
  deleted_by INTEGER REFERENCES users(id),
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_av_comments_patrocinio ON audiovisual_comments(audiovisual_patrocinio_id);
CREATE INDEX IF NOT EXISTS idx_av_comments_event ON audiovisual_comments(audiovisual_event_id);

CREATE TABLE IF NOT EXISTS audiovisual_comment_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id INTEGER NOT NULL REFERENCES audiovisual_comments(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_av_files_comment ON audiovisual_comment_files(comment_id);
