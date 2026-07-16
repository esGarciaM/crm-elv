import { Router } from 'express';
import db from '../database.js';
import { authMiddleware } from '../middleware/auth.js';
import sanitizeHtml from 'sanitize-html';

const router = Router();

function sanitizeTemplate(body) {
  if (!body) return null;
  return sanitizeHtml(body, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard'
  });
}

router.get('/', authMiddleware, (req, res) => {
  const types = db.prepare('SELECT * FROM document_types ORDER BY name').all();
  res.json(types);
});

router.post('/', authMiddleware, (req, res) => {
  const { name, is_client, template_body } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  const clean = sanitizeTemplate(template_body);
  try {
    const result = db.prepare('INSERT INTO document_types (name, is_client, template_body) VALUES (?, ?, ?)').run(name, is_client ? 1 : 0, clean);
    res.status(201).json({ id: result.lastInsertRowid, name, is_client: is_client ? 1 : 0, template_body: clean });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'El tipo de documento ya existe' });
    throw e;
  }
});

router.put('/:id', authMiddleware, (req, res) => {
  const doc = db.prepare('SELECT id FROM document_types WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Tipo de documento no encontrado' });
  const { name, is_client, template_body } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  const clean = sanitizeTemplate(template_body);
  try {
    db.prepare('UPDATE document_types SET name = ?, is_client = ?, template_body = ? WHERE id = ?').run(name, is_client ? 1 : 0, clean, req.params.id);
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
