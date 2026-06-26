import { Router } from 'express';
import db from '../database.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, (req, res) => {
  const departments = db.prepare('SELECT * FROM departments ORDER BY name').all();
  res.json(departments);
});

router.post('/', authMiddleware, adminOnly, (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  try {
    const result = db.prepare('INSERT INTO departments (name, description) VALUES (?, ?)').run(name, description || null);
    res.status(201).json({ id: result.lastInsertRowid, name, description });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'El departamento ya existe' });
    throw e;
  }
});

router.put('/:id', authMiddleware, adminOnly, (req, res) => {
  const dept = db.prepare('SELECT id FROM departments WHERE id = ?').get(req.params.id);
  if (!dept) return res.status(404).json({ error: 'Departamento no encontrado' });
  const { name, description } = req.body;
  try {
    db.prepare("UPDATE departments SET name = COALESCE(?, name), description = COALESCE(?, description), updated_at = datetime('now','localtime') WHERE id = ?")
      .run(name || null, description !== undefined ? description : null, req.params.id);
    res.json({ message: 'Departamento actualizado' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'El nombre ya existe' });
    throw e;
  }
});

router.delete('/:id', authMiddleware, adminOnly, (req, res) => {
  const result = db.prepare('DELETE FROM departments WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Departamento no encontrado' });
  res.json({ message: 'Departamento eliminado' });
});

export default router;
