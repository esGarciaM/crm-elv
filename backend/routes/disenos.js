import { Router } from 'express';
import db from '../database.js';
import { authMiddleware } from '../middleware/auth.js';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

const UPLOAD_DIR = join(__dirname, '..', 'uploads', 'disenos');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, `diseno-${randomUUID()}.${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const VALID_PRIORIDAD = ['MAXIMA', 'ALTA', 'MEDIA', 'BAJA'];
const VALID_STATUS = ['PENDIENTE', 'SE TRABAJA', 'EN REVISION', 'COMPLETADO', 'CANCELADO'];

function validateDiseno(body, isUpdate = false) {
  const errors = [];
  if (body.prioridad && !VALID_PRIORIDAD.includes(body.prioridad)) {
    errors.push(`prioridad debe ser uno de: ${VALID_PRIORIDAD.join(', ')}`);
  }
  if (body.status && !VALID_STATUS.includes(body.status)) {
    errors.push(`status debe ser uno de: ${VALID_STATUS.join(', ')}`);
  }
  if (body.costo !== undefined && body.costo !== null && body.costo < 0) {
    errors.push('costo no puede ser negativo');
  }
  if (body.liquidado !== undefined && body.liquidado !== null && (body.liquidado < 0 || body.liquidado > 1)) {
    errors.push('liquidado debe estar entre 0 y 1');
  }
  return errors;
}

// ─── GET / — Lista paginada con búsqueda ───
router.get('/', authMiddleware, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';
  const status = req.query.status || '';
  const prioridad = req.query.prioridad || '';

  let where = [];
  const params = [];

  if (search) {
    where.push('(d.descripcion_proyecto LIKE ? OR d.responsable_patrocinio LIKE ? OR d.responsable_diseno LIKE ? OR d.n_paquete LIKE ? OR d.comites_involucrados LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s, s, s);
  }
  if (status) {
    where.push('d.status = ?');
    params.push(status);
  }
  if (prioridad) {
    where.push('d.prioridad = ?');
    params.push(prioridad);
  }

  const whereStr = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const total = db.prepare(`SELECT COUNT(*) as count FROM disenos d ${whereStr}`).get(...params).count;
  const disenos = db.prepare(`
    SELECT d.*,
      creator.name AS created_by_name,
      editor.name AS updated_by_name,
      p.company_name AS patrocinio_empresa
    FROM disenos d
    LEFT JOIN users creator ON creator.id = d.created_by
    LEFT JOIN users editor ON editor.id = d.updated_by
    LEFT JOIN patrocinios p ON p.id = d.patrocinio_id
    ${whereStr}
    ORDER BY d.n_orden ASC, d.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({ disenos, total, page, totalPages: Math.ceil(total / limit) });
});

// ─── GET /stats — Estadísticas ───
router.get('/stats', authMiddleware, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM disenos').get().count;
  const byStatus = db.prepare("SELECT status, COUNT(*) as count FROM disenos WHERE status IS NOT NULL GROUP BY status").all();
  const byPrioridad = db.prepare("SELECT prioridad, COUNT(*) as count FROM disenos WHERE prioridad IS NOT NULL GROUP BY prioridad").all();
  const totalCosto = db.prepare("SELECT COALESCE(SUM(costo), 0) as total FROM disenos").get().total;
  const totalLiquidado = db.prepare("SELECT COALESCE(AVG(liquidado), 0) as avg FROM disenos").get().avg;

  res.json({ total, byStatus, byPrioridad, totalCosto, totalLiquidado: Math.round(totalLiquidado * 100) / 100 });
});

// ─── GET /:id — Detalle completo ───
router.get('/:id', authMiddleware, (req, res) => {
  const diseno = db.prepare(`
    SELECT d.*,
      creator.name AS created_by_name,
      editor.name AS updated_by_name,
      p.company_name AS patrocinio_empresa,
      p.contact_person AS patrocinio_contacto,
      p.phone AS patrocinio_telefono,
      p.package AS patrocinio_paquete,
      p.payment_status AS patrocinio_pago_status
    FROM disenos d
    LEFT JOIN users creator ON creator.id = d.created_by
    LEFT JOIN users editor ON editor.id = d.updated_by
    LEFT JOIN patrocinios p ON p.id = d.patrocinio_id
    WHERE d.id = ?
  `).get(req.params.id);

  if (!diseno) return res.status(404).json({ error: 'Diseño no encontrado' });

  const documents = db.prepare('SELECT * FROM patrocinio_documents WHERE patrocinio_id = ? ORDER BY created_at DESC').all(diseno.patrocinio_id);

  res.json({ ...diseno, documents });
});

// ─── POST / — Crear diseño ───
router.post('/', authMiddleware, (req, res) => {
  const errors = validateDiseno(req.body);
  if (errors.length > 0) return res.status(400).json({ error: 'Datos inválidos', details: errors });

  const {
    n_orden, n_paquete, descripcion_proyecto, responsable_patrocinio,
    fecha_inicio, fecha_vencimiento, prioridad, costo, liquidado,
    comites_involucrados, responsable_diseno, status, comentarios_extras,
    patrocinio_id
  } = req.body;

  const result = db.prepare(`
    INSERT INTO disenos (n_orden, n_paquete, descripcion_proyecto, responsable_patrocinio,
      fecha_inicio, fecha_vencimiento, prioridad, costo, liquidado,
      comites_involucrados, responsable_diseno, status, comentarios_extras,
      patrocinio_id, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    n_orden || null, n_paquete || null, descripcion_proyecto || null, responsable_patrocinio || null,
    fecha_inicio || null, fecha_vencimiento || null, prioridad || null,
    costo || 0, liquidado || 0,
    comites_involucrados || null, responsable_diseno || null,
    status || 'PENDIENTE', comentarios_extras || null,
    patrocinio_id || null, req.user.id
  );

  res.status(201).json({ id: result.lastInsertRowid });
});

// ─── PUT /:id — Actualizar diseño ───
router.put('/:id', authMiddleware, (req, res) => {
  const diseno = db.prepare('SELECT id FROM disenos WHERE id = ?').get(req.params.id);
  if (!diseno) return res.status(404).json({ error: 'Diseño no encontrado' });

  const errors = validateDiseno(req.body, true);
  if (errors.length > 0) return res.status(400).json({ error: 'Datos inválidos', details: errors });

  const fields = [
    'n_orden', 'n_paquete', 'descripcion_proyecto', 'responsable_patrocinio',
    'fecha_inicio', 'fecha_vencimiento', 'prioridad', 'costo', 'liquidado',
    'comites_involucrados', 'responsable_diseno', 'status', 'comentarios_extras',
    'patrocinio_id'
  ];

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

  db.prepare(`UPDATE disenos SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ message: 'Diseño actualizado' });
});

// ─── DELETE /:id — Eliminar diseño ───
router.delete('/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM disenos WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Diseño no encontrado' });
  res.json({ message: 'Diseño eliminado' });
});

// ─── GET /patrocinios/search — Buscar patrocinios para vincular ───
router.get('/patrocinios/search', authMiddleware, (req, res) => {
  const search = req.query.search || '';
  let patrocinios;
  if (search) {
    const s = `%${search}%`;
    patrocinios = db.prepare(`
      SELECT id, company_name, contact_person, package, payment_status
      FROM patrocinios
      WHERE company_name LIKE ? OR contact_person LIKE ?
      ORDER BY company_name LIMIT 20
    `).all(s, s);
  } else {
    patrocinios = db.prepare(`
      SELECT id, company_name, contact_person, package, payment_status
      FROM patrocinios ORDER BY company_name LIMIT 20
    `).all();
  }
  res.json(patrocinios);
});

export default router;
