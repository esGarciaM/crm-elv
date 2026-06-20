import { Router } from 'express';
import db from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';

  let where = '';
  const params = [];
  if (search) {
    where = 'WHERE (company_name LIKE ? OR contact_person LIKE ? OR student_obtained LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM clients ${where}`).get(...params).count;
  const clients = db.prepare(`SELECT c.*, u.username as client_username FROM clients c LEFT JOIN users u ON c.client_user_id = u.id ${where} ORDER BY c.company_name LIMIT ? OFFSET ?`).all(...params, limit, offset);

  res.json({ clients, total, page, totalPages: Math.ceil(total / limit) });
});

router.get('/:id', authMiddleware, (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

  const tasks = db.prepare(`
    SELECT t.*, u.name as assigned_name
    FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id
    WHERE t.client_id = ? ORDER BY t.created_at DESC
  `).all(req.params.id);

  res.json({ ...client, tasks });
});

router.post('/', authMiddleware, (req, res) => {
  const {
    company_name, contact_person, phone, sponsorship_type, package: pkg,
    visit_status, payment_status, student_obtained, student_contacted,
    in_kind_detail, payment_detail, social_media_fulfilled, tickets_delivered,
    logo_requested, notes, client_user_id
  } = req.body;

  const result = db.prepare(`
    INSERT INTO clients (company_name, contact_person, phone, sponsorship_type, package,
      visit_status, payment_status, student_obtained, student_contacted,
      in_kind_detail, payment_detail, social_media_fulfilled, tickets_delivered,
      logo_requested, notes, client_user_id, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    company_name, contact_person, phone, sponsorship_type, pkg,
    visit_status, payment_status, student_obtained, student_contacted,
    in_kind_detail, payment_detail, social_media_fulfilled, tickets_delivered,
    logo_requested, notes, client_user_id || null, req.user.id
  );

  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', authMiddleware, (req, res) => {
  const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

  const fields = [
    'company_name', 'contact_person', 'phone', 'sponsorship_type', 'package',
    'visit_status', 'payment_status', 'student_obtained', 'student_contacted',
    'in_kind_detail', 'payment_detail', 'social_media_fulfilled', 'tickets_delivered',
    'logo_requested', 'notes', 'client_user_id'
  ];

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
  db.prepare(`UPDATE clients SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ message: 'Cliente actualizado' });
});

router.delete('/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json({ message: 'Cliente eliminado' });
});

export default router;
