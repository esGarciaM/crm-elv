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
addColumn('tasks', 'patrocinio_id', 'INTEGER REFERENCES patrocinios(id) ON DELETE SET NULL');

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

db.exec(`
  CREATE TABLE IF NOT EXISTS sponsor_statuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS patrocinios (
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
    sponsor_status_id INTEGER REFERENCES sponsor_statuses(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
`);

// Safe migration for existing patrocinios table
addColumn('patrocinios', 'updated_by', 'INTEGER REFERENCES users(id)');
addColumn('patrocinios', 'sponsor_status_id', 'INTEGER REFERENCES sponsor_statuses(id) ON DELETE SET NULL');

db.exec(`
  CREATE TABLE IF NOT EXISTS patrocinio_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patrocinio_id INTEGER NOT NULL REFERENCES patrocinios(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    category TEXT DEFAULT 'general',
    uploaded_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS document_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS communications (
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
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
`);

// ─── Packages catalog ──
db.exec(`
  CREATE TABLE IF NOT EXISTS packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    amount REAL,
    type TEXT CHECK(type IN ('monetario','especie','mixto')),
    sort_order INTEGER DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
`);

// ─── Package checklist items ──
db.exec(`
  CREATE TABLE IF NOT EXISTS package_checklist_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS package_checklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES package_checklist_items(id) ON DELETE CASCADE,
    UNIQUE(package_id, item_id)
  );
`);

// ─── Patrocinio tracking (checklist + comments) ──
db.exec(`
  CREATE TABLE IF NOT EXISTS patrocinio_checklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patrocinio_id INTEGER NOT NULL REFERENCES patrocinios(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES package_checklist_items(id) ON DELETE CASCADE,
    completed INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    UNIQUE(patrocinio_id, item_id)
  );

  CREATE TABLE IF NOT EXISTS patrocinio_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patrocinio_id INTEGER NOT NULL REFERENCES patrocinios(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
`);

// Migration: add columns for soft-delete and file attachments
const commentCols = db.prepare("PRAGMA table_info(patrocinio_comments)").all().map(c => c.name);
if (!commentCols.includes('deleted')) {
  db.exec("ALTER TABLE patrocinio_comments ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0");
  db.exec("ALTER TABLE patrocinio_comments ADD COLUMN deleted_by INTEGER REFERENCES users(id)");
  db.exec("ALTER TABLE patrocinio_comments ADD COLUMN deleted_at TEXT");
  db.exec("ALTER TABLE patrocinio_comments ADD COLUMN file_url TEXT");
  db.exec("ALTER TABLE patrocinio_comments ADD COLUMN file_name TEXT");
}

// ─── Diseño module ──
db.exec(`
  CREATE TABLE IF NOT EXISTS disenos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    n_orden INTEGER,
    n_paquete TEXT,
    descripcion_proyecto TEXT,
    responsable_patrocinio TEXT,
    fecha_inicio TEXT,
    fecha_vencimiento TEXT,
    prioridad TEXT CHECK(prioridad IN ('MAXIMA','ALTA','MEDIA','BAJA')),
    costo REAL DEFAULT 0,
    liquidado REAL DEFAULT 0,
    comites_involucrados TEXT,
    responsable_diseno TEXT,
    status TEXT DEFAULT 'PENDIENTE' CHECK(status IN ('PENDIENTE','SE TRABAJA','EN REVISION','COMPLETADO','CANCELADO')),
    comentarios_extras TEXT,
    patrocinio_id INTEGER REFERENCES patrocinios(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
`);

// ─── Redes module ──
db.exec(`
  CREATE TABLE IF NOT EXISTS redes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folio TEXT,
    empresa_nombre TEXT,
    responsable TEXT,
    actividad TEXT,
    fecha_inicio TEXT,
    fecha_limite TEXT,
    estado TEXT DEFAULT 'incompleto' CHECK(estado IN ('completo','en progreso','incompleto')),
    post_programados TEXT CHECK(post_programados IN ('SI','No','en diseño')),
    reels TEXT CHECK(reels IN ('grabados','editando','programados','no aplica')),
    observaciones TEXT,
    patrocinio_id INTEGER REFERENCES patrocinios(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
`);

// Migration: add patrocinio_id / audiovisual_id to communications
addColumn('communications', 'patrocinio_id', 'INTEGER REFERENCES patrocinios(id) ON DELETE SET NULL');
addColumn('communications', 'audiovisual_id', 'INTEGER');

// ─── Communication comments (seguimiento) ──
db.exec(`
  CREATE TABLE IF NOT EXISTS communication_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    communication_id INTEGER NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    link TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS communication_comment_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment_id INTEGER NOT NULL REFERENCES communication_comments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
`);

// ─── Finance module migrations ──
import { runMigrations } from './migrations/runner.js';
runMigrations(db);

export default db;
