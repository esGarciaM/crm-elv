-- Add monetary and in-kind amount fields to patrocinios for mixed sponsorship type
ALTER TABLE patrocinios ADD COLUMN monetary_amount REAL;
ALTER TABLE patrocinios ADD COLUMN in_kind_amount REAL;
