-- Fix broken FK: communications.audiovisual_id references non-existent table "audiovisual"
-- Recreate communications table without the broken FK constraint

PRAGMA foreign_keys = OFF;

CREATE TABLE communications_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folio TEXT UNIQUE NOT NULL,
  employee_name TEXT NOT NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  document_type_id INTEGER REFERENCES document_types(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'asignado' CHECK(status IN ('asignado','en_redaccion','en_revision','aprobado','entregado')),
  priority TEXT NOT NULL DEFAULT 'media' CHECK(priority IN ('alta','media','baja')),
  notes TEXT,
  image_url TEXT,
  video_url TEXT,
  created_by INTEGER REFERENCES users(id),
  patrocinio_id INTEGER REFERENCES patrocinios(id) ON DELETE SET NULL,
  audiovisual_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

INSERT INTO communications_new (id, folio, employee_name, department_id, document_type_id, status, priority, notes, image_url, video_url, created_by, patrocinio_id, audiovisual_id, created_at, updated_at)
SELECT id, folio, employee_name, department_id, document_type_id, status, priority, notes, image_url, video_url, created_by, patrocinio_id, audiovisual_id, created_at, updated_at
FROM communications;

DROP TABLE communications;

ALTER TABLE communications_new RENAME TO communications;

PRAGMA foreign_keys = ON;
