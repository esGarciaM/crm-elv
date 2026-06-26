import { Router } from 'express';
import multer from 'multer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import fs from 'fs';
import db from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadDir = join(__dirname, '..', 'uploads', 'communications');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, `${randomUUID()}.${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, true);
  }
});

const router = Router();

function generateFolio() {
  const prefix = 'COM';
  const date = new Date();
  const yymm = `${date.getFullYear().toString().slice(2)}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const row = db.prepare("SELECT folio FROM communications WHERE substr(folio,5,4) = ? ORDER BY id DESC LIMIT 1").get(yymm);
  const seq = row ? parseInt(row.folio.split('-')[2], 10) + 1 : 1;
  return `${prefix}-${yymm}-${String(seq).padStart(4, '0')}`;
}

router.get('/', authMiddleware, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  const total = db.prepare('SELECT COUNT(*) as count FROM communications').get().count;
  const communications = db.prepare(`
    SELECT c.*, d.name as department_name, dt.name as document_type_name, u.name as created_by_name
    FROM communications c
    LEFT JOIN departments d ON c.department_id = d.id
    LEFT JOIN document_types dt ON c.document_type_id = dt.id
    LEFT JOIN users u ON c.created_by = u.id
    ORDER BY c.created_at DESC LIMIT ? OFFSET ?
  `).all(limit, offset);

  const ids = communications.map(c => c.id);
  let filesMap = {};
  if (ids.length > 0) {
    const ph = ids.map(() => '?').join(',');
    const files = db.prepare(`SELECT * FROM communication_files WHERE communication_id IN (${ph}) ORDER BY created_at`).all(...ids);
    for (const f of files) {
      if (!filesMap[f.communication_id]) filesMap[f.communication_id] = [];
      filesMap[f.communication_id].push(f);
    }
  }

  res.json({
    communications: communications.map(c => ({ ...c, files: filesMap[c.id] || [] })),
    total, page, totalPages: Math.ceil(total / limit)
  });
});

router.get('/stats', authMiddleware, (req, res) => {
  const byStatus = db.prepare("SELECT status, COUNT(*) as count FROM communications GROUP BY status").all();
  const byType = db.prepare("SELECT dt.name, COUNT(*) as count FROM communications c LEFT JOIN document_types dt ON c.document_type_id = dt.id GROUP BY c.document_type_id").all();
  res.json({ byStatus, byType });
});

router.get('/:id', authMiddleware, (req, res) => {
  const comm = db.prepare(`
    SELECT c.*, d.name as department_name, dt.name as document_type_name, u.name as created_by_name
    FROM communications c
    LEFT JOIN departments d ON c.department_id = d.id
    LEFT JOIN document_types dt ON c.document_type_id = dt.id
    LEFT JOIN users u ON c.created_by = u.id
    WHERE c.id = ?
  `).get(req.params.id);
  if (!comm) return res.status(404).json({ error: 'Comunicación no encontrada' });
  const files = db.prepare('SELECT * FROM communication_files WHERE communication_id = ? ORDER BY created_at').all(req.params.id);
  res.json({ ...comm, files });
});

router.post('/', authMiddleware, upload.array('files', 10), (req, res) => {
  const { employee_name, department_id, document_type_id, status, priority, notes } = req.body;

  if (!employee_name) {
    if (req.files) for (const f of req.files) fs.unlinkSync(f.path);
    return res.status(400).json({ error: 'Nombre del empleado requerido' });
  }

  let folio, result;
  for (let attempt = 0; attempt < 5; attempt++) {
    folio = generateFolio();
    try {
      result = db.prepare(`
        INSERT INTO communications (folio, employee_name, department_id, document_type_id, status, priority, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(folio, employee_name, department_id || null, document_type_id || null, status || 'asignado', priority || 'media', notes || null, req.user.id);
      break;
    } catch (e) {
      if (!e.message.includes('UNIQUE')) throw e;
      if (attempt === 4) throw e;
    }
  }

  const commId = result.lastInsertRowid;

  if (req.files) {
    const insert = db.prepare('INSERT INTO communication_files (communication_id, name, original_name, mime_type, size) VALUES (?, ?, ?, ?, ?)');
    for (const f of req.files) {
      insert.run(commId, f.filename, f.originalname, f.mimetype, f.size);
    }
  }

  res.status(201).json({ id: commId, folio, message: 'Comunicación creada' });
});

router.put('/:id', authMiddleware, (req, res) => {
  const comm = db.prepare('SELECT id FROM communications WHERE id = ?').get(req.params.id);
  if (!comm) return res.status(404).json({ error: 'Comunicación no encontrada' });

  const fields = ['employee_name', 'department_id', 'document_type_id', 'status', 'priority', 'notes'];
  const updates = [];
  const params = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'Sin cambios' });
  updates.push("updated_at = datetime('now','localtime')");
  params.push(req.params.id);
  db.prepare(`UPDATE communications SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ message: 'Comunicación actualizada' });
});

router.delete('/:id', authMiddleware, (req, res) => {
  const files = db.prepare('SELECT * FROM communication_files WHERE communication_id = ?').all(req.params.id);
  for (const f of files) {
    const fp = join(uploadDir, f.name);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  const result = db.prepare('DELETE FROM communications WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Comunicación no encontrada' });
  res.json({ message: 'Comunicación eliminada' });
});

router.get('/download/:fileId', authMiddleware, (req, res) => {
  const file = db.prepare('SELECT * FROM communication_files WHERE id = ?').get(req.params.fileId);
  if (!file) return res.status(404).json({ error: 'Archivo no encontrado' });
  const filePath = join(uploadDir, file.name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado en disco' });
  res.setHeader('Content-Type', file.mime_type);
  res.setHeader('Content-Disposition', `inline; filename="${file.original_name}"`);
  res.sendFile(filePath);
});

export default router;
