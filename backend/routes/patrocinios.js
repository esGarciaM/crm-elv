import { Router } from 'express';
import db from '../database.js';
import { authMiddleware } from '../middleware/auth.js';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

const UPLOAD_DIR = join(__dirname, '..', 'uploads', 'patrocinios');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, `patrocinio-${randomUUID()}.${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB

// ─── Validación ──────────────────────────────────────────────
const VALID_SPONSORSHIP_TYPES = ['Monetario', 'Especie', 'Especie/Monetario', 'Pendiente'];
function getValidPackages() {
  return db.prepare('SELECT name FROM packages WHERE active = 1 ORDER BY sort_order').all().map(r => r.name);
}
const VALID_VISIT_STATUS = ['Visitado', 'En linea', 'Visita pendiente', 'Visita agendada', 'No quiso'];
const VALID_PAYMENT_STATUS = ['Pagado', 'Pendiente', 'Abonado', 'Cancelado'];
const VALID_SOCIAL_MEDIA = ['Cumplido', 'No', 'No requiere'];
const VALID_TICKETS = ['Entregados', 'No', 'No requiere'];

function validatePatrocinio(body, isUpdate = false) {
  const errors = [];

  if (!isUpdate || body.company_name !== undefined) {
    if (body.company_name !== null && body.company_name !== undefined && typeof body.company_name === 'string' && body.company_name.trim().length > 200) {
      errors.push('company_name no puede exceder 200 caracteres');
    }
  }

  if (body.sponsorship_type && !VALID_SPONSORSHIP_TYPES.includes(body.sponsorship_type)) {
    errors.push(`sponsorship_type debe ser uno de: ${VALID_SPONSORSHIP_TYPES.join(', ')}`);
  }
  if (body.package && !getValidPackages().includes(body.package)) {
    errors.push(`package debe ser uno de: ${getValidPackages().join(', ')}`);
  }
  if (body.visit_status && !VALID_VISIT_STATUS.includes(body.visit_status)) {
    errors.push(`visit_status debe ser uno de: ${VALID_VISIT_STATUS.join(', ')}`);
  }
  if (body.payment_status && !VALID_PAYMENT_STATUS.includes(body.payment_status)) {
    errors.push(`payment_status debe ser uno de: ${VALID_PAYMENT_STATUS.join(', ')}`);
  }
  if (body.social_media_fulfilled && !VALID_SOCIAL_MEDIA.includes(body.social_media_fulfilled)) {
    errors.push(`social_media_fulfilled debe ser uno de: ${VALID_SOCIAL_MEDIA.join(', ')}`);
  }
  if (body.tickets_delivered && !VALID_TICKETS.includes(body.tickets_delivered)) {
    errors.push(`tickets_delivered debe ser uno de: ${VALID_TICKETS.join(', ')}`);
  }

  return errors;
}

// ─── GET / — Lista paginada con búsqueda ────────────────────
router.get('/', authMiddleware, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';

  let where = '';
  const params = [];
  if (search) {
    where = 'WHERE (p.company_name LIKE ? OR p.contact_person LIKE ? OR p.student_obtained LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM patrocinios p ${where}`).get(...params).count;
  const patrocinios = db.prepare(`
    SELECT p.*, 
      creator.name AS created_by_name,
      editor.name AS updated_by_name,
      (SELECT COUNT(*) FROM package_checklist pc2 JOIN packages pk2 ON pk2.id = pc2.package_id WHERE pk2.name = p.package) AS checklist_total,
      (SELECT COUNT(*) FROM patrocinio_checklist ptcl2 WHERE ptcl2.patrocinio_id = p.id AND ptcl2.completed = 1) AS checklist_completed
    FROM patrocinios p
    LEFT JOIN users creator ON creator.id = p.created_by
    LEFT JOIN users editor ON editor.id = p.updated_by
    ${where}
    ORDER BY p.company_name
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({ patrocinios, total, page, totalPages: Math.ceil(total / limit) });
});

// ─── GET /stats — Estadísticas de patrocinios ───────────────
router.get('/stats', authMiddleware, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM patrocinios').get().count;
  const byType = db.prepare('SELECT sponsorship_type, COUNT(*) as count FROM patrocinios WHERE sponsorship_type IS NOT NULL AND sponsorship_type != \'\' GROUP BY sponsorship_type').all();
  const byPayment = db.prepare('SELECT payment_status, COUNT(*) as count FROM patrocinios WHERE payment_status IS NOT NULL AND payment_status != \'\' GROUP BY payment_status').all();
  const byVisit = db.prepare('SELECT visit_status, COUNT(*) as count FROM patrocinios WHERE visit_status IS NOT NULL AND visit_status != \'\' GROUP BY visit_status').all();
  const byPackage = db.prepare('SELECT package, COUNT(*) as count FROM patrocinios WHERE package IS NOT NULL AND package != \'\' GROUP BY package').all();

  // Extract estimated amounts from packages
  const allPackages = db.prepare("SELECT package, payment_status, sponsorship_type FROM patrocinios WHERE package IS NOT NULL AND package != ''").all();

  let totalEstimated = 0;
  let totalPagado = 0;
  let totalPendiente = 0;
  let totalAbonado = 0;
  let inKindCount = 0;
  let inKindEstimated = 0;

  function extractAmount(pkg) {
    if (!pkg) return 0;
    const m = pkg.match(/\$*(\d[\d,]*)/);
    return m ? parseInt(m[1].replace(/,/g, '')) : 0;
  }

  for (const c of allPackages) {
    const amt = extractAmount(c.package);
    totalEstimated += amt;
    const isInKind = c.sponsorship_type && c.sponsorship_type.toLowerCase().includes('especie');
    if (isInKind) {
      inKindCount++;
      inKindEstimated += amt;
    }
    const status = c.payment_status || 'Pendiente';
    if (status === 'Pagado') totalPagado += amt;
    else if (status === 'Pendiente') totalPendiente += amt;
    else if (status === 'Abonado') totalAbonado += amt;
  }

  res.json({
    total,
    byType,
    byPayment,
    byVisit,
    byPackage,
    totalEstimated,
    totalPagado,
    totalPendiente,
    totalAbonado,
    inKindCount,
    inKindEstimated
  });
});

// ─── GET /:id — Detalle completo (con documentos y tareas) ──
router.get('/:id', authMiddleware, (req, res) => {
  const patrocinio = db.prepare(`
    SELECT p.*,
      creator.name AS created_by_name,
      editor.name AS updated_by_name
    FROM patrocinios p
    LEFT JOIN users creator ON creator.id = p.created_by
    LEFT JOIN users editor ON editor.id = p.updated_by
    WHERE p.id = ?
  `).get(req.params.id);

  if (!patrocinio) return res.status(404).json({ error: 'Patrocinio no encontrado' });

  const documents = db.prepare('SELECT * FROM patrocinio_documents WHERE patrocinio_id = ? ORDER BY created_at DESC').all(req.params.id);
  const tasks = db.prepare(`
    SELECT t.*, u.name AS assigned_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assigned_to
    WHERE t.patrocinio_id = ?
    ORDER BY t.created_at DESC
  `).all(req.params.id);

  res.json({ ...patrocinio, documents, tasks });
});

// ─── POST / — Crear patrocinio ──────────────────────────────
router.post('/', authMiddleware, (req, res) => {
  const errors = validatePatrocinio(req.body);
  if (errors.length > 0) return res.status(400).json({ error: 'Datos inválidos', details: errors });

  const {
    company_name, contact_person, phone, sponsorship_type, package: pkg,
    visit_status, payment_status, student_obtained, student_contacted,
    in_kind_detail, payment_detail, social_media_fulfilled, tickets_delivered,
    logo_requested, notes
  } = req.body;

  const result = db.prepare(`
    INSERT INTO patrocinios (company_name, contact_person, phone, sponsorship_type, package,
      visit_status, payment_status, student_obtained, student_contacted,
      in_kind_detail, payment_detail, social_media_fulfilled, tickets_delivered,
      logo_requested, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    company_name || null, contact_person || null, phone || null, sponsorship_type || null, pkg || null,
    visit_status || null, payment_status || null, student_obtained || null, student_contacted || null,
    in_kind_detail || null, payment_detail || null, social_media_fulfilled || null, tickets_delivered || null,
    logo_requested || null, notes || null, req.user.id
  );

  res.status(201).json({ id: result.lastInsertRowid });
});

// ─── PUT /:id — Actualizar patrocinio (con auditoría) ──────
router.put('/:id', authMiddleware, (req, res) => {
  const patrocinio = db.prepare('SELECT id FROM patrocinios WHERE id = ?').get(req.params.id);
  if (!patrocinio) return res.status(404).json({ error: 'Patrocinio no encontrado' });

  const errors = validatePatrocinio(req.body, true);
  if (errors.length > 0) return res.status(400).json({ error: 'Datos inválidos', details: errors });

  const fields = [
    'company_name', 'contact_person', 'phone', 'sponsorship_type', 'package',
    'visit_status', 'payment_status', 'student_obtained', 'student_contacted',
    'in_kind_detail', 'payment_detail', 'social_media_fulfilled', 'tickets_delivered',
    'logo_requested', 'notes'
  ];

  const updates = [];
  const params = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(req.body[f] === '' ? null : req.body[f]);
    }
  }

  if (updates.length === 0) return res.status(400).json({ error: 'Sin cambios' });

  updates.push("updated_at = datetime('now','localtime')");
  updates.push("updated_by = ?");
  params.push(req.user.id);
  params.push(req.params.id);

  db.prepare(`UPDATE patrocinios SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ message: 'Patrocinio actualizado' });
});

// ─── DELETE /:id — Eliminar patrocinio ──────────────────────
router.delete('/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM patrocinios WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Patrocinio no encontrado' });
  res.json({ message: 'Patrocinio eliminado' });
});

// ─── Documentos ─────────────────────────────────────────────

// GET /:id/documents — Documentos de un patrocinio
router.get('/:id/documents', authMiddleware, (req, res) => {
  const patrocinio = db.prepare('SELECT id FROM patrocinios WHERE id = ?').get(req.params.id);
  if (!patrocinio) return res.status(404).json({ error: 'Patrocinio no encontrado' });

  const docs = db.prepare(`
    SELECT d.*, u.name AS uploaded_by_name
    FROM patrocinio_documents d
    LEFT JOIN users u ON u.id = d.uploaded_by
    WHERE d.patrocinio_id = ?
    ORDER BY d.created_at DESC
  `).all(req.params.id);

  res.json(docs);
});

// POST /:id/documents — Subir documento a un patrocinio
router.post('/:id/documents', authMiddleware, upload.single('file'), (req, res) => {
  const patrocinio = db.prepare('SELECT id FROM patrocinios WHERE id = ?').get(req.params.id);
  if (!patrocinio) return res.status(404).json({ error: 'Patrocinio no encontrado' });

  if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });

  const { originalname, filename, mimetype, size } = req.file;
  const category = req.body.category || 'general';

  const result = db.prepare(`
    INSERT INTO patrocinio_documents (patrocinio_id, name, original_name, mime_type, size, category, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, filename, originalname, mimetype, size, category, req.user.id);

  res.status(201).json({ id: result.lastInsertRowid, name: filename, original_name: originalname });
});

// DELETE /:id/documents/:docId — Eliminar documento
router.delete('/:id/documents/:docId', authMiddleware, (req, res) => {
  const doc = db.prepare('SELECT * FROM patrocinio_documents WHERE id = ? AND patrocinio_id = ?').get(req.params.docId, req.params.id);
  if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });

  const filePath = join(UPLOAD_DIR, doc.name);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM patrocinio_documents WHERE id = ?').run(req.params.docId);
  res.json({ message: 'Documento eliminado' });
});

// GET /:id/documents/:docId/download — Descargar documento
router.get('/:id/documents/:docId/download', authMiddleware, (req, res) => {
  const doc = db.prepare('SELECT * FROM patrocinio_documents WHERE id = ? AND patrocinio_id = ?').get(req.params.docId, req.params.id);
  if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });

  const filePath = join(UPLOAD_DIR, doc.name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado en disco' });

  res.download(filePath, doc.original_name);
});

// ─── Tareas vinculadas ──────────────────────────────────────

// GET /:id/tasks — Tareas de un patrocinio
router.get('/:id/tasks', authMiddleware, (req, res) => {
  const patrocinio = db.prepare('SELECT id FROM patrocinios WHERE id = ?').get(req.params.id);
  if (!patrocinio) return res.status(404).json({ error: 'Patrocinio no encontrado' });

  const tasks = db.prepare(`
    SELECT t.*, u.name AS assigned_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assigned_to
    WHERE t.patrocinio_id = ?
    ORDER BY 
      CASE t.status 
        WHEN 'pending' THEN 1
        WHEN 'in_progress' THEN 2
        WHEN 'completed' THEN 3
        WHEN 'cancelled' THEN 4
      END,
      t.due_date ASC
  `).all(req.params.id);

  res.json(tasks);
});

// POST /:id/tasks — Crear tarea vinculada a un patrocinio
router.post('/:id/tasks', authMiddleware, (req, res) => {
  const patrocinio = db.prepare('SELECT id FROM patrocinios WHERE id = ?').get(req.params.id);
  if (!patrocinio) return res.status(404).json({ error: 'Patrocinio no encontrado' });

  const { title, description, status, priority, due_date, assigned_to } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'El título es requerido' });

  const result = db.prepare(`
    INSERT INTO tasks (title, description, status, priority, due_date, patrocinio_id, assigned_to, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title.trim(), description || null, status || 'pending', priority || 'medium',
    due_date || null, req.params.id, assigned_to || null, req.user.id
  );

  res.status(201).json({ id: result.lastInsertRowid });
});

export default router;
