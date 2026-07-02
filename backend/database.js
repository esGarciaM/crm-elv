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
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
`);

// Safe migration for existing patrocinios table
addColumn('patrocinios', 'updated_by', 'INTEGER REFERENCES users(id)');

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
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS communication_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    communication_id INTEGER NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
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

// Seed packages
const pkgExists = db.prepare('SELECT id FROM packages LIMIT 1').get();
if (!pkgExists) {
  const pkgs = [
    ['Origen ($$1000)', 1000, 'monetario', 1],
    ['Origen E (1000)', 1000, 'especie', 2],
    ['Presente ($$2500)', 2500, 'monetario', 3],
    ['Presente E (3000)', 3000, 'especie', 4],
    ['Futuro ($$3500)', 3500, 'monetario', 5],
    ['Futuro E (4500)', 4500, 'especie', 6],
    ['Legado ($$6000)', 6000, 'monetario', 7],
    ['Legado E (6500)', 6500, 'especie', 8],
  ];
  const insert = db.prepare('INSERT INTO packages (name, amount, type, sort_order) VALUES (?, ?, ?, ?)');
  for (const p of pkgs) insert.run(...p);
  console.log('Default packages created');
}

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

const chkExists = db.prepare('SELECT id FROM package_checklist_items LIMIT 1').get();
if (!chkExists) {
  const items = [
    ['welcome_post', 'Post de bienvenida', 10],
    ['event_ticket', 'Boleto al evento', 20],
    ['promo_post', 'Post promocional en redes sociales del simposio', 30],
    ['logo_main_banner', 'Logo en lona principal', 40],
    ['event_day_mention', 'Mención el día del evento', 50],
    ['company_social_post', 'Elaboración de un post para redes de la empresa', 60],
    ['vacancy_promotion', 'Difusión de vacantes u oferta en redes sociales del simposio', 70],
    ['marketing_workshop', 'Acceso a taller de marketing', 80],
    ['logo_event_screen', 'Logo en pantalla del evento', 90],
    ['kit_relindo', 'KIT relindo oficial', 100],
    ['social_story_design', '1 diseño para historia para redes sociales de la empresa', 110],
    ['promo_video_30s', '1 video promocional en redes (30 seg max)', 120],
    ['lobby_activation', 'Espacio para activación en el lobby del evento', 130],
    ['promo_video_1min', 'Video promocional en redes sociales (1 min max)', 140],
    ['press_conference', 'Rueda de prensa', 150],
    ['sponsor_brunch', 'Brunch con patrocinadores', 160],
    ['photo_with_speakers', 'Foto con conferencistas oficiales', 170],
  ];
  const insert = db.prepare('INSERT INTO package_checklist_items (key, label, sort_order) VALUES (?, ?, ?)');
  for (const it of items) insert.run(...it);
  console.log('Default package checklist items created');
} else {
  // Migration: replace existing items with the new set
  const newKeys = [
    'welcome_post', 'event_ticket', 'promo_post', 'logo_main_banner',
    'event_day_mention', 'company_social_post', 'vacancy_promotion',
    'marketing_workshop', 'logo_event_screen', 'kit_relindo',
    'social_story_design', 'promo_video_30s', 'lobby_activation',
    'promo_video_1min', 'press_conference', 'sponsor_brunch', 'photo_with_speakers'
  ];
  const existingKeys = db.prepare('SELECT key FROM package_checklist_items').all().map(r => r.key);
  if (existingKeys.length !== newKeys.length || existingKeys.some(k => !newKeys.includes(k))) {
    const txn = db.transaction(() => {
      db.exec('DELETE FROM package_checklist');
      db.exec('DELETE FROM package_checklist_items');
      const items = [
        ['welcome_post', 'Post de bienvenida', 10],
        ['event_ticket', 'Boleto al evento', 20],
        ['promo_post', 'Post promocional en redes sociales del simposio', 30],
        ['logo_main_banner', 'Logo en lona principal', 40],
        ['event_day_mention', 'Mención el día del evento', 50],
        ['company_social_post', 'Elaboración de un post para redes de la empresa', 60],
        ['vacancy_promotion', 'Difusión de vacantes u oferta en redes sociales del simposio', 70],
        ['marketing_workshop', 'Acceso a taller de marketing', 80],
        ['logo_event_screen', 'Logo en pantalla del evento', 90],
        ['kit_relindo', 'KIT relindo oficial', 100],
        ['social_story_design', '1 diseño para historia para redes sociales de la empresa', 110],
        ['promo_video_30s', '1 video promocional en redes (30 seg max)', 120],
        ['lobby_activation', 'Espacio para activación en el lobby del evento', 130],
        ['promo_video_1min', 'Video promocional en redes sociales (1 min max)', 140],
        ['press_conference', 'Rueda de prensa', 150],
        ['sponsor_brunch', 'Brunch con patrocinadores', 160],
        ['photo_with_speakers', 'Foto con conferencistas oficiales', 170],
      ];
      const insert = db.prepare('INSERT INTO package_checklist_items (key, label, sort_order) VALUES (?, ?, ?)');
      for (const it of items) insert.run(...it);
    });
    txn();
    console.log('Package checklist items migrated');
  }
}

// Seed document_types
const docTypeExists = db.prepare('SELECT id FROM document_types LIMIT 1').get();
if (!docTypeExists) {
  const types = ['Permiso', 'Invitación', 'Comunicado', 'Oficio', 'Contrato'];
  const insert = db.prepare('INSERT INTO document_types (name) VALUES (?)');
  for (const t of types) insert.run(t);
  console.log('Default document types created');
}

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

export default db;
