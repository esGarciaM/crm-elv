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

const UPLOAD_DIR = join(__dirname, '..', 'uploads', 'audiovisual');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, `av-${randomUUID()}.${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

const VALID_AV_STATUS = ['completo', 'progreso', 'incompleto'];
const VALID_EVENT_NAMES = ['dia del estudiante', 'ventas de la carrera', 'video promocional', 'mercaday', 'simposio', 'entrevistas', 'spirit week', 'otro'];

function validateAvBody(body) {
  const errors = [];
  if (body.status && !VALID_AV_STATUS.includes(body.status)) {
    errors.push(`status debe ser uno de: ${VALID_AV_STATUS.join(', ')}`);
  }
  return errors;
}

// ═══════════════════════════════════════════════════════════
// ─── PATROCINIOS AUDIOVISUALES ───────────────────────────
// ═══════════════════════════════════════════════════════════

// ─── GET /patrocinios/stats — Dashboard ──────────────────
router.get('/patrocinios/stats', authMiddleware, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM audiovisual_patrocinios').get().count;
  const completo = db.prepare("SELECT COUNT(*) as count FROM audiovisual_patrocinios WHERE status = 'completo'").get().count;
  const progreso = db.prepare("SELECT COUNT(*) as count FROM audiovisual_patrocinios WHERE status = 'progreso'").get().count;
  const incompleto = db.prepare("SELECT COUNT(*) as count FROM audiovisual_patrocinios WHERE status = 'incompleto'").get().count;
  const checklistTotal = db.prepare(`
    SELECT COUNT(*) as count FROM patrocinio_checklist pc
    JOIN audiovisual_patrocinios av ON av.patrocinio_id = pc.patrocinio_id
  `).get().count;
  const checklistCompleted = db.prepare(`
    SELECT COUNT(*) as count FROM patrocinio_checklist pc
    JOIN audiovisual_patrocinios av ON av.patrocinio_id = pc.patrocinio_id
    WHERE pc.completed = 1
  `).get().count;

  res.json({ total, completo, progreso, incompleto, checklistTotal, checklistCompleted });
});

// ─── GET /patrocinios — Lista paginada ───────────────────
router.get('/patrocinios', authMiddleware, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';
  const status = req.query.status || '';

  let where = [];
  const params = [];

  if (search) {
    where.push('(p.company_name LIKE ? OR p.contact_person LIKE ? OR p.student_obtained LIKE ? OR av.observations LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  if (status) {
    where.push('av.status = ?');
    params.push(status);
  }

  const whereStr = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM audiovisual_patrocinios av
    JOIN patrocinios p ON p.id = av.patrocinio_id
    ${whereStr}
  `).get(...params).count;

  const items = db.prepare(`
    SELECT av.*, p.company_name, p.contact_person, p.package, p.student_obtained,
      u.name AS created_by_name,
      editor.name AS updated_by_name,
      (SELECT COUNT(*) FROM package_checklist_items pci
        JOIN package_checklist pc2 ON pc2.item_id = pci.id
        JOIN packages pk ON pk.name = p.package
        WHERE pc2.package_id = pk.id) AS checklist_total,
      (SELECT COUNT(*) FROM patrocinio_checklist pc
        WHERE pc.patrocinio_id = av.patrocinio_id AND pc.completed = 1) AS checklist_completed
    FROM audiovisual_patrocinios av
    JOIN patrocinios p ON p.id = av.patrocinio_id
    LEFT JOIN users u ON u.id = av.created_by
    LEFT JOIN users editor ON editor.id = av.updated_by
    ${whereStr}
    ORDER BY av.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({ items, total, page, totalPages: Math.ceil(total / limit) });
});

// ─── GET /patrocinios/:id — Detalle + checklist + comments
router.get('/patrocinios/:id', authMiddleware, (req, res) => {
  const item = db.prepare(`
    SELECT av.*, p.company_name, p.contact_person, p.package, p.student_obtained, p.phone,
      u.name AS created_by_name,
      editor.name AS updated_by_name
    FROM audiovisual_patrocinios av
    JOIN patrocinios p ON p.id = av.patrocinio_id
    LEFT JOIN users u ON u.id = av.created_by
    LEFT JOIN users editor ON editor.id = av.updated_by
    WHERE av.id = ?
  `).get(req.params.id);

  if (!item) return res.status(404).json({ error: 'Registro no encontrado' });

  let checklist = [];
  if (item.package) {
    const pkg = db.prepare('SELECT id FROM packages WHERE name = ?').get(item.package);
    if (pkg) {
      checklist = db.prepare(`
        SELECT pci.*, pc.completed, pc.completed_at
        FROM package_checklist_items pci
        JOIN package_checklist pc2 ON pc2.item_id = pci.id
        LEFT JOIN patrocinio_checklist pc ON pc.item_id = pci.id AND pc.patrocinio_id = ?
        WHERE pc2.package_id = ?
        ORDER BY pci.sort_order
      `).all(item.patrocinio_id, pkg.id).map(i => ({ ...i, completed: !!i.completed }));
    }
  }

  const comments = db.prepare(`
    SELECT c.*, u.name as created_by_name, resp.name as responsible_name, del.name as deleted_by_name
    FROM audiovisual_comments c
    LEFT JOIN users u ON u.id = c.created_by
    LEFT JOIN users resp ON resp.id = c.responsible_id
    LEFT JOIN users del ON del.id = c.deleted_by
    WHERE c.audiovisual_patrocinio_id = ? AND c.deleted = 0
    ORDER BY c.created_at ASC
  `).all(req.params.id);

  for (const c of comments) {
    c.files = db.prepare('SELECT * FROM audiovisual_comment_files WHERE comment_id = ?').all(c.id);
  }

  res.json({ item, checklist, comments });
});

// ─── POST /patrocinios — Crear ──────────────────────────
router.post('/patrocinios', authMiddleware, (req, res) => {
  const errors = validateAvBody(req.body);
  if (errors.length > 0) return res.status(400).json({ error: 'Datos inválidos', details: errors });

  const { patrocinio_id, video_url, reels_url, delivery_date, status, observations } = req.body;
  if (!patrocinio_id) return res.status(400).json({ error: 'Datos inválidos', details: ['El patrocinio es obligatorio'] });

  const exists = db.prepare('SELECT id FROM audiovisual_patrocinios WHERE patrocinio_id = ?').get(patrocinio_id);
  if (exists) return res.status(400).json({ error: 'Datos inválidos', details: ['Este patrocinio ya tiene seguimiento audiovisual'] });

  const result = db.prepare(`
    INSERT INTO audiovisual_patrocinios (patrocinio_id, video_url, reels_url, delivery_date, status, observations, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(patrocinio_id, video_url || null, reels_url || null, delivery_date || null, status || 'incompleto', observations || null, req.user.id);

  res.status(201).json({ id: result.lastInsertRowid });
});

// ─── PUT /patrocinios/:id — Actualizar ──────────────────
router.put('/patrocinios/:id', authMiddleware, (req, res) => {
  const item = db.prepare('SELECT id FROM audiovisual_patrocinios WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Registro no encontrado' });

  const errors = validateAvBody(req.body);
  if (errors.length > 0) return res.status(400).json({ error: 'Datos inválidos', details: errors });

  const fields = ['video_url', 'reels_url', 'delivery_date', 'status', 'observations'];
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

  db.prepare(`UPDATE audiovisual_patrocinios SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ message: 'Registro actualizado' });
});

// ─── DELETE /patrocinios/:id — Eliminar ─────────────────
router.delete('/patrocinios/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM audiovisual_patrocinios WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Registro no encontrado' });
  res.json({ message: 'Registro eliminado' });
});

// ─── PUT /patrocinios/:id/checklist — Toggle item ───────
router.put('/patrocinios/:id/checklist', authMiddleware, (req, res) => {
  const { item_id, completed } = req.body;

  const av = db.prepare('SELECT patrocinio_id FROM audiovisual_patrocinios WHERE id = ?').get(req.params.id);
  if (!av) return res.status(404).json({ error: 'Registro no encontrado' });

  const existing = db.prepare(
    'SELECT id FROM patrocinio_checklist WHERE patrocinio_id = ? AND item_id = ?'
  ).get(av.patrocinio_id, item_id);

  if (existing) {
    db.prepare(`
      UPDATE patrocinio_checklist
      SET completed = ?, completed_at = CASE WHEN ? THEN datetime('now','localtime') ELSE NULL END
      WHERE id = ?
    `).run(completed ? 1 : 0, completed ? 1 : 0, existing.id);
  } else {
    db.prepare(`
      INSERT INTO patrocinio_checklist (patrocinio_id, item_id, completed, completed_at)
      VALUES (?, ?, ?, CASE WHEN ? THEN datetime('now','localtime') ELSE NULL END)
    `).run(av.patrocinio_id, item_id, completed ? 1 : 0, completed ? 1 : 0);
  }

  res.json({ success: true });
});

// ─── POST /patrocinios/:id/comments — Agregar comentario + archivos
router.post('/patrocinios/:id/comments', authMiddleware, upload.array('files', 5), (req, res) => {
  const { comment, responsible_id, video_link } = req.body;

  if ((!comment || !comment.trim()) && (!req.files || req.files.length === 0) && !video_link) {
    return res.status(400).json({ error: 'Debes escribir un comentario, adjuntar archivos o agregar un link de video' });
  }

  const result = db.prepare(
    'INSERT INTO audiovisual_comments (audiovisual_patrocinio_id, comment, responsible_id, video_link, created_by) VALUES (?, ?, ?, ?, ?)'
  ).run(req.params.id, (comment || '').trim(), responsible_id || null, video_link || null, req.user.id);

  const commentId = result.lastInsertRowid;

  if (req.files && req.files.length > 0) {
    const insertFile = db.prepare(
      'INSERT INTO audiovisual_comment_files (comment_id, file_url, file_name) VALUES (?, ?, ?)'
    );
    for (const file of req.files) {
      insertFile.run(commentId, `/uploads/audiovisual/${file.filename}`, file.originalname);
    }
  }

  const newComment = db.prepare(`
    SELECT c.*, u.name as created_by_name, resp.name as responsible_name, del.name as deleted_by_name
    FROM audiovisual_comments c
    LEFT JOIN users u ON u.id = c.created_by
    LEFT JOIN users resp ON resp.id = c.responsible_id
    LEFT JOIN users del ON del.id = c.deleted_by
    WHERE c.id = ?
  `).get(commentId);

  newComment.files = db.prepare('SELECT * FROM audiovisual_comment_files WHERE comment_id = ?').all(commentId);

  res.json(newComment);
});

// ─── DELETE /patrocinios/:id/comments/:commentId ────────
router.delete('/patrocinios/:id/comments/:commentId', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo los administradores pueden eliminar comentarios' });
  }

  const comment = db.prepare('SELECT * FROM audiovisual_comments WHERE id = ? AND audiovisual_patrocinio_id = ?')
    .get(req.params.commentId, req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comentario no encontrado' });

  db.prepare(`
    UPDATE audiovisual_comments SET deleted = 1, deleted_by = ?, deleted_at = datetime('now','localtime') WHERE id = ?
  `).run(req.user.id, req.params.commentId);

  res.json({ success: true, message: 'Comentario eliminado' });
});

// ─── GET /patrocinios/:id/comments/:commentId/download ──
router.get('/patrocinios/:id/comments/:commentId/download', authMiddleware, (req, res) => {
  const file = db.prepare(`
    SELECT cf.* FROM audiovisual_comment_files cf
    JOIN audiovisual_comments c ON c.id = cf.comment_id
    WHERE cf.id = ? AND c.audiovisual_patrocinio_id = ?
  `).get(req.params.commentId, req.params.id);

  if (!file) return res.status(404).json({ error: 'Archivo no encontrado' });

  const filename = file.file_url.split('/').pop();
  const filePath = join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado en disco' });

  res.download(filePath, file.file_name || filename);
});

// ═══════════════════════════════════════════════════════════
// ─── EVENTOS ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════

// ─── GET /events/stats — Dashboard ───────────────────────
router.get('/events/stats', authMiddleware, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM audiovisual_events').get().count;
  const byName = db.prepare('SELECT name, COUNT(*) as count FROM audiovisual_events GROUP BY name ORDER BY count DESC').all();
  const upcoming = db.prepare("SELECT COUNT(*) as count FROM audiovisual_events WHERE event_date >= date('now','localtime')").get().count;
  const past = db.prepare("SELECT COUNT(*) as count FROM audiovisual_events WHERE event_date < date('now','localtime')").get().count;

  res.json({ total, byName, upcoming, past });
});

// ─── GET /events/calendar — Calendar data ────────────────
router.get('/events/calendar', authMiddleware, (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const end = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  const items = db.prepare(`
    SELECT * FROM audiovisual_events
    WHERE event_date < ? AND (event_date >= ? OR event_date IS NULL)
    ORDER BY event_date ASC
  `).all(end, start);

  res.json(items);
});

// ─── GET /events — Lista paginada ────────────────────────
router.get('/events', authMiddleware, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';
  const eventName = req.query.event_name || '';

  let where = [];
  const params = [];

  if (search) {
    where.push('(e.name LIKE ? OR e.observations LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s);
  }
  if (eventName) {
    where.push('e.name = ?');
    params.push(eventName);
  }

  const whereStr = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const total = db.prepare(`SELECT COUNT(*) as count FROM audiovisual_events e ${whereStr}`).get(...params).count;

  const items = db.prepare(`
    SELECT e.*, u.name AS created_by_name, editor.name AS updated_by_name
    FROM audiovisual_events e
    LEFT JOIN users u ON u.id = e.created_by
    LEFT JOIN users editor ON editor.id = e.updated_by
    ${whereStr}
    ORDER BY e.event_date DESC, e.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({ items, total, page, totalPages: Math.ceil(total / limit) });
});

// ─── GET /events/:id — Detalle + comments ───────────────
router.get('/events/:id', authMiddleware, (req, res) => {
  const item = db.prepare(`
    SELECT e.*, u.name AS created_by_name, editor.name AS updated_by_name
    FROM audiovisual_events e
    LEFT JOIN users u ON u.id = e.created_by
    LEFT JOIN users editor ON editor.id = e.updated_by
    WHERE e.id = ?
  `).get(req.params.id);

  if (!item) return res.status(404).json({ error: 'Registro no encontrado' });

  const comments = db.prepare(`
    SELECT c.*, u.name as created_by_name, resp.name as responsible_name, del.name as deleted_by_name
    FROM audiovisual_comments c
    LEFT JOIN users u ON u.id = c.created_by
    LEFT JOIN users resp ON resp.id = c.responsible_id
    LEFT JOIN users del ON del.id = c.deleted_by
    WHERE c.audiovisual_event_id = ? AND c.deleted = 0
    ORDER BY c.created_at ASC
  `).all(req.params.id);

  for (const c of comments) {
    c.files = db.prepare('SELECT * FROM audiovisual_comment_files WHERE comment_id = ?').all(c.id);
  }

  res.json({ item, comments });
});

// ─── POST /events — Crear ───────────────────────────────
router.post('/events', authMiddleware, (req, res) => {
  const { name, event_date, video_url, reels_url, observations } = req.body;
  if (!name) return res.status(400).json({ error: 'Datos inválidos', details: ['El nombre del evento es obligatorio'] });

  const result = db.prepare(`
    INSERT INTO audiovisual_events (name, event_date, video_url, reels_url, observations, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, event_date || null, video_url || null, reels_url || null, observations || null, req.user.id);

  res.status(201).json({ id: result.lastInsertRowid });
});

// ─── PUT /events/:id — Actualizar ───────────────────────
router.put('/events/:id', authMiddleware, (req, res) => {
  const item = db.prepare('SELECT id FROM audiovisual_events WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Registro no encontrado' });

  const fields = ['name', 'event_date', 'video_url', 'reels_url', 'observations'];
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

  db.prepare(`UPDATE audiovisual_events SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ message: 'Registro actualizado' });
});

// ─── DELETE /events/:id — Eliminar ──────────────────────
router.delete('/events/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM audiovisual_events WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Registro no encontrado' });
  res.json({ message: 'Registro eliminado' });
});

// ─── POST /events/:id/comments — Agregar comentario + archivos
router.post('/events/:id/comments', authMiddleware, upload.array('files', 5), (req, res) => {
  const { comment, video_link } = req.body;

  if ((!comment || !comment.trim()) && (!req.files || req.files.length === 0) && !video_link) {
    return res.status(400).json({ error: 'Debes escribir un comentario, adjuntar archivos o agregar un link de video' });
  }

  const result = db.prepare(
    'INSERT INTO audiovisual_comments (audiovisual_event_id, comment, video_link, created_by) VALUES (?, ?, ?, ?)'
  ).run(req.params.id, (comment || '').trim(), video_link || null, req.user.id);

  const commentId = result.lastInsertRowid;

  if (req.files && req.files.length > 0) {
    const insertFile = db.prepare(
      'INSERT INTO audiovisual_comment_files (comment_id, file_url, file_name) VALUES (?, ?, ?)'
    );
    for (const file of req.files) {
      insertFile.run(commentId, `/uploads/audiovisual/${file.filename}`, file.originalname);
    }
  }

  const newComment = db.prepare(`
    SELECT c.*, u.name as created_by_name, resp.name as responsible_name, del.name as deleted_by_name
    FROM audiovisual_comments c
    LEFT JOIN users u ON u.id = c.created_by
    LEFT JOIN users resp ON resp.id = c.responsible_id
    LEFT JOIN users del ON del.id = c.deleted_by
    WHERE c.id = ?
  `).get(commentId);

  newComment.files = db.prepare('SELECT * FROM audiovisual_comment_files WHERE comment_id = ?').all(commentId);

  res.json(newComment);
});

// ─── DELETE /events/:id/comments/:commentId ─────────────
router.delete('/events/:id/comments/:commentId', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo los administradores pueden eliminar comentarios' });
  }

  const comment = db.prepare('SELECT * FROM audiovisual_comments WHERE id = ? AND audiovisual_event_id = ?')
    .get(req.params.commentId, req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comentario no encontrado' });

  db.prepare(`
    UPDATE audiovisual_comments SET deleted = 1, deleted_by = ?, deleted_at = datetime('now','localtime') WHERE id = ?
  `).run(req.user.id, req.params.commentId);

  res.json({ success: true, message: 'Comentario eliminado' });
});

// ─── GET /events/:id/comments/:commentId/download ───────
router.get('/events/:id/comments/:commentId/download', authMiddleware, (req, res) => {
  const file = db.prepare(`
    SELECT cf.* FROM audiovisual_comment_files cf
    JOIN audiovisual_comments c ON c.id = cf.comment_id
    WHERE cf.id = ? AND c.audiovisual_event_id = ?
  `).get(req.params.commentId, req.params.id);

  if (!file) return res.status(404).json({ error: 'Archivo no encontrado' });

  const filename = file.file_url.split('/').pop();
  const filePath = join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado en disco' });

  res.download(filePath, file.file_name || filename);
});

export default router;
