import { Router } from 'express';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import db from '../database.js';

const router = Router();

router.get('/', authMiddleware, (req, res) => {
  const statuses = db.prepare(`
    SELECT ss.*, GROUP_CONCAT(pss.profile_id) AS profile_ids_str
    FROM sponsor_statuses ss
    LEFT JOIN profile_sponsor_statuses pss ON pss.sponsor_status_id = ss.id
    GROUP BY ss.id
    ORDER BY ss.sort_order ASC
  `).all();

  const result = statuses.map(s => ({
    id: s.id,
    name: s.name,
    sort_order: s.sort_order,
    color: s.color || null,
    created_at: s.created_at,
    updated_at: s.updated_at,
    profile_ids: s.profile_ids_str ? s.profile_ids_str.split(',').map(Number) : []
  }));

  res.json(result);
});

router.post('/', authMiddleware, adminOnly, (req, res) => {
  const { name, sort_order, color, profile_ids } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });

  const insertStatus = db.transaction(() => {
    const result = db.prepare('INSERT INTO sponsor_statuses (name, sort_order, color) VALUES (?, ?, ?)').run(name, sort_order || 0, color || null);
    const statusId = result.lastInsertRowid;

    if (Array.isArray(profile_ids) && profile_ids.length > 0) {
      const ins = db.prepare('INSERT INTO profile_sponsor_statuses (profile_id, sponsor_status_id) VALUES (?, ?)');
      for (const pid of profile_ids) {
        ins.run(pid, statusId);
      }
    }

    return statusId;
  });

  try {
    const statusId = insertStatus();
    const status = db.prepare('SELECT * FROM sponsor_statuses WHERE id = ?').get(statusId);
    status.profile_ids = profile_ids || [];
    res.status(201).json(status);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'El nombre del status ya existe' });
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', authMiddleware, adminOnly, (req, res) => {
  const { name, sort_order, color, profile_ids } = req.body;

  const updateStatus = db.transaction(() => {
    db.prepare('UPDATE sponsor_statuses SET name = COALESCE(?, name), sort_order = COALESCE(?, sort_order), color = COALESCE(?, color), updated_at = datetime(\'now\',\'localtime\') WHERE id = ?')
      .run(name, sort_order, color || null, req.params.id);

    if (Array.isArray(profile_ids)) {
      db.prepare('DELETE FROM profile_sponsor_statuses WHERE sponsor_status_id = ?').run(req.params.id);
      if (profile_ids.length > 0) {
        const ins = db.prepare('INSERT INTO profile_sponsor_statuses (profile_id, sponsor_status_id) VALUES (?, ?)');
        for (const pid of profile_ids) {
          ins.run(pid, req.params.id);
        }
      }
    }
  });

  try {
    updateStatus();
    const status = db.prepare('SELECT * FROM sponsor_statuses WHERE id = ?').get(req.params.id);
    if (!status) return res.status(404).json({ error: 'Status no encontrado' });

    const pss = db.prepare('SELECT profile_id FROM profile_sponsor_statuses WHERE sponsor_status_id = ?').all(req.params.id);
    status.profile_ids = pss.map(p => p.profile_id);
    res.json(status);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'El nombre del status ya existe' });
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', authMiddleware, adminOnly, (req, res) => {
  const result = db.prepare('DELETE FROM sponsor_statuses WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Status no encontrado' });
  res.json({ message: 'Status eliminado' });
});

export default router;
