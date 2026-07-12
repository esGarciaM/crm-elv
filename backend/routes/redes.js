import { Router } from 'express';
import db from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

const VALID_ESTADO = ['completo', 'en progreso', 'incompleto'];
const VALID_POST = ['SI', 'No', 'en diseño'];
const VALID_REELS = ['grabados', 'editando', 'programados', 'no aplica'];

function validateRed(body) {
  const errors = [];
  if (body.estado && !VALID_ESTADO.includes(body.estado)) {
    errors.push(`estado debe ser uno de: ${VALID_ESTADO.join(', ')}`);
  }
  if (body.post_programados && !VALID_POST.includes(body.post_programados)) {
    errors.push(`post_programados debe ser uno de: ${VALID_POST.join(', ')}`);
  }
  if (body.reels && !VALID_REELS.includes(body.reels)) {
    errors.push(`reels debe ser uno de: ${VALID_REELS.join(', ')}`);
  }
  return errors;
}

// ─── GET / — Lista paginada con búsqueda y filtros ───
router.get('/', authMiddleware, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';
  const estado = req.query.estado || '';
  const post_programados = req.query.post_programados || '';
  const reels = req.query.reels || '';

  let where = [];
  const params = [];

  if (search) {
    where.push('(r.folio LIKE ? OR r.empresa_nombre LIKE ? OR r.responsable LIKE ? OR r.actividad LIKE ? OR r.observaciones LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s, s, s);
  }
  if (estado) {
    where.push('r.estado = ?');
    params.push(estado);
  }
  if (post_programados) {
    where.push('r.post_programados = ?');
    params.push(post_programados);
  }
  if (reels) {
    where.push('r.reels = ?');
    params.push(reels);
  }

  const whereStr = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const total = db.prepare(`SELECT COUNT(*) as count FROM redes r ${whereStr}`).get(...params).count;
  const items = db.prepare(`
    SELECT r.*,
      creator.name AS created_by_name,
      editor.name AS updated_by_name,
      p.company_name AS patrocinio_empresa
    FROM redes r
    LEFT JOIN users creator ON creator.id = r.created_by
    LEFT JOIN users editor ON editor.id = r.updated_by
    LEFT JOIN patrocinios p ON p.id = r.patrocinio_id
    ${whereStr}
    ORDER BY r.folio ASC, r.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({ redes: items, total, page, totalPages: Math.ceil(total / limit) });
});

// ─── GET /stats — Estadísticas ───
router.get('/stats', authMiddleware, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM redes').get().count;
  const byEstado = db.prepare("SELECT estado, COUNT(*) as count FROM redes WHERE estado IS NOT NULL GROUP BY estado").all();
  const byPost = db.prepare("SELECT post_programados, COUNT(*) as count FROM redes WHERE post_programados IS NOT NULL GROUP BY post_programados").all();
  const byReels = db.prepare("SELECT reels, COUNT(*) as count FROM redes WHERE reels IS NOT NULL GROUP BY reels").all();

  res.json({ total, byEstado, byPost, byReels });
});

// ─── GET /:id — Detalle ───
router.get('/:id', authMiddleware, (req, res) => {
  const item = db.prepare(`
    SELECT r.*,
      creator.name AS created_by_name,
      editor.name AS updated_by_name,
      p.company_name AS patrocinio_empresa,
      p.contact_person AS patrocinio_contacto,
      p.phone AS patrocinio_telefono
    FROM redes r
    LEFT JOIN users creator ON creator.id = r.created_by
    LEFT JOIN users editor ON editor.id = r.updated_by
    LEFT JOIN patrocinios p ON p.id = r.patrocinio_id
    WHERE r.id = ?
  `).get(req.params.id);

  if (!item) return res.status(404).json({ error: 'Registro no encontrado' });
  res.json(item);
});

// ─── POST / — Crear ───
router.post('/', authMiddleware, (req, res) => {
  const errors = validateRed(req.body);
  if (errors.length > 0) return res.status(400).json({ error: 'Datos inválidos', details: errors });

  const { folio, empresa_nombre, responsable, actividad, fecha_inicio, fecha_limite, estado, post_programados, reels, observaciones, patrocinio_id } = req.body;

  const result = db.prepare(`
    INSERT INTO redes (folio, empresa_nombre, responsable, actividad, fecha_inicio, fecha_limite, estado, post_programados, reels, observaciones, patrocinio_id, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    folio || null, empresa_nombre || null, responsable || null, actividad || null,
    fecha_inicio || null, fecha_limite || null, estado || 'incompleto',
    post_programados || null, reels || null, observaciones || null,
    patrocinio_id || null, req.user.id
  );

  res.status(201).json({ id: result.lastInsertRowid });
});

// ─── PUT /:id — Actualizar ───
router.put('/:id', authMiddleware, (req, res) => {
  const item = db.prepare('SELECT id FROM redes WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Registro no encontrado' });

  const errors = validateRed(req.body);
  if (errors.length > 0) return res.status(400).json({ error: 'Datos inválidos', details: errors });

  const fields = ['folio', 'empresa_nombre', 'responsable', 'actividad', 'fecha_inicio', 'fecha_limite', 'estado', 'post_programados', 'reels', 'observaciones', 'patrocinio_id'];

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

  db.prepare(`UPDATE redes SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ message: 'Registro actualizado' });
});

// ─── DELETE /:id — Eliminar ───
router.delete('/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM redes WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Registro no encontrado' });
  res.json({ message: 'Registro eliminado' });
});

export default router;
