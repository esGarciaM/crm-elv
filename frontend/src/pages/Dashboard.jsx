import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [recentClients, setRecentClients] = useState([]);

  useEffect(() => {
    api.get('/stats').then((r) => setStats(r.data));
    api.get('/tasks?limit=5').then((r) => setRecentTasks(r.data));
    api.get('/clients?limit=5').then((r) => setRecentClients(r.data.clients));
  }, []);

  if (!stats) return <div className="loading">Cargando...</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-num">{stats.totalClients}</span>
          <span className="stat-label">Total Clientes</span>
        </div>
        <div className="stat-card warning">
          <span className="stat-num">{stats.pendingPayments}</span>
          <span className="stat-label">Pagos Pendientes</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{stats.tasksPending}</span>
          <span className="stat-label">Tareas Pendientes</span>
        </div>
        <div className="stat-card info">
          <span className="stat-num">{stats.tasksInProgress}</span>
          <span className="stat-label">Tareas en Progreso</span>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h2>Clientes Recientes</h2>
          <table>
            <thead><tr><th>Empresa</th><th>Tipo</th><th>Pago</th></tr></thead>
            <tbody>
              {recentClients.map((c) => (
                <tr key={c.id}>
                  <td><Link to={`/clients/${c.id}`}>{c.company_name || 'Sin nombre'}</Link></td>
                  <td>{c.sponsorship_type || '-'}</td>
                  <td>{c.payment_status || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h2>Tareas Recientes</h2>
          <table>
            <thead><tr><th>Título</th><th>Estado</th><th>Asignado</th></tr></thead>
            <tbody>
              {recentTasks.map((t) => (
                <tr key={t.id}>
                  <td><Link to={`/tasks`}>{t.title}</Link></td>
                  <td><span className={`status-badge ${t.status}`}>{t.status}</span></td>
                  <td>{t.assigned_name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
