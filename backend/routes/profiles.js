import { Router } from 'express';
import db from '../database.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = Router();

const AVAILABLE_MODULES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'clients', label: 'Clientes' },
  { key: 'tasks', label: 'Tareas' },
  { key: 'patrocinios', label: 'Patrocinios' },
  { key: 'kanban', label: 'Kanban' },
  { key: 'disenos', label: 'Diseños' },
  { key: 'redes', label: 'Redes' },
  { key: 'logistica', label: 'Logística' },
  { key: 'audiovisual', label: 'Audiovisual' },
  { key: 'finance', label: 'Finanzas' },
  { key: 'communications', label: 'Comunicaciones' },
  { key: 'users', label: 'Usuarios' },
  { key: 'settings', label: 'Configuración' },
];

router.get('/modules', authMiddleware, (req, res) => {
  res.json(AVAILABLE_MODULES);
});

router.get('/', authMiddleware, adminOnly, (req, res) => {
  const profiles = db.prepare('SELECT * FROM user_profiles ORDER BY name').all();
  for (const p of profiles) {
    p.modules = db.prepare('SELECT module_key, can_write FROM profile_modules WHERE profile_id = ?').all(p.id);
  }
  res.json(profiles);
});

router.post('/', authMiddleware, adminOnly, (req, res) => {
  const { name, description, modules } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nombre del perfil requerido' });
  }
  const exists = db.prepare('SELECT id FROM user_profiles WHERE name = ?').get(name.trim());
  if (exists) {
    return res.status(409).json({ error: 'Ya existe un perfil con ese nombre' });
  }

  const result = db.prepare('INSERT INTO user_profiles (name, description) VALUES (?, ?)').run(name.trim(), description || null);
  const profileId = result.lastInsertRowid;

  if (Array.isArray(modules)) {
    const ins = db.prepare('INSERT INTO profile_modules (profile_id, module_key, can_write) VALUES (?, ?, ?)');
    for (const m of modules) {
      ins.run(profileId, m.module_key, m.can_write ? 1 : 0);
    }
  }

  const profile = db.prepare('SELECT * FROM user_profiles WHERE id = ?').get(profileId);
  profile.modules = db.prepare('SELECT module_key, can_write FROM profile_modules WHERE profile_id = ?').all(profileId);
  res.status(201).json(profile);
});

router.put('/:id', authMiddleware, adminOnly, (req, res) => {
  const { name, description, modules } = req.body;
  const profile = db.prepare('SELECT id FROM user_profiles WHERE id = ?').get(req.params.id);
  if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' });

  if (name !== undefined) {
    const dup = db.prepare('SELECT id FROM user_profiles WHERE name = ? AND id != ?').get(name.trim(), req.params.id);
    if (dup) return res.status(409).json({ error: 'Ya existe un perfil con ese nombre' });
    db.prepare("UPDATE user_profiles SET name = ?, description = ?, updated_at = datetime('now','localtime') WHERE id = ?")
      .run(name.trim(), description ?? null, req.params.id);
  }

  if (Array.isArray(modules)) {
    db.prepare('DELETE FROM profile_modules WHERE profile_id = ?').run(req.params.id);
    const ins = db.prepare('INSERT INTO profile_modules (profile_id, module_key, can_write) VALUES (?, ?, ?)');
    for (const m of modules) {
      ins.run(req.params.id, m.module_key, m.can_write ? 1 : 0);
    }
  }

  const updated = db.prepare('SELECT * FROM user_profiles WHERE id = ?').get(req.params.id);
  updated.modules = db.prepare('SELECT module_key, can_write FROM profile_modules WHERE profile_id = ?').all(req.params.id);
  res.json(updated);
});

router.delete('/:id', authMiddleware, adminOnly, (req, res) => {
  const profile = db.prepare('SELECT id FROM user_profiles WHERE id = ?').get(req.params.id);
  if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' });

  db.prepare('UPDATE users SET profile_id = NULL WHERE profile_id = ?').run(req.params.id);
  db.prepare('DELETE FROM user_profiles WHERE id = ?').run(req.params.id);
  res.json({ message: 'Perfil eliminado' });
});

export default router;
