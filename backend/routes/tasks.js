import { Router } from 'express';
import db from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, (req, res) => {
  const { status, assigned_to, client_id } = req.query;
  let where = [];
  const params = [];

  if (status) { where.push('t.status = ?'); params.push(status); }
  if (assigned_to) { where.push('t.assigned_to = ?'); params.push(assigned_to); }
  if (client_id) { where.push('t.client_id = ?'); params.push(client_id); }

  if (req.user.role === 'user') {
    where.push('(t.assigned_to = ? OR t.created_by = ?)');
    params.push(req.user.id, req.user.id);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const tasks = db.prepare(`
    SELECT t.*, u.name as assigned_name, c.company_name as client_name,
      creator.name as created_by_name
    FROM tasks t
    LEFT JOIN users u ON t.assigned_to = u.id
    LEFT JOIN clients c ON t.client_id = c.id
    LEFT JOIN users creator ON t.created_by = creator.id
    ${whereClause}
    ORDER BY t.created_at DESC
  `).all(...params);

  res.json(tasks);
});

router.post('/', authMiddleware, (req, res) => {
  const { title, description, priority, due_date, client_id, assigned_to } = req.body;
  if (!title) return res.status(400).json({ error: 'Título requerido' });

  const result = db.prepare(`
    INSERT INTO tasks (title, description, priority, due_date, client_id, assigned_to, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, description || '', priority || 'medium', due_date || null, client_id || null, assigned_to || null, req.user.id);

  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', authMiddleware, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Tarea no encontrada' });

  const fields = ['title', 'description', 'status', 'priority', 'due_date', 'client_id', 'assigned_to'];
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
  db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ message: 'Tarea actualizada' });
});

router.post('/:id/comments', authMiddleware, (req, res) => {
  const { comment } = req.body;
  if (!comment) return res.status(400).json({ error: 'Comentario requerido' });

  const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Tarea no encontrada' });

  db.prepare('INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, ?, ?)').run(req.params.id, req.user.id, comment);
  res.status(201).json({ message: 'Comentario agregado' });
});

router.get('/:id/comments', authMiddleware, (req, res) => {
  const comments = db.prepare(`
    SELECT tc.*, u.name as user_name
    FROM task_comments tc
    LEFT JOIN users u ON tc.user_id = u.id
    WHERE tc.task_id = ?
    ORDER BY tc.created_at ASC
  `).all(req.params.id);
  res.json(comments);
});

router.delete('/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Tarea no encontrada' });
  res.json({ message: 'Tarea eliminada' });
});

export default router;
