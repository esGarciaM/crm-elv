import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dirname, 'crm.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','user','viewer','client')),
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT,
    contact_person TEXT,
    phone TEXT,
    sponsorship_type TEXT,
    package TEXT,
    visit_status TEXT,
    payment_status TEXT,
    student_obtained TEXT,
    student_contacted TEXT,
    in_kind_detail TEXT,
    payment_detail TEXT,
    social_media_fulfilled TEXT,
    tickets_delivered TEXT,
    logo_requested TEXT,
    notes TEXT,
    client_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed','cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent')),
    due_date TEXT,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS task_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    comment TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('public','private')),
    uploaded_by INTEGER REFERENCES users(id),
    category TEXT DEFAULT 'general',
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS document_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    comment TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
`);

// Safe migration helper
function addColumn(table, column, definition) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch (e) {
    // column already exists
  }
}

addColumn('users', 'role', "TEXT NOT NULL DEFAULT 'user'");
addColumn('clients', 'client_user_id', 'INTEGER REFERENCES users(id) ON DELETE SET NULL');
addColumn('documents', 'visibility', "TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('public','private'))");

db.exec(`
  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    responsible_name TEXT NOT NULL,
    concept TEXT NOT NULL,
    description TEXT,
    justification TEXT,
    amount REAL NOT NULL,
    required_date TEXT,
    quote_date TEXT,
    impact_if_not_done TEXT,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','paid')),
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS expense_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
`);

// Seed departments
const deptExists = db.prepare('SELECT id FROM departments LIMIT 1').get();
if (!deptExists) {
  const departments = [
    'Diseño', 'Redes', 'Decoración', 'Logística',
    'Patrocinio', 'Producción Audiovisual', 'Comunicados'
  ];
  const insert = db.prepare('INSERT INTO departments (name) VALUES (?)');
  for (const d of departments) insert.run(d);
  console.log('Default departments created');
}

export default db;
