ALTER TABLE decoraciones ADD COLUMN patrocinio_id INTEGER REFERENCES patrocinios(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_decoraciones_patrocinio_id ON decoraciones(patrocinio_id);
