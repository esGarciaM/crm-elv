import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import clientRoutes from './routes/clients.js';
import taskRoutes from './routes/tasks.js';
import documentRoutes from './routes/documents.js';
import clientPortalRoutes from './routes/clientPortal.js';
import db from './database.js';
import bcrypt from 'bcryptjs';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Seed default admin user if none exists
const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)').run('admin', hash, 'Administrador', 'admin');
  console.log('Default admin created: admin / admin123');
}

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/client-portal', clientPortalRoutes);

app.get('/api/stats', (req, res) => {
  // ── Client / Finance ──
  const totalClients = db.prepare('SELECT COUNT(*) as total FROM clients').get().total;
  const pagados = db.prepare("SELECT COUNT(*) as total FROM clients WHERE payment_status = 'Pagado'").get().total;
  const pendientes = db.prepare("SELECT COUNT(*) as total FROM clients WHERE payment_status = 'Pendiente'").get().total;
  const abonados = db.prepare("SELECT COUNT(*) as total FROM clients WHERE payment_status = 'Abonado'").get().total;

  const allPackages = db.prepare("SELECT package, payment_status, sponsorship_type FROM clients WHERE package IS NOT NULL AND package != ''").all();
  const byStatus = { Pagado: [], Pendiente: [], Abonado: [], Cancelado: [] };

  function extractAmount(pkg) {
    if (!pkg) return 0;
    const m = pkg.match(/\$*(\d[\d,]*)/);
    return m ? parseInt(m[1].replace(/,/g, '')) : 0;
  }

  let totalEstimated = 0;
  let totalPagado = 0;
  let totalPendiente = 0;
  let totalAbonado = 0;
  let inKindCount = 0;
  let inKindEstimated = 0;

  const breakdown = [];

  for (const c of allPackages) {
    const amt = extractAmount(c.package);
    totalEstimated += amt;
    const isInKind = c.sponsorship_type && c.sponsorship_type.toLowerCase().includes('especie');
    if (isInKind) {
      inKindCount++;
      inKindEstimated += amt;
    }
    const status = c.payment_status || 'Pendiente';
    if (status === 'Pagado') totalPagado += amt;
    else if (status === 'Pendiente') totalPendiente += amt;
    else if (status === 'Abonado') totalAbonado += amt;

    breakdown.push({ package: c.package, amount: amt, status, type: c.sponsorship_type });
  }

  // ── Tasks / Workload ──
  const tasksTotal = db.prepare('SELECT COUNT(*) as total FROM tasks').get().total;
  const tasksPending = db.prepare("SELECT COUNT(*) as total FROM tasks WHERE status = 'pending'").get().total;
  const tasksInProgress = db.prepare("SELECT COUNT(*) as total FROM tasks WHERE status = 'in_progress'").get().total;
  const tasksCompleted = db.prepare("SELECT COUNT(*) as total FROM tasks WHERE status = 'completed'").get().total;
  const tasksCancelled = db.prepare("SELECT COUNT(*) as total FROM tasks WHERE status = 'cancelled'").get().total;
  const tasksUrgent = db.prepare("SELECT COUNT(*) as total FROM tasks WHERE priority = 'urgent' AND status != 'completed' AND status != 'cancelled'").get().total;
  const tasksOverdue = db.prepare("SELECT COUNT(*) as total FROM tasks WHERE due_date < date('now','localtime') AND status NOT IN ('completed','cancelled')").get().total;

  const perUser = db.prepare(`
    SELECT u.id, u.name,
      COUNT(t.id) as total,
      SUM(CASE WHEN t.status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN t.priority = 'urgent' AND t.status NOT IN ('completed','cancelled') THEN 1 ELSE 0 END) as urgent
    FROM users u
    LEFT JOIN tasks t ON t.assigned_to = u.id
    WHERE u.active = 1
    GROUP BY u.id
    ORDER BY u.name
  `).all();

  res.json({
    // Clients / Finance
    totalClients,
    clientesPagados: pagados,
    clientesPendientes: pendientes,
    clientesAbonados: abonados,
    totalEstimated,
    totalPagado,
    totalPendiente,
    totalAbonado,
    inKindCount,
    inKindEstimated,
    // Tasks
    tasksTotal,
    tasksPending,
    tasksInProgress,
    tasksCompleted,
    tasksCancelled,
    tasksUrgent,
    tasksOverdue,
    completionRate: tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0,
    perUser
  });
});

app.listen(PORT, () => {
  console.log(`CRM Backend running on http://localhost:${PORT}`);
});
