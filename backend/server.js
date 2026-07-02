import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import clientRoutes from './routes/clients.js';
import taskRoutes from './routes/tasks.js';
import documentRoutes from './routes/documents.js';
import clientPortalRoutes from './routes/clientPortal.js';
import departmentRoutes from './routes/departments.js';
import employeeRoutes from './routes/employees.js';
import expenseRoutes from './routes/expenses.js';
import documentTypeRoutes from './routes/documentTypes.js';
import communicationRoutes from './routes/communications.js';
import packageRoutes from './routes/packages.js';
import patrocinioRoutes from './routes/patrocinios.js';
import patrocinioSeguimientoRoutes from './routes/patrocinio-seguimiento.js';
import { authMiddleware } from './middleware/auth.js';
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
app.use('/api/departments', departmentRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/document-types', documentTypeRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/patrocinios', patrocinioRoutes);
app.use('/api', patrocinioSeguimientoRoutes);

// Simple endpoint to list active users for assignment dropdowns
app.get('/api/users', authMiddleware, (req, res) => {
  const users = db.prepare("SELECT id, name, role FROM users WHERE active = 1 ORDER BY name").all();
  res.json(users);
});

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

  // ── Patrocinios Stats ──
  const totalPatrocinios = db.prepare('SELECT COUNT(*) as count FROM patrocinios').get().count;
  const patrociniosPkg = db.prepare("SELECT package, payment_status, sponsorship_type FROM patrocinios WHERE package IS NOT NULL AND package != ''").all();
  let patrociniosEstimated = 0;
  let patrociniosPagado = 0;
  let patrociniosPendiente = 0;
  let patrociniosAbonado = 0;
  let patrociniosInKind = 0;

  for (const p of patrociniosPkg) {
    const m = p.package.match(/\$*(\d[\d,]*)/);
    const amt = m ? parseInt(m[1].replace(/,/g, '')) : 0;
    patrociniosEstimated += amt;
    if (p.sponsorship_type && p.sponsorship_type.toLowerCase().includes('especie')) patrociniosInKind += amt;
    const st = p.payment_status || 'Pendiente';
    if (st === 'Pagado') patrociniosPagado += amt;
    else if (st === 'Pendiente') patrociniosPendiente += amt;
    else if (st === 'Abonado') patrociniosAbonado += amt;
  }

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
    // Patrocinios
    totalPatrocinios,
    patrociniosEstimated,
    patrociniosPagado,
    patrociniosPendiente,
    patrociniosAbonado,
    patrociniosInKind,
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
