import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `);

  const applied = new Set(
    db.prepare('SELECT name FROM _migrations').all().map(r => r.name)
  );

  const files = fs.readdirSync(__dirname)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = fs.readFileSync(join(__dirname, file), 'utf-8');
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    try {
      const apply = db.transaction(() => {
        for (const stmt of statements) {
          db.exec(stmt);
        }
        db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
      });
      apply();
      console.log(`Migration applied: ${file}`);
    } catch (err) {
      console.error(`Migration failed: ${file} — ${err.message}`);
    }
  }
}
