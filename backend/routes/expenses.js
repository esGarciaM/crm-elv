import { Router } from 'express';
import multer from 'multer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import fs from 'fs';
import db from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadDir = join(__dirname, '..', 'uploads', 'expenses');
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
      'application/pdf',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv'
    ];
    cb(null, allowed.includes(file.mimetype));
  }
});

const router = Router();

router.get('/', authMiddleware, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const deptFilter = req.query.department_id || '';

  let where = '';
  const params = [];
  if (deptFilter) {
    where = 'WHERE e.department_id = ?';
    params.push(deptFilter);
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM expenses e ${where}`).get(...params).count;
  const expenses = db.prepare(`
    SELECT e.*, d.name as department_name, u.name as created_by_name
    FROM expenses e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN users u ON e.created_by = u.id
    ${where}
    ORDER BY e.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const expenseIds = expenses.map(e => e.id);
  let filesMap = {};
  if (expenseIds.length > 0) {
    const placeholders = expenseIds.map(() => '?').join(',');
    const files = db.prepare(`SELECT * FROM expense_files WHERE expense_id IN (${placeholders}) ORDER BY created_at`).all(...expenseIds);
    for (const f of files) {
      if (!filesMap[f.expense_id]) filesMap[f.expense_id] = [];
      filesMap[f.expense_id].push(f);
    }
  }

  res.json({
    expenses: expenses.map(e => ({ ...e, files: filesMap[e.id] || [] })),
    total, page, totalPages: Math.ceil(total / limit)
  });
});

router.get('/:id', authMiddleware, (req, res) => {
  const expense = db.prepare(`
    SELECT e.*, d.name as department_name, u.name as created_by_name
    FROM expenses e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN users u ON e.created_by = u.id
    WHERE e.id = ?
  `).get(req.params.id);
  if (!expense) return res.status(404).json({ error: 'Gasto no encontrado' });

  const files = db.prepare('SELECT * FROM expense_files WHERE expense_id = ? ORDER BY created_at').all(req.params.id);
  res.json({ ...expense, files });
});

router.post('/', authMiddleware, upload.array('files', 5), (req, res) => {
  const { responsible_name, concept, description, justification, amount, required_date, quote_date, impact_if_not_done, department_id } = req.body;

  if (!responsible_name || !concept || !amount) {
    if (req.files) for (const f of req.files) fs.unlinkSync(f.path);
    return res.status(400).json({ error: 'Responsable, concepto y monto son requeridos' });
  }

  const result = db.prepare(`
    INSERT INTO expenses (responsible_name, concept, description, justification, amount, required_date, quote_date, impact_if_not_done, department_id, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    responsible_name, concept, description || null, justification || null,
    parseFloat(amount), required_date || null, quote_date || null,
    impact_if_not_done || null, department_id || null, req.user.id
  );

  const expenseId = result.lastInsertRowid;

  if (req.files) {
    const insert = db.prepare('INSERT INTO expense_files (expense_id, name, original_name, mime_type, size) VALUES (?, ?, ?, ?, ?)');
    for (const f of req.files) {
      insert.run(expenseId, f.filename, f.originalname, f.mimetype, f.size);
    }
  }

  res.status(201).json({ id: expenseId, message: 'Gasto creado' });
});

router.put('/:id', authMiddleware, (req, res) => {
  const expense = db.prepare('SELECT id FROM expenses WHERE id = ?').get(req.params.id);
  if (!expense) return res.status(404).json({ error: 'Gasto no encontrado' });

  const fields = ['responsible_name', 'concept', 'description', 'justification', 'amount', 'required_date', 'quote_date', 'impact_if_not_done', 'department_id', 'status'];
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
  db.prepare(`UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ message: 'Gasto actualizado' });
});

router.delete('/:id', authMiddleware, (req, res) => {
  const files = db.prepare('SELECT * FROM expense_files WHERE expense_id = ?').all(req.params.id);
  for (const f of files) {
    const fp = join(uploadDir, f.name);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  const result = db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Gasto no encontrado' });
  res.json({ message: 'Gasto eliminado' });
});

router.get('/download/:fileId', authMiddleware, (req, res) => {
  const file = db.prepare('SELECT * FROM expense_files WHERE id = ?').get(req.params.fileId);
  if (!file) return res.status(404).json({ error: 'Archivo no encontrado' });

  const filePath = join(uploadDir, file.name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado en disco' });

  res.setHeader('Content-Type', file.mime_type);
  res.setHeader('Content-Disposition', `inline; filename="${file.original_name}"`);
  res.sendFile(filePath);
});

export default router;
