import { Router } from 'express';
import db from '../database.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = Router();

// GET /api/packages — list active packages (all authenticated users)
router.get('/', authMiddleware, (req, res) => {
  const showAll = req.query.all === 'true';
  const packages = showAll
    ? db.prepare('SELECT * FROM packages ORDER BY sort_order').all()
    : db.prepare('SELECT * FROM packages WHERE active = 1 ORDER BY sort_order').all();
  res.json(packages);
});

// POST /api/packages — create (admin only)
router.post('/', authMiddleware, adminOnly, (req, res) => {
  const { name, amount, type, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  try {
    const result = db.prepare(
      'INSERT INTO packages (name, amount, type, sort_order) VALUES (?, ?, ?, ?)'
    ).run(name, amount || null, type || null, sort_order || 0);
    res.status(201).json({
      id: result.lastInsertRowid,
      name,
      amount: amount || null,
      type: type || null,
      sort_order: sort_order || 0,
      active: 1
    });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'El paquete ya existe' });
    throw e;
  }
});

// PUT /api/packages/:id — update (admin only)
router.put('/:id', authMiddleware, adminOnly, (req, res) => {
  const pkg = db.prepare('SELECT id FROM packages WHERE id = ?').get(req.params.id);
  if (!pkg) return res.status(404).json({ error: 'Paquete no encontrado' });
  const { name, amount, type, sort_order, active } = req.body;
  try {
    db.prepare(`
      UPDATE packages
      SET name = COALESCE(?, name),
          amount = COALESCE(?, amount),
          type = COALESCE(?, type),
          sort_order = COALESCE(?, sort_order),
          active = COALESCE(?, active),
          updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(
      name || null,
      amount !== undefined ? amount : null,
      type || null,
      sort_order !== undefined ? sort_order : null,
      active !== undefined ? (active ? 1 : 0) : null,
      req.params.id
    );
    res.json({ message: 'Paquete actualizado' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'El nombre ya existe' });
    throw e;
  }
});

// DELETE /api/packages/:id — soft delete (deactivate) (admin only)
router.delete('/:id', authMiddleware, adminOnly, (req, res) => {
  const pkg = db.prepare('SELECT id FROM packages WHERE id = ?').get(req.params.id);
  if (!pkg) return res.status(404).json({ error: 'Paquete no encontrado' });
  db.prepare("UPDATE packages SET active = 0, updated_at = datetime('now','localtime') WHERE id = ?")
    .run(req.params.id);
  res.json({ message: 'Paquete desactivado' });
});

// ─── Package Checklist ──────────────────────────────────────

// GET /api/packages/checklist-items — all possible checklist items
router.get('/checklist-items', authMiddleware, (req, res) => {
  const items = db.prepare('SELECT * FROM package_checklist_items ORDER BY sort_order').all();
  res.json(items);
});

// POST /api/packages/checklist-items — create new item (admin only)
router.post('/checklist-items', authMiddleware, adminOnly, (req, res) => {
  const { key, label, sort_order } = req.body;
  if (!key || !label) return res.status(400).json({ error: 'key y label son requeridos' });
  try {
    const result = db.prepare(
      'INSERT INTO package_checklist_items (key, label, sort_order) VALUES (?, ?, ?)'
    ).run(key, label, sort_order || 0);
    res.status(201).json({
      id: result.lastInsertRowid,
      key, label,
      sort_order: sort_order || 0
    });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'La clave ya existe' });
    throw e;
  }
});

// PUT /api/packages/checklist-items/:id — update item (admin only)
router.put('/checklist-items/:id', authMiddleware, adminOnly, (req, res) => {
  const item = db.prepare('SELECT id FROM package_checklist_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Elemento no encontrado' });
  const { key, label, sort_order } = req.body;
  try {
    db.prepare(`
      UPDATE package_checklist_items
      SET key = COALESCE(?, key),
          label = COALESCE(?, label),
          sort_order = COALESCE(?, sort_order)
      WHERE id = ?
    `).run(key || null, label || null, sort_order !== undefined ? sort_order : null, req.params.id);
    res.json({ message: 'Elemento actualizado' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'La clave ya existe' });
    throw e;
  }
});

// DELETE /api/packages/checklist-items/:id — delete item (admin only)
router.delete('/checklist-items/:id', authMiddleware, adminOnly, (req, res) => {
  const item = db.prepare('SELECT id FROM package_checklist_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Elemento no encontrado' });
  db.prepare('DELETE FROM package_checklist_items WHERE id = ?').run(req.params.id);
  res.json({ message: 'Elemento eliminado' });
});

// GET /api/packages/:id/checklist — checked items for a package
router.get('/:id/checklist', authMiddleware, (req, res) => {
  const pkg = db.prepare('SELECT id FROM packages WHERE id = ?').get(req.params.id);
  if (!pkg) return res.status(404).json({ error: 'Paquete no encontrado' });
  const items = db.prepare(`
    SELECT pci.* FROM package_checklist_items pci
    JOIN package_checklist pc ON pc.item_id = pci.id
    WHERE pc.package_id = ?
    ORDER BY pci.sort_order
  `).all(req.params.id);
  res.json(items);
});

// PUT /api/packages/:id/checklist — update checked items for a package (admin only)
router.put('/:id/checklist', authMiddleware, adminOnly, (req, res) => {
  const pkg = db.prepare('SELECT id FROM packages WHERE id = ?').get(req.params.id);
  if (!pkg) return res.status(404).json({ error: 'Paquete no encontrado' });
  const { item_ids } = req.body; // array of item IDs
  if (!Array.isArray(item_ids)) return res.status(400).json({ error: 'item_ids debe ser un array' });
  const del = db.prepare('DELETE FROM package_checklist WHERE package_id = ?');
  const ins = db.prepare('INSERT OR IGNORE INTO package_checklist (package_id, item_id) VALUES (?, ?)');
  const txn = db.transaction(() => {
    del.run(req.params.id);
    for (const itemId of item_ids) {
      ins.run(req.params.id, itemId);
    }
  });
  txn();
  res.json({ message: 'Checklist actualizado', item_ids });
});

export default router;
