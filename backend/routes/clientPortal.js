import { Router } from 'express';
import db from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/client-portal/profile — returns the client linked to the logged-in user
router.get('/profile', authMiddleware, (req, res) => {
  if (req.user.role !== 'client') return res.status(403).json({ error: 'Acceso solo para clientes' });

  const client = db.prepare('SELECT * FROM clients WHERE client_user_id = ?').get(req.user.id);
  if (!client) return res.status(404).json({ error: 'No tienes un perfil de cliente asociado' });

  const docs = db.prepare(`
    SELECT d.*, u.name as uploaded_by_name
    FROM documents d LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE d.client_id = ? AND d.visibility = 'public'
    ORDER BY d.created_at DESC
  `).all(client.id);

  res.json({ ...client, documents: docs });
});

// GET /api/client-portal/documents — public docs for this client
router.get('/documents', authMiddleware, (req, res) => {
  if (req.user.role !== 'client') return res.status(403).json({ error: 'Acceso solo para clientes' });

  const client = db.prepare('SELECT id FROM clients WHERE client_user_id = ?').get(req.user.id);
  if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

  const docs = db.prepare(`
    SELECT d.*, u.name as uploaded_by_name
    FROM documents d LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE d.client_id = ? AND d.visibility = 'public'
    ORDER BY d.created_at DESC
  `).all(client.id);

  res.json(docs);
});

export default router;
