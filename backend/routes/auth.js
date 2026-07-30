import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../database.js';
import { generateToken, authMiddleware, adminOnly } from '../middleware/auth.js';

const router = Router();

function getUserModules(userId) {
  const user = db.prepare('SELECT profile_id FROM users WHERE id = ?').get(userId);
  if (!user || !user.profile_id) return null;
  return db.prepare('SELECT module_key, can_write FROM profile_modules WHERE profile_id = ?').all(user.profile_id);
}

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  const token = generateToken(user);
  const modules = getUserModules(user.id);
  res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role, department_id: user.department_id, modules } });
});

router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT u.id, u.username, u.name, u.role, u.profile_id, u.department_id, d.name AS department_name, u.created_at FROM users u LEFT JOIN departments d ON d.id = u.department_id WHERE u.id = ?').get(req.user.id);
  user.modules = getUserModules(req.user.id);
  res.json(user);
});

router.get('/', authMiddleware, adminOnly, (req, res) => {
  const users = db.prepare('SELECT u.id, u.username, u.name, u.role, u.active, u.profile_id, u.department_id, d.name AS department_name, u.created_at FROM users u LEFT JOIN departments d ON d.id = u.department_id ORDER BY u.name').all();
  res.json(users);
});

router.post('/', authMiddleware, adminOnly, (req, res) => {
  const { username, password, name, role, department_id } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ error: 'Usuario, contraseña y nombre requeridos' });
  }
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) {
    return res.status(409).json({ error: 'El usuario ya existe' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, password, name, role, department_id) VALUES (?, ?, ?, ?, ?)').run(username, hash, name, role || 'user', department_id || null);
  res.status(201).json({ id: result.lastInsertRowid, username, name, role: role || 'user', department_id: department_id || null });
});

router.put('/profile', authMiddleware, (req, res) => {
  const { name, currentPassword, newPassword } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).json({ error: 'Contraseña actual requerida para cambiarla' });
    }
    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
    }
  }

  const updates = [];
  const params = [];
  if (name !== undefined && name.trim()) { updates.push('name = ?'); params.push(name.trim()); }
  if (newPassword) { updates.push('password = ?'); params.push(bcrypt.hashSync(newPassword, 10)); }

  if (updates.length === 0) return res.status(400).json({ error: 'Sin cambios' });

  updates.push("updated_at = datetime('now','localtime')");
  params.push(req.user.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT id, username, name, role, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(updated);
});

router.put('/:id', authMiddleware, adminOnly, (req, res) => {
  const { name, role, active, password, profile_id, department_id } = req.body;
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const updates = [];
  const params = [];
  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (role !== undefined) { updates.push('role = ?'); params.push(role); }
  if (active !== undefined) { updates.push('active = ?'); params.push(active ? 1 : 0); }
  if (profile_id !== undefined) { updates.push('profile_id = ?'); params.push(profile_id || null); }
  if (department_id !== undefined) { updates.push('department_id = ?'); params.push(department_id || null); }
  if (password) {
    updates.push('password = ?');
    params.push(bcrypt.hashSync(password, 10));
  }
  if (updates.length === 0) return res.status(400).json({ error: 'Sin cambios' });

  updates.push("updated_at = datetime('now','localtime')");
  params.push(req.params.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ message: 'Usuario actualizado' });
});

export default router;
