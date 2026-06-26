import { Router } from 'express';
import db from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, (req, res) => {
  const types = db.prepare('SELECT * FROM document_types ORDER BY name').all();
  res.json(types);
});

router.post('/', authMiddleware, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  try {
    const result = db.prepare('INSERT INTO document_types (name) VALUES (?)').run(name);
    res.status(201).json({ id: result.lastInsertRowid, name });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'El tipo de documento ya existe' });
    throw e;
  }
});

router.put('/:id', authMiddleware, (req, res) => {
  const doc = db.prepare('SELECT id FROM document_types WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Tipo de documento no encontrado' });
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  try {
    db.prepare('UPDATE document_types SET name = ? WHERE id = ?').run(name, req.params.id);
    res.json({ message: 'Tipo de documento actualizado' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'El nombre ya existe' });
    throw e;
  }
});

router.delete('/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM document_types WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Tipo de documento no encontrado' });
  res.json({ message: 'Tipo de documento eliminado' });
});

export default router;
