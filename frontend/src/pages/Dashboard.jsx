import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import api from '../api';

function fmt(n) {
  return '$' + (n || 0).toLocaleString('es-MX');
}

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

  const pct = stats.totalEstimated > 0 ? Math.round((stats.totalPagado / stats.totalEstimated) * 100) : 0;
  const barWidth = Math.min(pct, 100);

  return (
    <div>
      <h1>Dashboard</h1>

      {/* ── Finanzas ── */}
      <h2 className="section-title">Finanzas</h2>
      <div className="stats-grid">
        <div className="stat-card success">
          <span className="stat-num">{stats.totalClients}</span>
          <span className="stat-label">Total Patrocinadores</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{fmt(stats.totalEstimated)}</span>
          <span className="stat-label">Meta Estimada Total</span>
          <span className="stat-sub">{stats.inKindCount} en especie ({fmt(stats.inKindEstimated)})</span>
        </div>
        <div className="stat-card success">
          <span className="stat-num">{fmt(stats.totalPagado)}</span>
          <span className="stat-label">Recaudado</span>
          <span className="stat-sub">{stats.clientesPagados} clientes pagados</span>
        </div>
        <div className="stat-card warning">
          <span className="stat-num">{fmt(stats.totalPendiente)}</span>
          <span className="stat-label">Por Cobrar (Pendiente)</span>
          <span className="stat-sub">{stats.clientesPendientes} clientes</span>
        </div>
        <div className="stat-card info">
          <span className="stat-num">{fmt(stats.totalAbonado)}</span>
          <span className="stat-label">Abonado Parcial</span>
          <span className="stat-sub">{stats.clientesAbonados} clientes</span>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="progress-card card">
        <div className="progress-header">
          <strong>Progreso de recaudación</strong>
          <span>{pct}% · {fmt(stats.totalPagado)} de {fmt(stats.totalEstimated)}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: barWidth + '%' }}></div>
        </div>
        <div className="progress-legend">
          <span><span className="dot pagado"></span> Pagado {fmt(stats.totalPagado)}</span>
          <span><span className="dot pendiente"></span> Pendiente {fmt(stats.totalPendiente)}</span>
          <span><span className="dot abonado"></span> Abonado {fmt(stats.totalAbonado)}</span>
        </div>
      </div>

      {/* ── Patrocinios por Grupo y Status ── */}
      <h2 className="section-title">Patrocinios por Grupo y Status</h2>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div className="card" style={{ flex: 1, padding: '1rem', minWidth: 0 }}>
          <h3 style={{ margin: '0 0 0.5rem', textAlign: 'center', fontSize: '0.95rem' }}>Por Grupo</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.byGrupo}
                dataKey="count"
                nameKey="grupo"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={50}
                label={({ grupo, count }) => `${grupo} (${count})`}
              >
                {stats.byGrupo.map((entry, idx) => (
                  <Cell key={idx} fill={['#00b4d8', '#a832d6', '#10b981', '#f59e0b', '#ef4444'][idx % 5]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{ flex: 1, padding: '1rem', minWidth: 0 }}>
          <h3 style={{ margin: '0 0 0.5rem', textAlign: 'center', fontSize: '0.95rem' }}>Por Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.bySponsorStatus}
                dataKey="count"
                nameKey="status_name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={50}
                label={({ status_name, count }) => `${status_name} (${count})`}
              >
                {stats.bySponsorStatus.map((entry, idx) => (
                  <Cell key={idx} fill={['#00b4d8', '#a832d6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][idx % 7]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Carga de Trabajo ── */}
      <h2 className="section-title">Carga de Trabajo del Equipo</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-num">{stats.tasksTotal}</span>
          <span className="stat-label">Total Tareas</span>
        </div>
        <div className="stat-card warning">
          <span className="stat-num">{stats.tasksPending}</span>
          <span className="stat-label">Pendientes</span>
        </div>
        <div className="stat-card info">
          <span className="stat-num">{stats.tasksInProgress}</span>
          <span className="stat-label">En Progreso</span>
        </div>
        <div className="stat-card success">
          <span className="stat-num">{stats.tasksCompleted}</span>
          <span className="stat-label">Completadas</span>
        </div>
        <div className="stat-card" style={{ borderLeftColor: 'var(--accent)' }}>
          <span className="stat-num">{stats.completionRate}%</span>
          <span className="stat-label">Tasa de Finalización</span>
        </div>
        {stats.tasksUrgent > 0 && (
          <div className="stat-card" style={{ borderLeftColor: 'var(--danger)' }}>
            <span className="stat-num">{stats.tasksUrgent}</span>
            <span className="stat-label">Urgentes</span>
          </div>
        )}
        {stats.tasksOverdue > 0 && (
          <div className="stat-card" style={{ borderLeftColor: 'var(--danger)' }}>
            <span className="stat-num">{stats.tasksOverdue}</span>
            <span className="stat-label">Vencidas</span>
          </div>
        )}
      </div>

      {/* Tareas por miembro del equipo */}
      <div className="card">
        <h2>Tareas por Miembro</h2>
        <table>
          <thead>
            <tr>
              <th>Miembro</th>
              <th>Total</th>
              <th>Pendientes</th>
              <th>En Progreso</th>
              <th>Completadas</th>
              <th>Urgentes</th>
            </tr>
          </thead>
          <tbody>
            {stats.perUser?.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.name}</strong></td>
                <td>{u.total}</td>
                <td>{u.pending}</td>
                <td>{u.in_progress}</td>
                <td>{u.completed}</td>
                <td>{u.urgent > 0 ? <span className="priority-badge urgent">{u.urgent}</span> : 0}</td>
              </tr>
            ))}
            {(!stats.perUser || stats.perUser.length === 0) && (
              <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-light)' }}>Sin usuarios activos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Recientes ── */}
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
