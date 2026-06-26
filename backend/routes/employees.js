import { Router } from 'express';
import db from '../database.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, (req, res) => {
  const employees = db.prepare(`
    SELECT e.*, d.name as department_name
    FROM employees e LEFT JOIN departments d ON e.department_id = d.id
    ORDER BY e.last_name, e.first_name
  `).all();
  res.json(employees);
});

router.post('/', authMiddleware, adminOnly, (req, res) => {
  const { first_name, last_name, email, phone, department_id } = req.body;
  if (!first_name || !last_name) return res.status(400).json({ error: 'Nombre y apellido requeridos' });
  const result = db.prepare(`
    INSERT INTO employees (first_name, last_name, email, phone, department_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(first_name, last_name, email || null, phone || null, department_id || null);
  res.status(201).json({ id: result.lastInsertRowid, first_name, last_name, email, phone, department_id });
});

router.put('/:id', authMiddleware, adminOnly, (req, res) => {
  const emp = db.prepare('SELECT id FROM employees WHERE id = ?').get(req.params.id);
  if (!emp) return res.status(404).json({ error: 'Empleado no encontrado' });

  const fields = ['first_name', 'last_name', 'email', 'phone', 'department_id', 'active'];
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
  db.prepare(`UPDATE employees SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ message: 'Empleado actualizado' });
});

router.delete('/:id', authMiddleware, adminOnly, (req, res) => {
  const result = db.prepare('DELETE FROM employees WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Empleado no encontrado' });
  res.json({ message: 'Empleado eliminado' });
});

export default router;
