import { Router } from 'express';
import db from '../database.js';
import { authMiddleware } from '../middleware/auth.js';
import sanitizeHtml from 'sanitize-html';

const router = Router();

function sanitizeTemplate(body) {
  if (!body) return null;
  return sanitizeHtml(body, {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'strong', 'em', 'u', 's', 'sub', 'sup',
      'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'img', 'a', 'span', 'div',
      'blockquote', 'pre', 'code'
    ],
    allowedAttributes: {
      'img': ['src', 'alt', 'width', 'height', 'style'],
      'a': ['href', 'target', 'rel'],
      'span': ['style'],
      'div': ['style'],
      'p': ['style'],
      'td': ['colspan', 'rowspan', 'style'],
      'th': ['colspan', 'rowspan', 'style'],
      'h1': ['style'], 'h2': ['style'], 'h3': ['style'],
      'h4': ['style'], 'h5': ['style'], 'h6': ['style'],
      'strong': ['style'], 'em': ['style'], 'u': ['style'],
      'ul': ['style'], 'ol': ['style'], 'li': ['style'],
      'blockquote': ['style'], 'pre': ['style'], 'code': ['style']
    },
    allowedStyles: {
      '*': {
        'color': [/.*/],
        'background-color': [/.*/],
        'text-align': [/.*/],
        'font-size': [/.*/],
        'font-family': [/.*/],
        'text-decoration': [/.*/],
        'font-weight': [/.*/],
        'font-style': [/.*/],
        'margin': [/.*/],
        'padding': [/.*/],
        'border': [/.*/],
        'border-radius': [/.*/],
        'width': [/.*/],
        'height': [/.*/],
        'display': [/.*/],
        'line-height': [/.*/]
      }
    },
    disallowedTagsMode: 'discard',
    allowedSchemes: ['http', 'https', 'mailto', 'data']
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
