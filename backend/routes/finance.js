import { Router } from 'express';
import multer from 'multer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import fs from 'fs';
import db from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadDir = join(__dirname, '..', 'uploads', 'finance');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, `${randomUUID()}.${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv'
    ];
    cb(null, allowed.includes(file.mimetype));
  }
});

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// 1. APORTACIONES SALONES
// ═══════════════════════════════════════════════════════════════════════════

router.get('/contributions', authMiddleware, (req, res) => {
  const { salon, from, to } = req.query;
  let where = [];
  const params = [];
  if (salon) { where.push('salon = ?'); params.push(salon); }
  if (from) { where.push('date >= ?'); params.push(from); }
  if (to) { where.push('date <= ?'); params.push(to); }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = db.prepare(`SELECT * FROM finance_contributions ${whereClause} ORDER BY date DESC`).all(...params);
  const total = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM finance_contributions ${whereClause}`).get(...params).total;
  const bySalon = db.prepare(`SELECT salon, COALESCE(SUM(amount), 0) as total FROM finance_contributions ${whereClause} GROUP BY salon`).all(...params);
  res.json({ contributions: rows, total, bySalon });
});

router.post('/contributions', authMiddleware, (req, res) => {
  const { date, salon, amount, description } = req.body;
  if (!date || !salon || amount === undefined) {
    return res.status(400).json({ error: 'Fecha, salón y monto son requeridos' });
  }
  const result = db.prepare(
    'INSERT INTO finance_contributions (date, salon, amount, description, created_by) VALUES (?, ?, ?, ?, ?)'
  ).run(date, salon, parseFloat(amount), description || null, req.user.id);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Aportación registrada' });
});

router.put('/contributions/:id', authMiddleware, (req, res) => {
  const { date, salon, amount, description } = req.body;
  const fields = [];
  const params = [];
  if (date !== undefined) { fields.push('date = ?'); params.push(date); }
  if (salon !== undefined) { fields.push('salon = ?'); params.push(salon); }
  if (amount !== undefined) { fields.push('amount = ?'); params.push(parseFloat(amount)); }
  if (description !== undefined) { fields.push('description = ?'); params.push(description); }
  if (fields.length === 0) return res.status(400).json({ error: 'Sin cambios' });
  fields.push("updated_at = datetime('now','localtime')");
  params.push(req.params.id);
  const result = db.prepare(`UPDATE finance_contributions SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  if (result.changes === 0) return res.status(404).json({ error: 'No encontrada' });
  res.json({ message: 'Aportación actualizada' });
});

router.delete('/contributions/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM finance_contributions WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'No encontrada' });
  res.json({ message: 'Aportación eliminada' });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. PATROCINIOS FINANCIEROS (vista dedicada del módulo finanzas)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/sponsorships', authMiddleware, (req, res) => {
  const { from, to, sponsorship_type, payment_status, visit_status, student_obtained, student_contacted, q } = req.query;
  let where = [];
  const params = [];
  if (from) { where.push('p.created_at >= ?'); params.push(from); }
  if (to) { where.push('p.created_at <= ?'); params.push(to + ' 23:59:59'); }
  if (sponsorship_type) { where.push('p.sponsorship_type = ?'); params.push(sponsorship_type); }
  if (payment_status) { where.push('p.payment_status = ?'); params.push(payment_status); }
  if (visit_status) { where.push('p.visit_status = ?'); params.push(visit_status); }
  if (student_obtained) { where.push('p.student_obtained LIKE ?'); params.push('%' + student_obtained + '%'); }
  if (student_contacted) { where.push('p.student_contacted LIKE ?'); params.push('%' + student_contacted + '%'); }
  if (q) {
    where.push('(p.company_name LIKE ? OR p.contact_person LIKE ? OR p.package LIKE ?)');
    params.push('%' + q + '%', '%' + q + '%', '%' + q + '%');
  }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = db.prepare(`
    SELECT p.id, p.company_name, p.contact_person, p.phone,
           p.sponsorship_type, p.package, p.payment_status, p.payment_detail,
           p.visit_status, p.student_obtained, p.student_contacted,
           p.created_at as date,
           COALESCE(pp.total_paid, 0) as total_paid
    FROM patrocinios p
    LEFT JOIN (
      SELECT patrocinio_id, SUM(amount) as total_paid
      FROM sponsorship_payments
      GROUP BY patrocinio_id
    ) pp ON pp.patrocinio_id = p.id
    ${whereClause}
    ORDER BY p.created_at DESC
  `).all(...params);

  function extractAmount(pkg) {
    if (!pkg) return 0;
    const m = pkg.match(/\$*(\d[\d,]*)/);
    return m ? parseInt(m[1].replace(/,/g, '')) : 0;
  }

  let totalCash = 0;
  let totalKind = 0;
  let totalMixed = 0;
  let totalPaid = 0;
  for (const p of rows) {
    const amt = extractAmount(p.package);
    const t = (p.sponsorship_type || '').toLowerCase();
    if (t.includes('especie') && t.includes('monetario')) totalMixed += amt;
    else if (t.includes('monetario')) totalCash += amt;
    else if (t.includes('especie')) totalKind += amt;
    totalPaid += (p.total_paid || 0);
  }

  res.json({ sponsorships: rows, totalCash, totalKind, totalMixed, totalPaid, totalGeneral: totalCash + totalKind + totalMixed });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2.1 PAGOS DE PATROCINADORES (Historial)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/sponsorships/:id/payments', authMiddleware, (req, res) => {
  const payments = db.prepare(`
    SELECT sp.*, u.name as created_by_name
    FROM sponsorship_payments sp
    LEFT JOIN users u ON sp.created_by = u.id
    WHERE sp.patrocinio_id = ?
    ORDER BY sp.payment_date DESC
  `).all(req.params.id);

  const totalPaid = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM sponsorship_payments WHERE patrocinio_id = ?
  `).get(req.params.id).total;

  res.json({ payments, totalPaid });
});

router.post('/sponsorships/:id/payments', authMiddleware, (req, res) => {
  const { amount, payment_date, payment_method, reference, notes } = req.body;
  const patrocinio_id = req.params.id;

  if (!amount || !payment_date) {
    return res.status(400).json({ error: 'Monto y fecha son requeridos' });
  }

  const patrocinio = db.prepare('SELECT id FROM patrocinios WHERE id = ?').get(patrocinio_id);
  if (!patrocinio) return res.status(404).json({ error: 'Patrocinio no encontrado' });

  const result = db.prepare(`
    INSERT INTO sponsorship_payments (patrocinio_id, amount, payment_date, payment_method, reference, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(patrocinio_id, parseFloat(amount), payment_date, payment_method || null, reference || null, notes || null, req.user.id);

  res.status(201).json({ id: result.lastInsertRowid, message: 'Pago registrado' });
});

router.delete('/sponsorships/payments/:paymentId', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM sponsorship_payments WHERE id = ?').run(req.params.paymentId);
  if (result.changes === 0) return res.status(404).json({ error: 'Pago no encontrado' });
  res.json({ message: 'Pago eliminado' });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. SOLICITUDES
// ═══════════════════════════════════════════════════════════════════════════

router.get('/solicitudes', authMiddleware, (req, res) => {
  const { status, committee, mine, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = [];
  const params = [];
  if (mine === 'true') { where.push('s.created_by = ?'); params.push(req.user.id); }
  if (status) { where.push('s.status = ?'); params.push(status); }
  if (committee) { where.push('s.committee = ?'); params.push(committee); }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) as count FROM finance_solicitudes s ${whereClause}`).get(...params).count;

  const rows = db.prepare(`
    SELECT s.*,
           u1.name as reviewed_by_name,
           u2.name as approved_by_name,
           u3.name as created_by_name
    FROM finance_solicitudes s
    LEFT JOIN users u1 ON s.reviewed_by = u1.id
    LEFT JOIN users u2 ON s.approved_by = u2.id
    LEFT JOIN users u3 ON s.created_by = u3.id
    ${whereClause}
    ORDER BY s.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  const byStatusWhere = mine === 'true' ? 'WHERE created_by = ?' : '';
  const byStatusParams = mine === 'true' ? [req.user.id] : [];
  const byStatus = db.prepare(`
    SELECT status, COUNT(*) as count FROM finance_solicitudes ${byStatusWhere} GROUP BY status
  `).all(...byStatusParams);

  res.json({
    solicitudes: rows,
    total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)),
    byStatus
  });
});

router.get('/solicitudes/:id', authMiddleware, (req, res) => {
  const row = db.prepare(`
    SELECT s.*,
           u1.name as reviewed_by_name,
           u2.name as approved_by_name,
           u3.name as created_by_name
    FROM finance_solicitudes s
    LEFT JOIN users u1 ON s.reviewed_by = u1.id
    LEFT JOIN users u2 ON s.approved_by = u2.id
    LEFT JOIN users u3 ON s.created_by = u3.id
    WHERE s.id = ?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Solicitud no encontrada' });
  const files = db.prepare('SELECT * FROM finance_solicitud_files WHERE solicitud_id = ?').all(req.params.id);
  res.json({ ...row, files });
});

router.post('/solicitudes', authMiddleware, upload.array('files', 5), (req, res) => {
  const {
    date, committee, responsible, concept, justification,
    amount_requested, priority, impact_if_not_done, email
  } = req.body;

  if (!date || !committee || !responsible || !concept || !amount_requested) {
    if (req.files) for (const f of req.files) fs.unlinkSync(f.path);
    return res.status(400).json({ error: 'Fecha, comité, responsable, concepto y monto son requeridos' });
  }

  const result = db.prepare(`
    INSERT INTO finance_solicitudes (date, committee, responsible, concept, justification,
      amount_requested, priority, impact_if_not_done, email, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    date, committee, responsible, concept, justification || null,
    parseFloat(amount_requested), priority || 'media',
    impact_if_not_done || null, email || null, req.user.id
  );

  const id = result.lastInsertRowid;
  if (req.files) {
    const insert = db.prepare('INSERT INTO finance_solicitud_files (solicitud_id, name, original_name, mime_type, size) VALUES (?, ?, ?, ?, ?)');
    for (const f of req.files) insert.run(id, f.filename, f.originalname, f.mimetype, f.size);
  }

  res.status(201).json({ id, message: 'Solicitud creada' });
});

router.put('/solicitudes/:id', authMiddleware, upload.array('files', 5), (req, res) => {
  const existing = db.prepare('SELECT id FROM finance_solicitudes WHERE id = ?').get(req.params.id);
  if (!existing) {
    if (req.files) for (const f of req.files) fs.unlinkSync(f.path);
    return res.status(404).json({ error: 'Solicitud no encontrada' });
  }

  const fields = [
    'date', 'committee', 'responsible', 'concept', 'justification',
    'amount_requested', 'amount_approved', 'amount_paid', 'priority',
    'status', 'reviewed_by', 'approved_by', 'payment_date', 'observations',
    'impact_if_not_done', 'email'
  ];
  const updates = [];
  const params = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(f.includes('amount') ? parseFloat(req.body[f]) : req.body[f]);
    }
  }

  if (updates.length === 0 && (!req.files || req.files.length === 0)) {
    return res.status(400).json({ error: 'Sin cambios' });
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now','localtime')");
    params.push(req.params.id);
    db.prepare(`UPDATE finance_solicitudes SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  if (req.files) {
    const insert = db.prepare('INSERT INTO finance_solicitud_files (solicitud_id, name, original_name, mime_type, size) VALUES (?, ?, ?, ?, ?)');
    for (const f of req.files) insert.run(req.params.id, f.filename, f.originalname, f.mimetype, f.size);
  }

  res.json({ message: 'Solicitud actualizada' });
});

router.delete('/solicitudes/:id', authMiddleware, (req, res) => {
  const files = db.prepare('SELECT * FROM finance_solicitud_files WHERE solicitud_id = ?').all(req.params.id);
  for (const f of files) {
    const fp = join(uploadDir, f.name);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  const result = db.prepare('DELETE FROM finance_solicitudes WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
  res.json({ message: 'Solicitud eliminada' });
});

router.get('/solicitudes/download/:fileId', authMiddleware, (req, res) => {
  const file = db.prepare('SELECT * FROM finance_solicitud_files WHERE id = ?').get(req.params.fileId);
  if (!file) return res.status(404).json({ error: 'Archivo no encontrado' });
  const filePath = join(uploadDir, file.name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado en disco' });
  res.setHeader('Content-Type', file.mime_type);
  res.setHeader('Content-Disposition', `inline; filename="${file.original_name}"`);
  res.sendFile(filePath);
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. SALIDAS (Egresos por comité)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/expenses', authMiddleware, (req, res) => {
  const { committee, from, to, responsible, q } = req.query;
  let where = [];
  const params = [];
  if (committee) { where.push('fe.committee = ?'); params.push(committee); }
  if (from) { where.push('fe.date >= ?'); params.push(from); }
  if (to) { where.push('fe.date <= ?'); params.push(to); }
  if (responsible) { where.push('fe.responsible LIKE ?'); params.push('%' + responsible + '%'); }
  if (q) { where.push('(fe.concept LIKE ? OR fe.notes LIKE ?)'); params.push('%' + q + '%', '%' + q + '%'); }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = db.prepare(`
    SELECT fe.*, u.name as created_by_name
    FROM finance_expenses fe
    LEFT JOIN users u ON fe.created_by = u.id
    ${whereClause}
    ORDER BY fe.date DESC
  `).all(...params);

  const total = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM finance_expenses fe ${whereClause}`).get(...params).total;
  const byCommittee = db.prepare(`
    SELECT committee, COALESCE(SUM(amount), 0) as total
    FROM finance_expenses fe ${whereClause} GROUP BY committee
  `).all(...params);

  res.json({ expenses: rows, total, byCommittee });
});

router.post('/expenses', authMiddleware, upload.array('files', 5), (req, res) => {
  const { date, committee, concept, amount, responsible, notes } = req.body;
  if (!date || !concept || !responsible || amount === undefined) {
    if (req.files) for (const f of req.files) fs.unlinkSync(f.path);
    return res.status(400).json({ error: 'Fecha, concepto, responsable y monto son requeridos' });
  }

  const receiptsCount = req.files ? req.files.length : 0;
  const result = db.prepare(`
    INSERT INTO finance_expenses (date, committee, concept, amount, responsible, receipts_count, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(date, committee || null, concept, parseFloat(amount), responsible, receiptsCount, notes || null, req.user.id);

  const id = result.lastInsertRowid;
  if (req.files) {
    const insert = db.prepare('INSERT INTO finance_expense_files (expense_id, name, original_name, mime_type, size) VALUES (?, ?, ?, ?, ?)');
    for (const f of req.files) insert.run(id, f.filename, f.originalname, f.mimetype, f.size);
  }

  // Update committee budget spent
  if (committee) {
    db.prepare(`
      UPDATE finance_committee_budgets
      SET spent = (SELECT COALESCE(SUM(amount), 0) FROM finance_expenses WHERE committee = ?),
          updated_at = datetime('now','localtime')
      WHERE committee = ?
    `).run(committee, committee);
  }

  res.status(201).json({ id, message: 'Salida registrada' });
});

router.put('/expenses/:id', authMiddleware, (req, res) => {
  const existing = db.prepare('SELECT id, committee FROM finance_expenses WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Salida no encontrada' });

  const fields = ['date', 'committee', 'concept', 'amount', 'responsible', 'receipts_count', 'notes'];
  const updates = [];
  const params = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(f === 'amount' ? parseFloat(req.body[f]) : req.body[f]);
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'Sin cambios' });
  updates.push("updated_at = datetime('now','localtime')");
  params.push(req.params.id);
  db.prepare(`UPDATE finance_expenses SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  // Refresh budgets for old and new committee
  const newCommittee = req.body.committee || existing.committee;
  for (const c of [existing.committee, newCommittee].filter(Boolean)) {
    db.prepare(`
      UPDATE finance_committee_budgets
      SET spent = (SELECT COALESCE(SUM(amount), 0) FROM finance_expenses WHERE committee = ?),
          updated_at = datetime('now','localtime')
      WHERE committee = ?
    `).run(c, c);
  }

  res.json({ message: 'Salida actualizada' });
});

router.delete('/expenses/:id', authMiddleware, (req, res) => {
  const existing = db.prepare('SELECT committee FROM finance_expenses WHERE id = ?').get(req.params.id);
  const files = db.prepare('SELECT * FROM finance_expense_files WHERE expense_id = ?').all(req.params.id);
  for (const f of files) {
    const fp = join(uploadDir, f.name);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  const result = db.prepare('DELETE FROM finance_expenses WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Salida no encontrada' });

  if (existing?.committee) {
    db.prepare(`
      UPDATE finance_committee_budgets
      SET spent = (SELECT COALESCE(SUM(amount), 0) FROM finance_expenses WHERE committee = ?),
          updated_at = datetime('now','localtime')
      WHERE committee = ?
    `).run(existing.committee, existing.committee);
  }

  res.json({ message: 'Salida eliminada' });
});

router.get('/expenses/download/:fileId', authMiddleware, (req, res) => {
  const file = db.prepare('SELECT * FROM finance_expense_files WHERE id = ?').get(req.params.fileId);
  if (!file) return res.status(404).json({ error: 'Archivo no encontrado' });
  const filePath = join(uploadDir, file.name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado en disco' });
  res.setHeader('Content-Type', file.mime_type);
  res.setHeader('Content-Disposition', `inline; filename="${file.original_name}"`);
  res.sendFile(filePath);
});

// ─── Committee Budgets ───

router.get('/budgets', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM finance_committee_budgets ORDER BY committee').all();
  const totalBudget = rows.reduce((s, r) => s + r.budget, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
  res.json({ budgets: rows, totalBudget, totalSpent, totalAvailable: totalBudget - totalSpent });
});

router.put('/budgets/:committee', authMiddleware, (req, res) => {
  const { budget, status } = req.body;
  const updates = [];
  const params = [];
  if (budget !== undefined) { updates.push('budget = ?'); params.push(parseFloat(budget)); }
  if (status !== undefined) { updates.push('status = ?'); params.push(status); }
  if (updates.length === 0) return res.status(400).json({ error: 'Sin cambios' });
  updates.push("updated_at = datetime('now','localtime')");
  params.push(req.params.committee);
  db.prepare(`UPDATE finance_committee_budgets SET ${updates.join(', ')} WHERE committee = ?`).run(...params);
  res.json({ message: 'Presupuesto actualizado' });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. RESUMEN FINANCIERO
// ═══════════════════════════════════════════════════════════════════════════

router.get('/summary', authMiddleware, (req, res) => {
  const totalContributions = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM finance_contributions').get().total;

  const totalExpenses = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM finance_expenses').get().total;

  const solicitudesByStatus = db.prepare(`
    SELECT status, COUNT(*) as count, COALESCE(SUM(amount_requested), 0) as total
    FROM finance_solicitudes GROUP BY status
  `).all();

  const pendientes = solicitudesByStatus.find(s => s.status === 'pendiente') || { count: 0, total: 0 };
  const aprobadas = solicitudesByStatus.find(s => s.status === 'aprobada') || { count: 0, total: 0 };
  const pagadas = solicitudesByStatus.find(s => s.status === 'pagada') || { count: 0, total: 0 };

  const totalSolicitudesApproved = aprobadas.total + pagadas.total;

  const balanceFinal = totalContributions - totalExpenses;

  res.json({
    totalContributions,
    totalExpenses,
    balanceFinal,
    solicitudes: {
      pendingCount: pendientes.count,
      pendingTotal: pendientes.total,
      approvedCount: aprobadas.count,
      approvedTotal: aprobadas.total,
      paidCount: pagadas.count,
      paidTotal: pagadas.total
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. REPORTES MENSUALES
// ═══════════════════════════════════════════════════════════════════════════

router.get('/monthly-reports', authMiddleware, (req, res) => {
  const { month, year } = req.query;
  let rows;
  if (month && year) {
    rows = db.prepare('SELECT * FROM finance_monthly_reports WHERE month = ? AND year = ?').all(parseInt(month), parseInt(year));
  } else {
    rows = db.prepare('SELECT * FROM finance_monthly_reports ORDER BY year DESC, month DESC LIMIT 12').all();
  }
  res.json(rows);
});

router.get('/monthly-reports/:id', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT * FROM finance_monthly_reports WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Reporte no encontrado' });
  res.json(row);
});

router.post('/monthly-reports', authMiddleware, (req, res) => {
  const {
    month, year, initial_balance, contributions_total,
    sponsorships_cash, sponsorships_kind, expenses_total,
    final_balance, written_report
  } = req.body;

  if (!month || !year) return res.status(400).json({ error: 'Mes y año son requeridos' });

  const existing = db.prepare('SELECT id FROM finance_monthly_reports WHERE month = ? AND year = ?').get(month, year);
  if (existing) return res.status(409).json({ error: 'Ya existe reporte para este mes/año', id: existing.id });

  const result = db.prepare(`
    INSERT INTO finance_monthly_reports (month, year, initial_balance, contributions_total,
      sponsorships_cash, sponsorships_kind, expenses_total, final_balance, written_report, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    parseInt(month), parseInt(year),
    parseFloat(initial_balance || 0), parseFloat(contributions_total || 0),
    parseFloat(sponsorships_cash || 0), parseFloat(sponsorships_kind || 0),
    parseFloat(expenses_total || 0), parseFloat(final_balance || 0),
    written_report || null, req.user.id
  );

  res.status(201).json({ id: result.lastInsertRowid, message: 'Reporte mensual creado' });
});

router.put('/monthly-reports/:id', authMiddleware, (req, res) => {
  const existing = db.prepare('SELECT id FROM finance_monthly_reports WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Reporte no encontrado' });

  const fields = [
    'initial_balance', 'contributions_total', 'sponsorships_cash',
    'sponsorships_kind', 'expenses_total', 'final_balance', 'written_report'
  ];
  const updates = [];
  const params = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(f === 'written_report' ? req.body[f] : parseFloat(req.body[f]));
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'Sin cambios' });
  updates.push("updated_at = datetime('now','localtime')");
  params.push(req.params.id);
  db.prepare(`UPDATE finance_monthly_reports SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ message: 'Reporte actualizado' });
});

router.delete('/monthly-reports/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM finance_monthly_reports WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Reporte no encontrado' });
  res.json({ message: 'Reporte eliminado' });
});

// Auto-generate report data from current DB state
router.post('/monthly-reports/generate', authMiddleware, (req, res) => {
  const { month, year } = req.body;
  if (!month || !year) return res.status(400).json({ error: 'Mes y año son requeridos' });

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevReport = db.prepare('SELECT final_balance FROM finance_monthly_reports WHERE month = ? AND year = ?').get(prevMonth, prevYear);
  const initialBalance = prevReport ? prevReport.final_balance : 0;

  const contributions = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM finance_contributions WHERE date >= ? AND date < ?"
  ).get(startDate, endDate).total;

  const expenses = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM finance_expenses WHERE date >= ? AND date < ?"
  ).get(startDate, endDate).total;

  const finalBalance = initialBalance + contributions - expenses;

  res.json({
    month: parseInt(month), year: parseInt(year),
    initial_balance: initialBalance,
    contributions_total: contributions,
    expenses_total: expenses,
    final_balance: finalBalance,
    sponsorships_cash: 0,
    sponsorships_kind: 0
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. GOOGLE FORM INTEGRATION (webhook)
// ═══════════════════════════════════════════════════════════════════════════

router.post('/webhook/form', (req, res) => {
  const {
    timestamp, committee, responsible, concept, justification,
    amount, required_date, quote, impact_if_not_done, terms, email
  } = req.body;

  if (!committee || !responsible || !concept || !amount) {
    return res.status(400).json({ error: 'Campos requeridos faltantes' });
  }

  const result = db.prepare(`
    INSERT INTO finance_solicitudes (date, committee, responsible, concept, justification,
      amount_requested, priority, impact_if_not_done, email, status)
    VALUES (?, ?, ?, ?, ?, ?, 'media', ?, ?, 'pendiente')
  `).run(
    timestamp || new Date().toISOString().split('T')[0],
    committee, responsible, concept, justification || null,
    parseFloat(amount), impact_if_not_done || null, email || null
  );

  res.status(201).json({ id: result.lastInsertRowid, message: 'Formulario registrado' });
});

// ═══════════════════════════════════════════════════════════════════════════
// SOLICITUD COMMENTS (Seguimiento)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/solicitudes/:id/comments', authMiddleware, (req, res) => {
  const sol = db.prepare('SELECT id FROM finance_solicitudes WHERE id = ?').get(req.params.id);
  if (!sol) return res.status(404).json({ error: 'Solicitud no encontrada' });

  const comments = db.prepare(`
    SELECT sc.*, u.name as created_by_name
    FROM solicitud_comments sc
    LEFT JOIN users u ON sc.created_by = u.id
    WHERE sc.solicitud_id = ?
    ORDER BY sc.created_at DESC
  `).all(req.params.id);

  for (const c of comments) {
    c.files = db.prepare('SELECT * FROM solicitud_comment_files WHERE comment_id = ?').all(c.id);
  }

  res.json(comments);
});

router.post('/solicitudes/:id/comments', authMiddleware, upload.array('files', 5), (req, res) => {
  const sol = db.prepare('SELECT id FROM finance_solicitudes WHERE id = ?').get(req.params.id);
  if (!sol) return res.status(404).json({ error: 'Solicitud no encontrada' });

  const { comment, link } = req.body;
  if (!comment && (!req.files || req.files.length === 0) && !link) {
    return res.status(400).json({ error: 'Comentario, archivos o enlace requerido' });
  }

  const result = db.prepare(`
    INSERT INTO solicitud_comments (solicitud_id, comment, link, created_by)
    VALUES (?, ?, ?, ?)
  `).run(req.params.id, comment || null, link || null, req.user.id);

  const commentId = result.lastInsertRowid;

  if (req.files && req.files.length > 0) {
    const insertFile = db.prepare(`
      INSERT INTO solicitud_comment_files (comment_id, name, original_name, mime_type, size)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const f of req.files) {
      insertFile.run(commentId, f.filename, f.originalname, f.mimetype, f.size);
    }
  }

  res.status(201).json({ id: commentId, message: 'Comentario agregado' });
});

router.delete('/solicitudes/:id/comments/:commentId', authMiddleware, (req, res) => {
  const comment = db.prepare('SELECT id FROM solicitud_comments WHERE id = ? AND solicitud_id = ?').get(req.params.commentId, req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comentario no encontrado' });

  const files = db.prepare('SELECT name FROM solicitud_comment_files WHERE comment_id = ?').all(req.params.commentId);
  for (const f of files) {
    const filePath = join(uploadDir, f.name);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  db.prepare('DELETE FROM solicitud_comment_files WHERE comment_id = ?').run(req.params.commentId);
  db.prepare('DELETE FROM solicitud_comments WHERE id = ?').run(req.params.commentId);
  res.json({ message: 'Comentario eliminado' });
});

router.get('/solicitudes/:id/comments/:commentId/download/:fileId', authMiddleware, (req, res) => {
  const file = db.prepare('SELECT * FROM solicitud_comment_files WHERE id = ? AND comment_id = ?').get(req.params.fileId, req.params.commentId);
  if (!file) return res.status(404).json({ error: 'Archivo no encontrado' });

  const filePath = join(uploadDir, file.name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado en disco' });

  res.download(filePath, file.original_name);
});

export default router;
