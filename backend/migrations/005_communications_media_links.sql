-- Agregar columnas image_url y video_url a communications
-- y eliminar la tabla communication_files

ALTER TABLE communications ADD COLUMN image_url TEXT;
ALTER TABLE communications ADD COLUMN video_url TEXT;

DROP TABLE IF EXISTS communication_files;
