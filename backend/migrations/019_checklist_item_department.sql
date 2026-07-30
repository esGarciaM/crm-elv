ALTER TABLE package_checklist_items ADD COLUMN department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE package_checklist_items ADD COLUMN visible_to_client INTEGER NOT NULL DEFAULT 1;
