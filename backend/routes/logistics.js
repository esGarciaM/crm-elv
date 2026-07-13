import { Router } from 'express';
import db from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

const VALID_STATUS = ['Pendiente', 'En curso', 'Completo', 'Cancelado'];

function validateBody(body) {
  const errors = [];
  if (body.status && !VALID_STATUS.includes(body.status)) {
    errors.push(`status debe ser uno de: ${VALID_STATUS.join(', ')}`);
  }
  if (body.start_date && body.end_date && body.end_date < body.start_date) {
    errors.push('La fecha de fin no puede ser menor a la fecha de inicio');
  }
  return errors;
}

// ─── GET /types — Catálogo de tipos ────────────────────────
router.get('/types', authMiddleware, (req, res) => {
  const types = db.prepare('SELECT * FROM logistics_types ORDER BY id').all();
  res.json(types);
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
    SELECT l.*, lt.name AS type_name, lt.color AS type_color, lt.icon AS type_icon,
      u.name AS responsible_name
    FROM logistics l
    LEFT JOIN logistics_types lt ON lt.id = l.type_id
    LEFT JOIN users u ON u.id = l.responsible_id
    WHERE l.start_date < ? AND (l.end_date >= ? OR l.end_date IS NULL)
    ORDER BY l.start_date ASC
  `).all(end, start);

  res.json(items);
});

// ─── GET /upcoming — Próximas actividades ──────────────────
router.get('/upcoming', authMiddleware, (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const items = db.prepare(`
    SELECT l.*, lt.name AS type_name, lt.color AS type_color, lt.icon AS type_icon,
      u.name AS responsible_name
    FROM logistics l
    LEFT JOIN logistics_types lt ON lt.id = l.type_id
    LEFT JOIN users u ON u.id = l.responsible_id
    WHERE l.start_date >= date('now','localtime') AND l.status != 'Cancelado'
    ORDER BY l.start_date ASC
    LIMIT ?
  `).all(limit);
  res.json(items);
});

// ─── GET /stats — Dashboard stats ─────────────────────────
router.get('/stats', authMiddleware, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM logistics').get().count;
  const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM logistics GROUP BY status').all();
  const byType = db.prepare(`
    SELECT lt.name, lt.color, COUNT(l.id) as count
    FROM logistics_types lt
    LEFT JOIN logistics l ON l.type_id = lt.id
    GROUP BY lt.id
    ORDER BY lt.id
  `).all();
  const pending = db.prepare("SELECT COUNT(*) as count FROM logistics WHERE status = 'Pendiente'").get().count;
  const inProgress = db.prepare("SELECT COUNT(*) as count FROM logistics WHERE status = 'En curso'").get().count;
  const completed = db.prepare("SELECT COUNT(*) as count FROM logistics WHERE status = 'Completo'").get().count;
  const cancelled = db.prepare("SELECT COUNT(*) as count FROM logistics WHERE status = 'Cancelado'").get().count;

  res.json({ total, byStatus, byType, pending, inProgress, completed, cancelled });
});

// ─── GET / — Lista paginada con búsqueda y filtros ─────────
router.get('/', authMiddleware, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';
  const typeId = req.query.type_id || '';
  const status = req.query.status || '';
  const responsibleId = req.query.responsible_id || '';
  const dateFrom = req.query.date_from || '';
  const dateTo = req.query.date_to || '';

  let where = [];
  const params = [];

  if (search) {
    where.push('(l.title LIKE ? OR l.description LIKE ? OR u.name LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  if (typeId) {
    where.push('l.type_id = ?');
    params.push(typeId);
  }
  if (status) {
    where.push('l.status = ?');
    params.push(status);
  }
  if (responsibleId) {
    where.push('l.responsible_id = ?');
    params.push(responsibleId);
  }
  if (dateFrom) {
    where.push('l.start_date >= ?');
    params.push(dateFrom);
  }
  if (dateTo) {
    where.push('l.start_date <= ?');
    params.push(dateTo);
  }

  const whereStr = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM logistics l
    LEFT JOIN users u ON u.id = l.responsible_id
    ${whereStr}
  `).get(...params).count;

  const items = db.prepare(`
    SELECT l.*, lt.name AS type_name, lt.color AS type_color, lt.icon AS type_icon,
      u.name AS responsible_name,
      creator.name AS created_by_name,
      editor.name AS updated_by_name
    FROM logistics l
    LEFT JOIN logistics_types lt ON lt.id = l.type_id
    LEFT JOIN users u ON u.id = l.responsible_id
    LEFT JOIN users creator ON creator.id = l.created_by
    LEFT JOIN users editor ON editor.id = l.updated_by
    ${whereStr}
    ORDER BY l.start_date DESC, l.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({ items, total, page, totalPages: Math.ceil(total / limit) });
});

// ═══════════════════════════════════════════════════════════
// ─── FLIGHTS ENDPOINTS ──────────────────────────────────
// ═══════════════════════════════════════════════════════════

const VALID_FLIGHT_STATUS = ['Programado', 'Confirmado', 'En viaje', 'Finalizado', 'Cancelado'];

function validateFlight(body) {
  const errors = [];
  if (body.status && !VALID_FLIGHT_STATUS.includes(body.status)) {
    errors.push(`status debe ser uno de: ${VALID_FLIGHT_STATUS.join(', ')}`);
  }
  if (body.flight_price !== undefined && body.flight_price !== null && body.flight_price !== '' && parseFloat(body.flight_price) < 0) {
    errors.push('El precio no puede ser negativo');
  }
  if (body.departure_date && body.return_date && body.return_date < body.departure_date) {
    errors.push('La fecha de regreso no puede ser anterior a la de salida');
  }
  return errors;
}

// ─── GET /flights/upcoming — Próximos vuelos ────────────
router.get('/flights/upcoming', authMiddleware, (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const items = db.prepare(`
    SELECT f.*, u.name AS speaker_name,
      creator.name AS created_by_name
    FROM logistics_flights f
    LEFT JOIN users u ON u.id = f.speaker_id
    LEFT JOIN users creator ON creator.id = f.created_by
    WHERE f.departure_date >= date('now','localtime') AND f.status != 'Cancelado'
    ORDER BY f.departure_date ASC, f.departure_time ASC
    LIMIT ?
  `).all(limit);
  res.json(items);
});

// ─── GET /flights/stats — Dashboard vuelos ──────────────
router.get('/flights/stats', authMiddleware, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM logistics_flights').get().count;
  const pending = db.prepare("SELECT COUNT(*) as count FROM logistics_flights WHERE status = 'Programado'").get().count;
  const confirmed = db.prepare("SELECT COUNT(*) as count FROM logistics_flights WHERE status = 'Confirmado'").get().count;
  const inTrip = db.prepare("SELECT COUNT(*) as count FROM logistics_flights WHERE status = 'En viaje'").get().count;
  const finished = db.prepare("SELECT COUNT(*) as count FROM logistics_flights WHERE status = 'Finalizado'").get().count;
  const cancelled = db.prepare("SELECT COUNT(*) as count FROM logistics_flights WHERE status = 'Cancelado'").get().count;
  const totalSpent = db.prepare("SELECT COALESCE(SUM(flight_price), 0) as total FROM logistics_flights WHERE status != 'Cancelado'").get().total;
  const todayFlights = db.prepare("SELECT COUNT(*) as count FROM logistics_flights WHERE departure_date = date('now','localtime')").get().count;
  const bySpeaker = db.prepare(`
    SELECT u.name, COUNT(f.id) as count, COALESCE(SUM(f.flight_price), 0) as total_spent
    FROM logistics_flights f
    LEFT JOIN users u ON u.id = f.speaker_id
    WHERE f.status != 'Cancelado'
    GROUP BY f.speaker_id
    ORDER BY count DESC
  `).all();
  const byDestination = db.prepare(`
    SELECT destination, COUNT(*) as count
    FROM logistics_flights
    WHERE destination IS NOT NULL AND destination != '' AND status != 'Cancelado'
    GROUP BY destination
    ORDER BY count DESC
    LIMIT 5
  `).all();

  res.json({ total, pending, confirmed, inTrip, finished, cancelled, totalSpent, todayFlights, bySpeaker, byDestination });
});

// ─── GET /flights/calendar — Vuelos para calendario ─────
router.get('/flights/calendar', authMiddleware, (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const end = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  const items = db.prepare(`
    SELECT f.*, u.name AS speaker_name
    FROM logistics_flights f
    LEFT JOIN users u ON u.id = f.speaker_id
    WHERE f.departure_date < ? AND (f.return_date >= ? OR f.return_date IS NULL OR f.return_date = '')
    ORDER BY f.departure_date ASC
  `).all(end, start);

  res.json(items);
});

// ─── GET /flights — Lista paginada con búsqueda y filtros
router.get('/flights', authMiddleware, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';
  const status = req.query.status || '';
  const speakerId = req.query.speaker_id || '';
  const origin = req.query.origin || '';
  const destination = req.query.destination || '';
  const dateFrom = req.query.date_from || '';
  const dateTo = req.query.date_to || '';

  let where = [];
  const params = [];

  if (search) {
    where.push('(u.name LIKE ? OR f.origin LIKE ? OR f.destination LIKE ? OR f.observations LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  if (status) {
    where.push('f.status = ?');
    params.push(status);
  }
  if (speakerId) {
    where.push('f.speaker_id = ?');
    params.push(speakerId);
  }
  if (origin) {
    where.push('f.origin LIKE ?');
    params.push(`%${origin}%`);
  }
  if (destination) {
    where.push('f.destination LIKE ?');
    params.push(`%${destination}%`);
  }
  if (dateFrom) {
    where.push('f.departure_date >= ?');
    params.push(dateFrom);
  }
  if (dateTo) {
    where.push('f.departure_date <= ?');
    params.push(dateTo);
  }

  const whereStr = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM logistics_flights f
    LEFT JOIN users u ON u.id = f.speaker_id
    ${whereStr}
  `).get(...params).count;

  const items = db.prepare(`
    SELECT f.*, u.name AS speaker_name,
      creator.name AS created_by_name,
      editor.name AS updated_by_name
    FROM logistics_flights f
    LEFT JOIN users u ON u.id = f.speaker_id
    LEFT JOIN users creator ON creator.id = f.created_by
    LEFT JOIN users editor ON editor.id = f.updated_by
    ${whereStr}
    ORDER BY f.departure_date DESC, f.departure_time DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({ items, total, page, totalPages: Math.ceil(total / limit) });
});

// ─── GET /flights/:id — Detalle vuelo ───────────────────
router.get('/flights/:id', authMiddleware, (req, res) => {
  const item = db.prepare(`
    SELECT f.*, u.name AS speaker_name,
      creator.name AS created_by_name,
      editor.name AS updated_by_name
    FROM logistics_flights f
    LEFT JOIN users u ON u.id = f.speaker_id
    LEFT JOIN users creator ON creator.id = f.created_by
    LEFT JOIN users editor ON editor.id = f.updated_by
    WHERE f.id = ?
  `).get(req.params.id);

  if (!item) return res.status(404).json({ error: 'Registro no encontrado' });
  res.json(item);
});

// ─── POST /flights — Crear vuelo ────────────────────────
router.post('/flights', authMiddleware, (req, res) => {
  const errors = validateFlight(req.body);
  if (errors.length > 0) return res.status(400).json({ error: 'Datos inválidos', details: errors });

  const { speaker_id, departure_date, departure_time, origin, arrival_date, arrival_time, destination, return_date, return_time, pickup_time, flight_price, status, observations } = req.body;

  if (!speaker_id) return res.status(400).json({ error: 'Datos inválidos', details: ['El conferencista es obligatorio'] });
  if (!departure_date) return res.status(400).json({ error: 'Datos inválidos', details: ['La fecha de abordaje es obligatoria'] });
  if (!departure_time) return res.status(400).json({ error: 'Datos inválidos', details: ['La hora de abordaje es obligatoria'] });
  if (!origin) return res.status(400).json({ error: 'Datos inválidos', details: ['El lugar de origen es obligatorio'] });
  if (!destination) return res.status(400).json({ error: 'Datos inválidos', details: ['El lugar de destino es obligatorio'] });

  const result = db.prepare(`
    INSERT INTO logistics_flights (speaker_id, departure_date, departure_time, origin, arrival_date, arrival_time, destination, return_date, return_time, pickup_time, flight_price, status, observations, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    speaker_id, departure_date, departure_time, origin || null,
    arrival_date || null, arrival_time || null, destination || null,
    return_date || null, return_time || null, pickup_time || null,
    flight_price || 0, status || 'Programado', observations || null,
    req.user.id
  );

  res.status(201).json({ id: result.lastInsertRowid });
});

// ─── PUT /flights/:id — Actualizar vuelo ────────────────
router.put('/flights/:id', authMiddleware, (req, res) => {
  const item = db.prepare('SELECT id FROM logistics_flights WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Registro no encontrado' });

  const errors = validateFlight(req.body);
  if (errors.length > 0) return res.status(400).json({ error: 'Datos inválidos', details: errors });

  const fields = ['speaker_id', 'departure_date', 'departure_time', 'origin', 'arrival_date', 'arrival_time', 'destination', 'return_date', 'return_time', 'pickup_time', 'flight_price', 'status', 'observations'];
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

  db.prepare(`UPDATE logistics_flights SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ message: 'Registro actualizado' });
});

// ─── DELETE /flights/:id — Eliminar vuelo ───────────────
router.delete('/flights/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM logistics_flights WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Registro no encontrado' });
  res.json({ message: 'Registro eliminado' });
});

// ═══════════════════════════════════════════════════════════
// ─── ACTIVITY ENDPOINTS ─────────────────────────────────
// ═══════════════════════════════════════════════════════════

// ─── GET /:id — Detalle ───────────────────────────────────
router.get('/:id', authMiddleware, (req, res) => {
  const item = db.prepare(`
    SELECT l.*, lt.name AS type_name, lt.color AS type_color, lt.icon AS type_icon,
      u.name AS responsible_name,
      creator.name AS created_by_name,
      editor.name AS updated_by_name
    FROM logistics l
    LEFT JOIN logistics_types lt ON lt.id = l.type_id
    LEFT JOIN users u ON u.id = l.responsible_id
    LEFT JOIN users creator ON creator.id = l.created_by
    LEFT JOIN users editor ON editor.id = l.updated_by
    WHERE l.id = ?
  `).get(req.params.id);

  if (!item) return res.status(404).json({ error: 'Registro no encontrado' });
  res.json(item);
});

// ─── POST / — Crear ────────────────────────────────────────
router.post('/', authMiddleware, (req, res) => {
  const errors = validateBody(req.body);
  if (errors.length > 0) return res.status(400).json({ error: 'Datos inválidos', details: errors });

  const { type_id, title, description, responsible_id, status, start_date, end_date } = req.body;

  if (!type_id) return res.status(400).json({ error: 'Datos inválidos', details: ['El tipo es obligatorio'] });
  if (!title) return res.status(400).json({ error: 'Datos inválidos', details: ['El título es obligatorio'] });

  const result = db.prepare(`
    INSERT INTO logistics (type_id, title, description, responsible_id, status, start_date, end_date, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    type_id, title || null, description || null,
    responsible_id || null, status || 'Pendiente',
    start_date || null, end_date || null,
    req.user.id
  );

  res.status(201).json({ id: result.lastInsertRowid });
});

// ─── PUT /:id — Actualizar ────────────────────────────────
router.put('/:id', authMiddleware, (req, res) => {
  const item = db.prepare('SELECT id FROM logistics WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Registro no encontrado' });

  const errors = validateBody(req.body);
  if (errors.length > 0) return res.status(400).json({ error: 'Datos inválidos', details: errors });

  const fields = ['type_id', 'title', 'description', 'responsible_id', 'status', 'start_date', 'end_date'];
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

  db.prepare(`UPDATE logistics SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ message: 'Registro actualizado' });
});

// ─── DELETE /:id — Eliminar ────────────────────────────────
router.delete('/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM logistics WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Registro no encontrado' });
  res.json({ message: 'Registro eliminado' });
});

export default router;
