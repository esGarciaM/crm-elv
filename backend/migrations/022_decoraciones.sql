CREATE TABLE IF NOT EXISTS decoraciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_nombre TEXT NOT NULL,
  evento_fecha TEXT,
  presupuesto REAL DEFAULT 0,
  lugar TEXT,
  tematica TEXT,
  material_a_comprar TEXT,
  proveedores TEXT,
  alumno_asignado TEXT,
  observaciones TEXT,
  status TEXT NOT NULL DEFAULT 'Pendiente' CHECK(status IN ('Pendiente','En preparacion','Completado','Cancelado')),
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_decoraciones_status ON decoraciones(status);
CREATE INDEX IF NOT EXISTS idx_decoraciones_fecha ON decoraciones(evento_fecha);
