import { Router } from 'express';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import db from '../database.js';

const router = Router();

router.get('/', authMiddleware, (req, res) => {
  const statuses = db.prepare('SELECT * FROM sponsor_statuses ORDER BY sort_order ASC').all();
  res.json(statuses);
});

router.post('/', authMiddleware, adminOnly, (req, res) => {
  const { name, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  
  try {
    const result = db.prepare('INSERT INTO sponsor_statuses (name, sort_order) VALUES (?, ?)').run(name, sort_order || 0);
    const status = db.prepare('SELECT * FROM sponsor_statuses WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(status);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'El nombre del status ya existe' });
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', authMiddleware, adminOnly, (req, res) => {
  const { name, sort_order } = req.body;
  try {
    db.prepare('UPDATE sponsor_statuses SET name = COALESCE(?, name), sort_order = COALESCE(?, sort_order), updated_at = datetime(\'now\',\'localtime\') WHERE id = ?').run(name, sort_order, req.params.id);
    const status = db.prepare('SELECT * FROM sponsor_statuses WHERE id = ?').get(req.params.id);
    if (!status) return res.status(404).json({ error: 'Status no encontrado' });
    res.json(status);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'El nombre del status ya existe' });
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', authMiddleware, adminOnly, (req, res) => {
  const result = db.prepare('DELETE FROM sponsor_statuses WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Status no encontrado' });
  res.json({ message: 'Status eliminado' });
});

export default router;
