import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import ComunicadoPatrocinio from '../components/ComunicadoPatrocinio';
import SeguimientoSolicitud from '../components/SeguimientoSolicitud';

const fmt = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 });

const COMMITTEES = [
  'Finanzas', 'Comunicados', 'Diseño', 'Decoración', 'Redes',
  'Patrocinio', 'Logística', 'Producción Audiovisual', 'Conferencistas', 'Otro'
];

const SOLICITUD_STATUS = { pendiente: 'Pendiente', aprobada: 'Aprobada', rechazada: 'Rechazada', pagada: 'Pagada' };
const SOLICITUD_PRIORITY = { baja: 'Baja', media: 'Media', alta: 'Alta', urgente: 'Urgente' };

function TabMisSolicitudes() {
  const [data, setData] = useState({ solicitudes: [], total: 0, byStatus: [], totalPages: 1 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    date: '', committee: '', responsible: '', concept: '', justification: '',
    amount_requested: '', priority: 'media', impact_if_not_done: '', email: ''
  });
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [seguimientoId, setSeguimientoId] = useState(null);

  const load = useCallback(() => {
    const params = { page, limit: 20, mine: 'true' };
    if (statusFilter) params.status = statusFilter;
    api.get('/finance/solicitudes', { params }).then(r => setData(r.data));
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/employees').then(r => setEmployees(r.data)); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date || !form.committee || !form.responsible || !form.concept || !form.amount_requested) {
      setError('Todos los campos marcados con * son requeridos');
      return;
    }
    setSubmitting(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      for (const f of files) fd.append('files', f);
      await api.post('/finance/solicitudes', fd);
      setShowForm(false);
      setForm({ date: '', committee: '', responsible: '', concept: '', justification: '', amount_requested: '', priority: 'media', impact_if_not_done: '', email: '' });
      setFiles([]); setPage(1); load();
    } catch (err) { setError(err.response?.data?.error || 'Error al crear solicitud'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta solicitud?')) return;
    await api.delete(`/finance/solicitudes/${id}`);
    load();
  };

  const statusCounts = {};
  (data.byStatus || []).forEach(s => { statusCounts[s.status] = s.count; });

  return (
    <div>
      <div className="filter-bar">
        <button className={`filter-btn ${!statusFilter ? 'active' : ''}`} onClick={() => { setStatusFilter(''); setPage(1); }}>Todas ({data.total})</button>
        {Object.entries(SOLICITUD_STATUS).map(([k, v]) => (
          <button key={k} className={`filter-btn ${statusFilter === k ? 'active' : ''}`} onClick={() => { setStatusFilter(k); setPage(1); }}>
            {v} ({statusCounts[k] || 0})
          </button>
        ))}
      </div>

      <div className="page-header">
        <h2>Finanzas</h2>
        <button className="btn primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nueva Solicitud'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h3>Registrar Solicitud</h3>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
              <select value={form.committee} onChange={e => setForm({ ...form, committee: e.target.value })} required>
                <option value="">— Comité Solicitante *</option>
                {COMMITTEES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} required>
                <option value="">— Responsable *</option>
                {employees.filter(e => e.active).map(emp => (
                  <option key={emp.id} value={`${emp.first_name} ${emp.last_name}`}>{emp.first_name} {emp.last_name}</option>
                ))}
              </select>
              <input placeholder="Concepto del gasto *" value={form.concept} onChange={e => setForm({ ...form, concept: e.target.value })} required />
              <textarea className="full-width" placeholder="Descripción / Justificación" value={form.justification} onChange={e => setForm({ ...form, justification: e.target.value })} />
              <input type="number" step="0.01" min="0" placeholder="Monto solicitado *" value={form.amount_requested} onChange={e => setForm({ ...form, amount_requested: e.target.value })} required />
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                {Object.entries(SOLICITUD_PRIORITY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <textarea className="full-width" placeholder="¿Qué pasaría si este gasto no se realiza?" value={form.impact_if_not_done} onChange={e => setForm({ ...form, impact_if_not_done: e.target.value })} />
              <input type="email" placeholder="Correo electrónico" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              <div className="full-width">
                <label style={{ fontSize: '.85rem', color: 'var(--text-light)', display: 'block', marginBottom: '.3rem' }}>Cotización / Archivos adjuntos</label>
                <input type="file" multiple onChange={e => setFiles(Array.from(e.target.files).slice(0, 5))} />
              </div>
            </div>
            <button className="btn primary" type="submit" disabled={submitting} style={{ marginTop: '1rem' }}>{submitting ? 'Guardando...' : 'Registrar Solicitud'}</button>
          </form>
        </div>
      )}

      <div className="card">
        {data.solicitudes.length === 0 ? (
          <p className="empty-state">No hay solicitudes registradas</p>
        ) : (
          <div className="task-list">
            {data.solicitudes.map(s => (
              <div key={s.id} className="task-card" style={{ borderLeftColor: s.status === 'aprobada' ? 'var(--success)' : s.status === 'rechazada' ? 'var(--danger)' : s.status === 'pagada' ? 'var(--info)' : 'var(--warning)' }}>
                <div className="task-header">
                  <div>
                    <h3>{s.concept}</h3>
                    <div className="task-meta">
                      <span>ID: {s.id}</span>
                      <span>{s.date}</span>
                      <span>Comité: {s.committee}</span>
                      <span>Responsable: {s.responsible}</span>
                      <span>Monto: {fmt(s.amount_requested)}</span>
                      <span className={`status-badge ${s.priority}`}>{SOLICITUD_PRIORITY[s.priority]}</span>
                    </div>
                  </div>
                  <div className="task-actions">
                    <span className={`status-badge ${s.status}`}>{SOLICITUD_STATUS[s.status]}</span>
                    <button className="btn small" onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                      {expandedId === s.id ? '▲' : '▼'} Detalle
                    </button>
                    <button className="btn small" onClick={() => setSeguimientoId(seguimientoId === s.id ? null : s.id)}>
                      Seguimiento
                    </button>
                    <button className="btn small danger" onClick={() => handleDelete(s.id)}>🗑</button>
                  </div>
                </div>

                {expandedId === s.id && (
                  <div style={{ marginTop: '.75rem', paddingTop: '.75rem', borderTop: '1px solid var(--border)' }}>
                    {s.justification && <p style={{ fontSize: '.85rem', marginBottom: '.5rem' }}><strong>Justificación:</strong> {s.justification}</p>}
                    {s.impact_if_not_done && <p style={{ fontSize: '.85rem', marginBottom: '.5rem' }}><strong>Impacto:</strong> {s.impact_if_not_done}</p>}
                    {s.reviewed_by_name && <p style={{ fontSize: '.85rem', marginBottom: '.5rem' }}><strong>Revisó:</strong> {s.reviewed_by_name}</p>}
                    {s.approved_by_name && <p style={{ fontSize: '.85rem', marginBottom: '.5rem' }}><strong>Aprobó:</strong> {s.approved_by_name}</p>}
                    {s.payment_date && <p style={{ fontSize: '.85rem', marginBottom: '.5rem' }}><strong>Fecha Pago:</strong> {s.payment_date}</p>}
                    {s.observations && <p style={{ fontSize: '.85rem', marginBottom: '.5rem' }}><strong>Observaciones:</strong> {s.observations}</p>}
                  </div>
                )}

                {seguimientoId === s.id && (
                  <div style={{ marginTop: '.75rem', paddingTop: '.75rem', borderTop: '1px solid var(--border)' }}>
                    <SeguimientoSolicitud solicitudId={s.id} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {data.totalPages > 1 && (
          <div className="pagination">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
            <span>Página {page} de {data.totalPages}</span>
            <button disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MisSolicitudes() {
  const [activeTab, setActiveTab] = useState('solicitudes');

  const tabs = [
    { key: 'solicitudes', label: 'Finanzas' },
    { key: 'comunicados', label: 'Mis Comunicados' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Solicitudes</h1>
      </div>
      <div className="page-tabs">
        {tabs.map(t => (
          <button key={t.key} className={activeTab === t.key ? 'active' : ''} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ marginTop: '1.5rem' }}>
        {activeTab === 'solicitudes' && <TabMisSolicitudes />}
        {activeTab === 'comunicados' && <ComunicadoPatrocinio />}
      </div>
    </div>
  );
}
