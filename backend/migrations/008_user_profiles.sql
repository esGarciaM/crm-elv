CREATE TABLE IF NOT EXISTS user_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS profile_modules (
  profile_id INTEGER NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  can_write INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (profile_id, module_key)
);

ALTER TABLE users ADD COLUMN profile_id INTEGER REFERENCES user_profiles(id) ON DELETE SET NULL;
