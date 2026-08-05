import { Router } from 'express';
import db from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

const VALID_STATUS = ['Pendiente', 'En preparacion', 'Completado', 'Cancelado'];

function validateBody(body) {
  const errors = [];
  if (body.status && !VALID_STATUS.includes(body.status)) {
    errors.push(`status debe ser uno de: ${VALID_STATUS.join(', ')}`);
  }
  if (body.presupuesto !== undefined && body.presupuesto !== null && body.presupuesto !== '' && parseFloat(body.presupuesto) < 0) {
    errors.push('El presupuesto no puede ser negativo');
  }
  return errors;
}

// ─── GET /upcoming — Próximos eventos ─────────────────────
router.get('/upcoming', authMiddleware, (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const items = db.prepare(`
    SELECT d.*, u.name AS created_by_name,
      p.company_name AS patrocinio_empresa
    FROM decoraciones d
    LEFT JOIN users u ON u.id = d.created_by
    LEFT JOIN patrocinios p ON p.id = d.patrocinio_id
    WHERE d.evento_fecha >= date('now','localtime') AND d.status != 'Cancelado'
    ORDER BY d.evento_fecha ASC, d.id ASC
    LIMIT ?
  `).all(limit);
  res.json(items);
});

// ─── GET /stats — Dashboard stats ─────────────────────────
router.get('/stats', authMiddleware, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM decoraciones').get().count;
  const pending = db.prepare("SELECT COUNT(*) as count FROM decoraciones WHERE status = 'Pendiente'").get().count;
  const inPreparation = db.prepare("SELECT COUNT(*) as count FROM decoraciones WHERE status = 'En preparacion'").get().count;
  const completed = db.prepare("SELECT COUNT(*) as count FROM decoraciones WHERE status = 'Completado'").get().count;
  const cancelled = db.prepare("SELECT COUNT(*) as count FROM decoraciones WHERE status = 'Cancelado'").get().count;
  const totalBudget = db.prepare("SELECT COALESCE(SUM(presupuesto), 0) as total FROM decoraciones WHERE status != 'Cancelado'").get().total;
  const todayEvents = db.prepare("SELECT COUNT(*) as count FROM decoraciones WHERE evento_fecha = date('now','localtime')").get().count;
  const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM decoraciones GROUP BY status').all();

  res.json({ total, pending, inPreparation, completed, cancelled, totalBudget, todayEvents, byStatus });
});

// ─── GET /calendar — Datos para calendario ─────────────────
router.get('/calendar', authMiddleware, (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const end = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  const items = db.prepare(`
    SELECT d.*, u.name AS created_by_name,
      p.company_name AS patrocinio_empresa
    FROM decoraciones d
    LEFT JOIN users u ON u.id = d.created_by
    LEFT JOIN patrocinios p ON p.id = d.patrocinio_id
    WHERE d.evento_fecha IS NOT NULL AND d.evento_fecha >= ? AND d.evento_fecha < ?
    ORDER BY d.evento_fecha ASC, d.id ASC
  `).all(start, end);

  res.json(items);
});

// ─── GET / — Lista paginada con búsqueda y filtros ─────────
router.get('/', authMiddleware, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';
  const status = req.query.status || '';
  const dateFrom = req.query.date_from || '';
  const dateTo = req.query.date_to || '';
  const patrocinioId = req.query.patrocinio_id || '';

  let where = [];
  const params = [];

  if (search) {
    where.push('(d.evento_nombre LIKE ? OR d.lugar LIKE ? OR d.tematica LIKE ? OR d.material_a_comprar LIKE ? OR d.proveedores LIKE ? OR d.alumno_asignado LIKE ? OR p.company_name LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s, s, s, s, s);
  }
  if (status) {
    where.push('d.status = ?');
    params.push(status);
  }
  if (dateFrom) {
    where.push('d.evento_fecha >= ?');
    params.push(dateFrom);
  }
  if (dateTo) {
    where.push('d.evento_fecha <= ?');
    params.push(dateTo);
  }
  if (patrocinioId) {
    where.push('d.patrocinio_id = ?');
    params.push(patrocinioId);
  }

  const whereStr = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM decoraciones d
    LEFT JOIN patrocinios p ON p.id = d.patrocinio_id
    ${whereStr}
  `).get(...params).count;

  const items = db.prepare(`
    SELECT d.*,
      creator.name AS created_by_name,
      editor.name AS updated_by_name,
      p.company_name AS patrocinio_empresa
    FROM decoraciones d
    LEFT JOIN users creator ON creator.id = d.created_by
    LEFT JOIN users editor ON editor.id = d.updated_by
    LEFT JOIN patrocinios p ON p.id = d.patrocinio_id
    ${whereStr}
    ORDER BY d.evento_fecha DESC, d.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({ items, total, page, totalPages: Math.ceil(total / limit) });
});

// ─── GET /:id — Detalle evento ─────────────────────────────
router.get('/:id', authMiddleware, (req, res) => {
  const item = db.prepare(`
    SELECT d.*,
      creator.name AS created_by_name,
      editor.name AS updated_by_name,
      p.company_name AS patrocinio_empresa,
      p.contact_person AS patrocinio_contacto,
      p.phone AS patrocinio_telefono,
      p.package AS patrocinio_paquete,
      p.payment_status AS patrocinio_pago_status
    FROM decoraciones d
    LEFT JOIN users creator ON creator.id = d.created_by
    LEFT JOIN users editor ON editor.id = d.updated_by
    LEFT JOIN patrocinios p ON p.id = d.patrocinio_id
    WHERE d.id = ?
  `).get(req.params.id);

  if (!item) return res.status(404).json({ error: 'Registro no encontrado' });
  res.json(item);
});

// ─── POST / — Crear evento ─────────────────────────────────
router.post('/', authMiddleware, (req, res) => {
  const errors = validateBody(req.body);
  if (errors.length > 0) return res.status(400).json({ error: 'Datos inválidos', details: errors });

  const { evento_nombre, evento_fecha, evento_hora, presupuesto, lugar, tematica, material_a_comprar, proveedores, alumno_asignado, observaciones, status, patrocinio_id } = req.body;

  if (!evento_nombre || !evento_nombre.trim()) return res.status(400).json({ error: 'Datos inválidos', details: ['El nombre del evento es obligatorio'] });

  const result = db.prepare(`
    INSERT INTO decoraciones (evento_nombre, evento_fecha, evento_hora, presupuesto, lugar, tematica, material_a_comprar, proveedores, alumno_asignado, observaciones, status, patrocinio_id, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    evento_nombre.trim(), evento_fecha || null, evento_hora || null,
    presupuesto || 0, lugar || null, tematica || null,
    material_a_comprar || null, proveedores || null,
    alumno_asignado || null, observaciones || null,
    status || 'Pendiente', patrocinio_id || null, req.user.id
  );

  res.status(201).json({ id: result.lastInsertRowid });
});

// ─── PUT /:id — Actualizar evento ──────────────────────────
router.put('/:id', authMiddleware, (req, res) => {
  const item = db.prepare('SELECT id FROM decoraciones WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Registro no encontrado' });

  const errors = validateBody(req.body);
  if (errors.length > 0) return res.status(400).json({ error: 'Datos inválidos', details: errors });

  const fields = ['evento_nombre', 'evento_fecha', 'evento_hora', 'presupuesto', 'lugar', 'tematica', 'material_a_comprar', 'proveedores', 'alumno_asignado', 'observaciones', 'status', 'patrocinio_id'];
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

  db.prepare(`UPDATE decoraciones SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ message: 'Registro actualizado' });
});

// ─── DELETE /:id — Eliminar evento ─────────────────────────
router.delete('/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM decoraciones WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Registro no encontrado' });
  res.json({ message: 'Registro eliminado' });
});

export default router;
