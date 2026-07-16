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

const UPLOAD_DIR = join(__dirname, '..', 'uploads', 'communications');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, `comm-comment-${randomUUID()}.${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

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

  res.json({ communications, total, page, totalPages: Math.ceil(total / limit) });
});

router.get('/stats', authMiddleware, (req, res) => {
  const byStatus = db.prepare("SELECT status, COUNT(*) as count FROM communications GROUP BY status").all();
  const byType = db.prepare("SELECT dt.name, COUNT(*) as count FROM communications c LEFT JOIN document_types dt ON c.document_type_id = dt.id GROUP BY c.document_type_id").all();
  res.json({ byStatus, byType });
});

router.get('/mis-comunicados', authMiddleware, (req, res) => {
  const communications = db.prepare(`
    SELECT c.*, d.name as department_name, dt.name as document_type_name, u.name as created_by_name
    FROM communications c
    LEFT JOIN departments d ON c.department_id = d.id
    LEFT JOIN document_types dt ON c.document_type_id = dt.id
    LEFT JOIN users u ON c.created_by = u.id
    WHERE c.created_by = ?
    ORDER BY c.created_at DESC
  `).all(req.user.id);

  res.json(communications);
});

router.get('/patrocinio/:patrocinioId', authMiddleware, (req, res) => {
  const communications = db.prepare(`
    SELECT c.*, d.name as department_name, dt.name as document_type_name, u.name as created_by_name
    FROM communications c
    LEFT JOIN departments d ON c.department_id = d.id
    LEFT JOIN document_types dt ON c.document_type_id = dt.id
    LEFT JOIN users u ON c.created_by = u.id
    WHERE c.patrocinio_id = ? AND c.created_by = ?
    ORDER BY c.created_at DESC
  `).all(req.params.patrocinioId, req.user.id);

  res.json(communications);
});

router.get('/audiovisual/:audiovisualId', authMiddleware, (req, res) => {
  const communications = db.prepare(`
    SELECT c.*, d.name as department_name, dt.name as document_type_name, u.name as created_by_name
    FROM communications c
    LEFT JOIN departments d ON c.department_id = d.id
    LEFT JOIN document_types dt ON c.document_type_id = dt.id
    LEFT JOIN users u ON c.created_by = u.id
    WHERE c.audiovisual_id = ? AND c.created_by = ?
    ORDER BY c.created_at DESC
  `).all(req.params.audiovisualId, req.user.id);

  res.json(communications);
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
  res.json(comm);
});

router.post('/', authMiddleware, (req, res) => {
  const { employee_name, department_id, document_type_id, status, priority, notes, image_url, video_url, patrocinio_id, audiovisual_id } = req.body;

  if (!employee_name) {
    return res.status(400).json({ error: 'Nombre del empleado requerido' });
  }

  let folio, result;
  for (let attempt = 0; attempt < 5; attempt++) {
    folio = generateFolio();
    try {
      result = db.prepare(`
        INSERT INTO communications (folio, employee_name, department_id, document_type_id, status, priority, notes, image_url, video_url, created_by, patrocinio_id, audiovisual_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(folio, employee_name, department_id || null, document_type_id || null, status || 'asignado', priority || 'media', notes || null, image_url || null, video_url || null, req.user.id, patrocinio_id || null, audiovisual_id || null);
      break;
    } catch (e) {
      if (!e.message.includes('UNIQUE')) throw e;
      if (attempt === 4) throw e;
    }
  }

  res.status(201).json({ id: result.lastInsertRowid, folio, message: 'Comunicación creada' });
});

router.put('/:id', authMiddleware, (req, res) => {
  const comm = db.prepare('SELECT id FROM communications WHERE id = ?').get(req.params.id);
  if (!comm) return res.status(404).json({ error: 'Comunicación no encontrada' });

  const fields = ['employee_name', 'department_id', 'document_type_id', 'status', 'priority', 'notes', 'image_url', 'video_url'];
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
  const result = db.prepare('DELETE FROM communications WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Comunicación no encontrada' });
  res.json({ message: 'Comunicación eliminada' });
});

// ─── Seguimiento (comentarios) ──────────────────────────────

router.get('/:id/comments', authMiddleware, (req, res) => {
  const comm = db.prepare('SELECT id FROM communications WHERE id = ?').get(req.params.id);
  if (!comm) return res.status(404).json({ error: 'Comunicación no encontrada' });

  const comments = db.prepare(`
    SELECT cc.*, u.name as created_by_name
    FROM communication_comments cc
    LEFT JOIN users u ON cc.created_by = u.id
    WHERE cc.communication_id = ?
    ORDER BY cc.created_at DESC
  `).all(req.params.id);

  for (const c of comments) {
    c.files = db.prepare('SELECT * FROM communication_comment_files WHERE comment_id = ?').all(c.id);
  }

  res.json(comments);
});

router.post('/:id/comments', authMiddleware, upload.array('files', 5), (req, res) => {
  const comm = db.prepare('SELECT id FROM communications WHERE id = ?').get(req.params.id);
  if (!comm) return res.status(404).json({ error: 'Comunicación no encontrada' });

  const { comment, link } = req.body;
  if (!comment && (!req.files || req.files.length === 0) && !link) {
    return res.status(400).json({ error: 'Comentario, archivos o enlace requerido' });
  }

  const result = db.prepare(`
    INSERT INTO communication_comments (communication_id, comment, link, created_by)
    VALUES (?, ?, ?, ?)
  `).run(req.params.id, comment || null, link || null, req.user.id);

  const commentId = result.lastInsertRowid;

  if (req.files && req.files.length > 0) {
    const insertFile = db.prepare(`
      INSERT INTO communication_comment_files (comment_id, name, original_name, mime_type, size)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const f of req.files) {
      insertFile.run(commentId, f.filename, f.originalname, f.mimetype, f.size);
    }
  }

  res.status(201).json({ id: commentId, message: 'Comentario agregado' });
});

router.delete('/:id/comments/:commentId', authMiddleware, (req, res) => {
  const comment = db.prepare('SELECT id FROM communication_comments WHERE id = ? AND communication_id = ?').get(req.params.commentId, req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comentario no encontrado' });

  const files = db.prepare('SELECT name FROM communication_comment_files WHERE comment_id = ?').all(req.params.commentId);
  for (const f of files) {
    const filePath = join(UPLOAD_DIR, f.name);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  db.prepare('DELETE FROM communication_comment_files WHERE comment_id = ?').run(req.params.commentId);
  db.prepare('DELETE FROM communication_comments WHERE id = ?').run(req.params.commentId);
  res.json({ message: 'Comentario eliminado' });
});

router.get('/:id/comments/:commentId/download/:fileId', authMiddleware, (req, res) => {
  const file = db.prepare('SELECT * FROM communication_comment_files WHERE id = ? AND comment_id = ?').get(req.params.fileId, req.params.commentId);
  if (!file) return res.status(404).json({ error: 'Archivo no encontrado' });

  const filePath = join(UPLOAD_DIR, file.name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado en disco' });

  res.download(filePath, file.original_name);
});

export default router;
