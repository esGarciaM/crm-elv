import { Router } from 'express';
import multer from 'multer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import fs from 'fs';
import db from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadDir = join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, `${randomUUID()}.${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf', 'image/jpeg', 'image/png', 'image/gif',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv'
    ];
    cb(null, allowed.includes(file.mimetype));
  }
});

const router = Router();

router.get('/client/:clientId', authMiddleware, (req, res) => {
  const docs = db.prepare(`
    SELECT d.*, u.name as uploaded_by_name
    FROM documents d LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE d.client_id = ? ORDER BY d.created_at DESC
  `).all(req.params.clientId);
  res.json(docs);
});

router.get('/client/:clientId/public', authMiddleware, (req, res) => {
  const docs = db.prepare(`
    SELECT d.*, u.name as uploaded_by_name
    FROM documents d LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE d.client_id = ? AND d.visibility = 'public'
    ORDER BY d.created_at DESC
  `).all(req.params.clientId);
  res.json(docs);
});

router.post('/upload/:clientId', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Archivo requerido o formato no soportado' });

  const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(req.params.clientId);
  if (!client) {
    fs.unlinkSync(req.file.path);
    return res.status(404).json({ error: 'Cliente no encontrado' });
  }

  const result = db.prepare(`
    INSERT INTO documents (client_id, name, original_name, mime_type, size, visibility, uploaded_by, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.params.clientId,
    req.file.filename,
    req.file.originalname,
    req.file.mimetype,
    req.file.size,
    req.body.visibility || 'private',
    req.user.id,
    req.body.category || 'general'
  );

  res.status(201).json({ id: result.lastInsertRowid, name: req.file.filename, original_name: req.file.originalname, mime_type: req.file.mimetype, size: req.file.size, visibility: req.body.visibility || 'private' });
});

router.patch('/:id/visibility', authMiddleware, (req, res) => {
  const { visibility } = req.body;
  if (!['public', 'private'].includes(visibility)) return res.status(400).json({ error: 'Visibilidad inválida' });
  const doc = db.prepare('SELECT id FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
  db.prepare('UPDATE documents SET visibility = ? WHERE id = ?').run(visibility, req.params.id);
  res.json({ message: 'Visibilidad actualizada' });
});

router.get('/download/:id', authMiddleware, (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });

  const filePath = join(uploadDir, doc.name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado en disco' });

  res.setHeader('Content-Type', doc.mime_type);
  res.setHeader('Content-Disposition', `inline; filename="${doc.original_name}"`);
  res.sendFile(filePath);
});

router.delete('/:id', authMiddleware, (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });

  const filePath = join(uploadDir, doc.name);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  res.json({ message: 'Documento eliminado' });
});

// ── Document comments ──
router.get('/:id/comments', authMiddleware, (req, res) => {
  const comments = db.prepare(`
    SELECT dc.*, u.name as user_name, u.role as user_role
    FROM document_comments dc
    LEFT JOIN users u ON dc.user_id = u.id
    WHERE dc.document_id = ?
    ORDER BY dc.created_at ASC
  `).all(req.params.id);
  res.json(comments);
});

router.post('/:id/comments', authMiddleware, (req, res) => {
  const { comment } = req.body;
  if (!comment) return res.status(400).json({ error: 'Comentario requerido' });
  const doc = db.prepare('SELECT id FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
  db.prepare('INSERT INTO document_comments (document_id, user_id, comment) VALUES (?, ?, ?)').run(req.params.id, req.user.id, comment);
  res.status(201).json({ message: 'Comentario agregado' });
});

export default router;
