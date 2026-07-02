import express from 'express';
import db from '../database.js';
import { authMiddleware } from '../middleware/auth.js';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const UPLOAD_DIR = join(__dirname, '..', 'uploads', 'seguimiento');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, `seguimiento-${randomUUID()}.${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB

const router = express.Router();

// ──────────────────────────────────────────────────
// GET /api/patrocinios/:id/seguimiento
// Full tracking data: patrocinio + checklist + comments
// ──────────────────────────────────────────────────
router.get('/patrocinios/:id/seguimiento', authMiddleware, (req, res) => {
  const { id } = req.params;

  const patrocinio = db.prepare('SELECT * FROM patrocinios WHERE id = ?').get(id);
  if (!patrocinio) return res.status(404).json({ error: 'Patrocinio no encontrado' });

  let packageInfo = null;
  let items = [];
  let completedItemIds = [];

  if (patrocinio.package) {
    packageInfo = db.prepare('SELECT * FROM packages WHERE name = ?').get(patrocinio.package);
    if (packageInfo) {
      items = db.prepare(`
        SELECT pci.*, pc.completed, pc.completed_at
        FROM package_checklist_items pci
        JOIN package_checklist pc2 ON pc2.item_id = pci.id
        LEFT JOIN patrocinio_checklist pc ON pc.item_id = pci.id AND pc.patrocinio_id = ?
        WHERE pc2.package_id = ?
        ORDER BY pci.sort_order
      `).all(id, packageInfo.id);

      items = items.map(i => ({
        ...i,
        completed: !!i.completed
      }));

      completedItemIds = items.filter(i => i.completed).map(i => i.id);
    }
  }

  const comments = db.prepare(`
    SELECT c.*, u.name as created_by_name, del.name as deleted_by_name
    FROM patrocinio_comments c
    LEFT JOIN users u ON u.id = c.created_by
    LEFT JOIN users del ON del.id = c.deleted_by
    WHERE c.patrocinio_id = ?
    ORDER BY c.created_at ASC
  `).all(id);

  res.json({ patrocinio, package: packageInfo, items, completedItemIds, comments });
});

// ──────────────────────────────────────────────────
// PUT /api/patrocinios/:id/seguimiento/checklist
// Toggle a checklist item's completion status
// ──────────────────────────────────────────────────
router.put('/patrocinios/:id/seguimiento/checklist', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { item_id, completed } = req.body;

  const existing = db.prepare(
    'SELECT id FROM patrocinio_checklist WHERE patrocinio_id = ? AND item_id = ?'
  ).get(id, item_id);

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
    `).run(id, item_id, completed ? 1 : 0, completed ? 1 : 0);
  }

  res.json({ success: true });
});

// ──────────────────────────────────────────────────
// POST /api/patrocinios/:id/seguimiento/comments
// Add a comment + optional file to the timeline
// ──────────────────────────────────────────────────
router.post('/patrocinios/:id/seguimiento/comments', authMiddleware, upload.single('file'), (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;
  const userId = req.user.id;

  if ((!comment || !comment.trim()) && !req.file) {
    return res.status(400).json({ error: 'Debes escribir un comentario o adjuntar un archivo' });
  }

  const fileUrl = req.file ? `/uploads/seguimiento/${req.file.filename}` : null;
  const fileName = req.file ? req.file.originalname : null;

  const result = db.prepare(
    'INSERT INTO patrocinio_comments (patrocinio_id, comment, created_by, file_url, file_name) VALUES (?, ?, ?, ?, ?)'
  ).run(id, (comment || '').trim(), userId, fileUrl, fileName);

  const newComment = db.prepare(`
    SELECT c.*, u.name as created_by_name, del.name as deleted_by_name
    FROM patrocinio_comments c
    LEFT JOIN users u ON u.id = c.created_by
    LEFT JOIN users del ON del.id = c.deleted_by
    WHERE c.id = ?
  `).get(result.lastInsertRowid);

  res.json(newComment);
});

// ──────────────────────────────────────────────────
// DELETE /api/patrocinios/:id/seguimiento/comments/:commentId
// Soft-delete a comment (admin only)
// ──────────────────────────────────────────────────
router.delete('/patrocinios/:id/seguimiento/comments/:commentId', authMiddleware, (req, res) => {
  const { id, commentId } = req.params;

  // Only admins can delete
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo los administradores pueden eliminar comentarios' });
  }

  const comment = db.prepare('SELECT * FROM patrocinio_comments WHERE id = ? AND patrocinio_id = ?').get(commentId, id);
  if (!comment) return res.status(404).json({ error: 'Comentario no encontrado' });

  // Soft delete
  db.prepare(`
    UPDATE patrocinio_comments
    SET deleted = 1, deleted_by = ?, deleted_at = datetime('now','localtime')
    WHERE id = ?
  `).run(req.user.id, commentId);

  res.json({ success: true, message: 'Comentario eliminado' });
});

// ──────────────────────────────────────────────────
// GET /api/patrocinios/:id/seguimiento/comments/:commentId/download
// Download a file attached to a comment
// ──────────────────────────────────────────────────
router.get('/patrocinios/:id/seguimiento/comments/:commentId/download', authMiddleware, (req, res) => {
  const comment = db.prepare('SELECT * FROM patrocinio_comments WHERE id = ? AND patrocinio_id = ?')
    .get(req.params.commentId, req.params.id);
  if (!comment || !comment.file_url) return res.status(404).json({ error: 'Archivo no encontrado' });

  const filename = comment.file_url.split('/').pop();
  const filePath = join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado en disco' });

  res.download(filePath, comment.file_name || filename);
});

export default router;
