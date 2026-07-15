import { Router } from 'express';
import db from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

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
  const { employee_name, department_id, document_type_id, status, priority, notes, image_url, video_url } = req.body;

  if (!employee_name) {
    return res.status(400).json({ error: 'Nombre del empleado requerido' });
  }

  let folio, result;
  for (let attempt = 0; attempt < 5; attempt++) {
    folio = generateFolio();
    try {
      result = db.prepare(`
        INSERT INTO communications (folio, employee_name, department_id, document_type_id, status, priority, notes, image_url, video_url, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(folio, employee_name, department_id || null, document_type_id || null, status || 'asignado', priority || 'media', notes || null, image_url || null, video_url || null, req.user.id);
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

export default router;
