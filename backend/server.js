import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import clientRoutes from './routes/clients.js';
import taskRoutes from './routes/tasks.js';
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

app.get('/api/stats', (req, res) => {
  const clients = db.prepare('SELECT COUNT(*) as total FROM clients').get();
  const pendingPayments = db.prepare("SELECT COUNT(*) as total FROM clients WHERE payment_status = 'Pendiente'").get();
  const tasksPending = db.prepare("SELECT COUNT(*) as total FROM tasks WHERE status = 'pending'").get();
  const tasksInProgress = db.prepare("SELECT COUNT(*) as total FROM tasks WHERE status = 'in_progress'").get();

  res.json({
    totalClients: clients.total,
    pendingPayments: pendingPayments.total,
    tasksPending: tasksPending.total,
    tasksInProgress: tasksInProgress.total
  });
});

app.listen(PORT, () => {
  console.log(`CRM Backend running on http://localhost:${PORT}`);
});
