import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import SeguimientoSolicitud from '../components/SeguimientoSolicitud';

const fmt = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 });

const COMMITTEES = [
  'Finanzas', 'Comunicados', 'Diseño', 'Decoración', 'Redes',
  'Patrocinio', 'Logística', 'Producción Audiovisual', 'Conferencistas', 'Otro'
];

const SOLICITUD_STATUS = { pendiente: 'Pendiente', aprobada: 'Aprobada', rechazada: 'Rechazada', pagada: 'Pagada' };
const SOLICITUD_PRIORITY = { baja: 'Baja', media: 'Media', alta: 'Alta', urgente: 'Urgente' };

function fmtSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: RESUMEN
// ═══════════════════════════════════════════════════════════════════════════
function TabResumen() {
  const [data, setData] = useState(null);
  const [budgets, setBudgets] = useState([]);

  useEffect(() => {
    api.get('/finance/summary').then(r => setData(r.data));
    api.get('/finance/budgets').then(r => setBudgets(r.data.budgets || []));
  }, []);

  if (!data) return <div className="loading">Cargando...</div>;

  return (
    <div>
      <div className="finance-summary-grid">
        <div className="finance-summary-card income">
          <div className="label">Total Aportaciones</div>
          <div className="value" style={{ color: 'var(--success)' }}>{fmt(data.totalContributions)}</div>
        </div>
        <div className="finance-summary-card expense">
          <div className="label">Total Salidas</div>
          <div className="value" style={{ color: 'var(--danger)' }}>{fmt(data.totalExpenses)}</div>
        </div>
        <div className="finance-summary-card balance">
          <div className="label">Balance Final</div>
          <div className="value" style={{ color: data.balanceFinal >= 0 ? 'var(--info)' : 'var(--danger)' }}>{fmt(data.balanceFinal)}</div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card warning">
          <span className="stat-num">{data.solicitudes?.pendingCount || 0}</span>
          <span className="stat-label">Solicitudes Pendientes</span>
          <span className="stat-sub">{fmt(data.solicitudes?.pendingTotal)}</span>
        </div>
        <div className="stat-card success">
          <span className="stat-num">{data.solicitudes?.approvedCount || 0}</span>
          <span className="stat-label">Solicitudes Aprobadas</span>
          <span className="stat-sub">{fmt(data.solicitudes?.approvedTotal)}</span>
        </div>
        <div className="stat-card info">
          <span className="stat-num">{data.solicitudes?.paidCount || 0}</span>
          <span className="stat-label">Solicitudes Pagadas</span>
          <span className="stat-sub">{fmt(data.solicitudes?.paidTotal)}</span>
        </div>
      </div>

      {budgets.length > 0 && (
        <div className="card">
          <h2>Presupuestos por Comité</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Comité</th><th>Presupuesto</th><th>Gastado</th><th>Disponible</th><th>Estado</th><th>Uso</th></tr>
              </thead>
              <tbody>
                {budgets.map(b => {
                  const available = b.budget - b.spent;
                  const pct = b.budget > 0 ? Math.min(100, (b.spent / b.budget) * 100) : 0;
                  const fillClass = b.status === 'OK' ? 'ok' : b.status === 'Alerta' ? 'alert' : 'riesgo';
                  return (
                    <tr key={b.committee}>
                      <td><strong>{b.committee}</strong></td>
                      <td>{fmt(b.budget)}</td>
                      <td>{fmt(b.spent)}</td>
                      <td style={{ color: available < 0 ? 'var(--danger)' : 'var(--success)' }}>{fmt(available)}</td>
                      <td><span className={`status-badge ${b.status === 'OK' ? 'completed' : b.status === 'Alerta' ? 'pending' : 'rejected'}`}>{b.status}</span></td>
                      <td style={{ minWidth: 120 }}>
                        <div className="budget-bar">
                          <div className="budget-bar-track">
                            <div className={`budget-bar-fill ${fillClass}`} style={{ width: pct + '%' }} />
                          </div>
                          <span style={{ fontSize: '.75rem', color: 'var(--text-light)' }}>{Math.round(pct)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: APORTACIONES
// ═══════════════════════════════════════════════════════════════════════════
function TabAportaciones() {
  const [data, setData] = useState({ contributions: [], total: 0, bySalon: [] });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: '', salon: '', amount: '', description: '' });
  const [error, setError] = useState('');
  const [editId, setEditId] = useState(null);

  const load = useCallback(() => {
    api.get('/finance/contributions').then(r => setData(r.data));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date || !form.salon || !form.amount) { setError('Fecha, salón y monto son requeridos'); return; }
    setError('');
    try {
      if (editId) {
        await api.put(`/finance/contributions/${editId}`, form);
      } else {
        await api.post('/finance/contributions', form);
      }
      setShowForm(false); setEditId(null);
      setForm({ date: '', salon: '', amount: '', description: '' });
      load();
    } catch (err) { setError(err.response?.data?.error || 'Error'); }
  };

  const handleEdit = (c) => {
    setForm({ date: c.date, salon: c.salon, amount: c.amount, description: c.description || '' });
    setEditId(c.id); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta aportación?')) return;
    await api.delete(`/finance/contributions/${id}`);
    load();
  };

  const bySalonMap = {};
  (data.bySalon || []).forEach(s => { bySalonMap[s.salon] = s.total; });

  return (
    <div>
      <div className="stats-grid">
        {['A', 'B', 'C', 'D'].map(s => (
          <div key={s} className="stat-card">
            <span className="stat-num">{fmt(bySalonMap[s] || 0)}</span>
            <span className="stat-label">Salón {s}</span>
          </div>
        ))}
        <div className="stat-card info">
          <span className="stat-num">{fmt(data.total)}</span>
          <span className="stat-label">TOTAL</span>
        </div>
      </div>

      <div className="page-header">
        <h2>Aportaciones por Salón</h2>
        <button className="btn primary" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ date: '', salon: '', amount: '', description: '' }); }}>
          {showForm ? 'Cancelar' : '+ Nueva Aportación'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2>{editId ? 'Editar Aportación' : 'Registrar Aportación'}</h2>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
              <select value={form.salon} onChange={e => setForm({ ...form, salon: e.target.value })} required>
                <option value="">— Seleccionar Salón —</option>
                <option value="A">Salón A</option>
                <option value="B">Salón B</option>
                <option value="C">Salón C</option>
                <option value="D">Salón D</option>
              </select>
              <input type="number" step="0.01" min="0" placeholder="Monto *" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
              <input placeholder="Descripción" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <button className="btn primary" type="submit">{editId ? 'Actualizar' : 'Registrar'}</button>
          </form>
        </div>
      )}

      <div className="card">
        {data.contributions.length === 0 ? (
          <p className="empty-state">No hay aportaciones registradas</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Fecha</th><th>Salón</th><th>Monto</th><th>Descripción</th><th>Acciones</th></tr></thead>
              <tbody>
                {data.contributions.map(c => (
                  <tr key={c.id}>
                    <td>{c.date}</td>
                    <td><span className="status-badge info">Salón {c.salon}</span></td>
                    <td><strong>{fmt(c.amount)}</strong></td>
                    <td>{c.description || '—'}</td>
                    <td>
                      <div className="actions-cell">
                        <button className="icon-btn edit" onClick={() => handleEdit(c)} title="Editar">✏</button>
                        <button className="icon-btn danger" onClick={() => handleDelete(c.id)} title="Eliminar">🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: PATROCINIOS (vista financiera)
// ═══════════════════════════════════════════════════════════════════════════
function TabPatrocinios() {
  const [data, setData] = useState({ sponsorships: [], totalCash: 0, totalKind: 0, totalPaid: 0, totalEspecie: 0, totalGeneral: 0 });
  const [filters, setFilters] = useState({
    sponsorship_type: '', payment_status: '', visit_status: '',
    student_obtained: '', student_contacted: '', q: ''
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPatrocinio, setSelectedPatrocinio] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '', payment_date: new Date().toISOString().split('T')[0],
    payment_method: '', reference: '', notes: ''
  });
  const [paymentHistory, setPaymentHistory] = useState({ payments: [], totalCash: 0, totalKind: 0, totalPaid: 0 });
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    const params = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    api.get('/finance/sponsorships', { params }).then(r => setData(r.data));
  };

  useEffect(() => { load(); }, []);

  const applyFilter = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    const params = {};
    Object.entries(next).forEach(([k, v]) => { if (v) params[k] = v; });
    api.get('/finance/sponsorships', { params }).then(r => setData(r.data));
  };

  const clearFilters = () => {
    const empty = { sponsorship_type: '', payment_status: '', visit_status: '', student_obtained: '', student_contacted: '', q: '' };
    setFilters(empty);
    api.get('/finance/sponsorships').then(r => setData(r.data));
  };

  const hasFilters = Object.values(filters).some(v => v);

  const openPaymentModal = (patrocinio) => {
    setSelectedPatrocinio(patrocinio);
    setPaymentForm({
      amount: '', payment_date: new Date().toISOString().split('T')[0],
      payment_method: '', reference: '', notes: ''
    });
    setError('');
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentForm.amount || !paymentForm.payment_date) {
      setError('Monto y fecha son requeridos');
      return;
    }
    try {
      await api.post(`/finance/sponsorships/${selectedPatrocinio.id}/payments`, paymentForm);
      setShowPaymentModal(false);
      setSelectedPatrocinio(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar pago');
    }
  };

  const openHistoryModal = async (patrocinio) => {
    setSelectedPatrocinio(patrocinio);
    try {
      const res = await api.get(`/finance/sponsorships/${patrocinio.id}/payments`);
      setPaymentHistory(res.data);
      setShowHistoryModal(true);
    } catch (err) {
      alert('Error al cargar historial');
    }
  };

  const deletePayment = async (paymentId) => {
    if (!confirm('¿Eliminar este pago?')) return;
    try {
      await api.delete(`/finance/sponsorships/payments/${paymentId}`);
      if (selectedPatrocinio) {
        const res = await api.get(`/finance/sponsorships/${selectedPatrocinio.id}/payments`);
        setPaymentHistory(res.data);
      }
      load();
    } catch (err) {
      alert('Error al eliminar pago');
    }
  };

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card success">
          <span className="stat-num">{fmt(data.totalCash)}</span>
          <span className="stat-label">Total en Efectivo</span>
        </div>
        <div className="stat-card warning">
          <span className="stat-num">{fmt(data.totalKind)}</span>
          <span className="stat-label">Total en Especie</span>
        </div>
        <div className="stat-card info">
          <span className="stat-num">{fmt(data.totalGeneral)}</span>
          <span className="stat-label">Total General</span>
        </div>
      </div>
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card success">
          <span className="stat-num">{fmt(data.totalPaid)}</span>
          <span className="stat-label">Total Pagado (Efectivo)</span>
        </div>
        <div className="stat-card warning">
          <span className="stat-num">{fmt(data.totalEspecie)}</span>
          <span className="stat-label">Total Pagado (Especie)</span>
        </div>
        <div className="stat-card info">
          <span className="stat-num">{fmt(data.totalPaid + data.totalEspecie)}</span>
          <span className="stat-label">Suma Total Pagado</span>
        </div>
      </div>
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card success">
          <span className="stat-num">{fmt(Math.max(0, data.totalCash - data.totalPaid))}</span>
          <span className="stat-label">Por Pagar Efectivo</span>
        </div>
        <div className="stat-card warning">
          <span className="stat-num">{fmt(Math.max(0, data.totalKind - data.totalEspecie))}</span>
          <span className="stat-label">Por Pagar Especie</span>
        </div>
        <div className="stat-card info">
          <span className="stat-num">{fmt(Math.max(0, data.totalGeneral - data.totalPaid - data.totalEspecie))}</span>
          <span className="stat-label">Por Pagar Total</span>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem', flexWrap: 'wrap', gap: '.5rem' }}>
          <h2 style={{ margin: 0 }}>Detalle de Patrocinios</h2>
          {hasFilters && <button className="btn small" onClick={clearFilters}>Limpiar filtros</button>}
        </div>

        <div className="filter-bar" style={{ marginBottom: '.75rem' }}>
          <input
            className="search-input" style={{ maxWidth: 220, marginBottom: 0 }}
            placeholder="Buscar empresa, contacto..."
            value={filters.q} onChange={e => applyFilter('q', e.target.value)}
          />
          <select value={filters.sponsorship_type} onChange={e => applyFilter('sponsorship_type', e.target.value)}>
            <option value="">Tipo patrocinio</option>
            <option value="Monetario">Monetario</option>
            <option value="Especie">Especie</option>
            <option value="Especie/Monetario">Especie/Monetario</option>
          </select>
          <select value={filters.payment_status} onChange={e => applyFilter('payment_status', e.target.value)}>
            <option value="">Estado pago</option>
            <option value="Pagado">Pagado</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Abonado">Abonado</option>
            <option value="Cancelado">Cancelado</option>
          </select>
          <select value={filters.visit_status} onChange={e => applyFilter('visit_status', e.target.value)}>
            <option value="">Estado visita</option>
            <option value="Visitado">Visitado</option>
            <option value="En linea">En línea</option>
            <option value="Visita pendiente">Visita pendiente</option>
            <option value="Visita agendada">Visita agendada</option>
            <option value="No quiso">No quiso</option>
          </select>
          <input
            style={{ maxWidth: 180, padding: '.4rem .65rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '.8rem' }}
            placeholder="Alumno obtenido"
            value={filters.student_obtained} onChange={e => applyFilter('student_obtained', e.target.value)}
          />
          <input
            style={{ maxWidth: 180, padding: '.4rem .65rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '.8rem' }}
            placeholder="Alumno contactado"
            value={filters.student_contacted} onChange={e => applyFilter('student_contacted', e.target.value)}
          />
        </div>

        {data.sponsorships.length === 0 ? (
          <p className="empty-state">No hay patrocinios{hasFilters ? ' que coincidan con los filtros' : ' registrados'}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Fecha</th><th>Empresa</th><th>Contacto</th><th>Tipo</th><th>Paquete</th><th>Monto Monetario</th><th>Monto Especie</th><th>Estado Pago</th><th>Pagado Efectivo</th><th>Pagado Especie</th><th>Visita</th><th>Acciones</th></tr></thead>
              <tbody>
                {data.sponsorships.map(p => (
                  <tr key={p.id}>
                    <td>{p.date ? new Date(p.date).toLocaleDateString('es-MX') : '—'}</td>
                    <td><strong>{p.company_name || '—'}</strong></td>
                    <td>{p.contact_person || '—'}</td>
                    <td><span className={`status-badge ${p.sponsorship_type?.toLowerCase().includes('especie') ? 'pending' : 'completed'}`}>{p.sponsorship_type || '—'}</span></td>
                    <td>{p.package || '—'}</td>
                    <td style={{ color: p.monetary_amount > 0 ? 'var(--success)' : 'var(--text-muted)', fontWeight: p.monetary_amount > 0 ? 600 : 400 }}>{fmt(p.monetary_amount)}</td>
                    <td style={{ color: p.in_kind_amount > 0 ? 'var(--warning)' : 'var(--text-muted)', fontWeight: p.in_kind_amount > 0 ? 600 : 400 }}>{fmt(p.in_kind_amount)}</td>
                    <td><span className={`status-badge ${(p.payment_status || 'Pendiente').charAt(0).toUpperCase() + (p.payment_status || 'Pendiente').slice(1)}`}>{p.payment_status || 'Pendiente'}</span></td>
                    <td style={{ color: p.total_paid_cash > 0 ? 'var(--success)' : 'var(--text-muted)', fontWeight: p.total_paid_cash > 0 ? 600 : 400 }}>{fmt(p.total_paid_cash)}</td>
                    <td style={{ color: p.total_paid_kind > 0 ? 'var(--warning)' : 'var(--text-muted)', fontWeight: p.total_paid_kind > 0 ? 600 : 400 }}>{fmt(p.total_paid_kind)}</td>
                    <td>{p.visit_status || '—'}</td>
                    <td>
                      <div className="actions-cell">
                        <button className="btn small primary" onClick={() => openPaymentModal(p)} title="Capturar Pago">$ Pago</button>
                        <button className="btn small" onClick={() => openHistoryModal(p)} title="Historial">Historial</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Captura de Pago */}
      {showPaymentModal && selectedPatrocinio && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <h2>Capturar Pago - {selectedPatrocinio.company_name}</h2>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handlePaymentSubmit}>
              <div className="form-grid">
                <input type="number" step="0.01" min="0" placeholder="Monto *" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} required />
                <input type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} required />
                <select value={paymentForm.payment_method} onChange={e => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}>
                  <option value="">— Método de Pago —</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Especie">Especie</option>
                  <option value="Otro">Otro</option>
                </select>
                <input placeholder="Referencia / Folio" value={paymentForm.reference} onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })} />
                <input className="full-width" placeholder="Notas" value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '.5rem', marginTop: '1rem' }}>
                <button className="btn primary" type="submit">Registrar Pago</button>
                <button className="btn" type="button" onClick={() => setShowPaymentModal(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Historial de Pagos */}
      {showHistoryModal && selectedPatrocinio && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <h2>Historial de Pagos - {selectedPatrocinio.company_name}</h2>
            <div style={{ marginBottom: '1rem', padding: '.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', display: 'flex', gap: '1.5rem' }}>
              <div><strong>Efectivo: </strong><span style={{ color: 'var(--success)', fontSize: '1.1rem' }}>{fmt(paymentHistory.totalCash)}</span></div>
              <div><strong>Especie: </strong><span style={{ color: 'var(--warning)', fontSize: '1.1rem' }}>{fmt(paymentHistory.totalKind)}</span></div>
              <div><strong>Total: </strong><span style={{ color: 'var(--text)', fontSize: '1.1rem' }}>{fmt(paymentHistory.totalPaid)}</span></div>
            </div>
            {paymentHistory.payments.length === 0 ? (
              <p className="empty-state">No hay pagos registrados</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Fecha</th><th>Monto</th><th>Método</th><th>Referencia</th><th>Notas</th><th>Acciones</th></tr>
                  </thead>
                  <tbody>
                    {paymentHistory.payments.map(p => (
                      <tr key={p.id}>
                        <td>{p.payment_date}</td>
                        <td><strong style={{ color: 'var(--success)' }}>{fmt(p.amount)}</strong></td>
                        <td>{p.payment_method || '—'}</td>
                        <td>{p.reference || '—'}</td>
                        <td>{p.notes || '—'}</td>
                        <td>
                          <button className="icon-btn danger" onClick={() => deletePayment(p.id)} title="Eliminar">🗑</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button className="btn" style={{ marginTop: '1rem' }} onClick={() => setShowHistoryModal(false)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: SOLICITUDES
// ═══════════════════════════════════════════════════════════════════════════
function TabSolicitudes() {
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
    const params = { page, limit: 20 };
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

  const updateStatus = async (id, status) => {
    await api.put(`/finance/solicitudes/${id}`, { status });
    load();
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
        <h2>Solicitudes de Gasto</h2>
        <button className="btn primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nueva Solicitud'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2>Registrar Solicitud</h2>
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
            <button className="btn primary" type="submit" disabled={submitting}>{submitting ? 'Guardando...' : 'Registrar Solicitud'}</button>
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
                    <select className="status-select" value={s.status} onChange={e => updateStatus(s.id, e.target.value)}>
                      <option value="pendiente">Pendiente</option>
                      <option value="aprobada">Aprobada</option>
                      <option value="rechazada">Rechazada</option>
                      <option value="pagada">Pagada</option>
                    </select>
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
                    {s.created_by_name && <p style={{ fontSize: '.85rem' }}><strong>Creado por:</strong> {s.created_by_name}</p>}
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

// ═══════════════════════════════════════════════════════════════════════════
// TAB: SALIDAS
// ═══════════════════════════════════════════════════════════════════════════
function TabSalidas() {
  const [data, setData] = useState({ expenses: [], total: 0, byCommittee: [] });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: '', committee: '', concept: '', amount: '', responsible: '', notes: '' });
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]);
  const [filters, setFilters] = useState({ committee: '', responsible: '', q: '', from: '', to: '' });

  const load = useCallback(() => {
    const params = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    api.get('/finance/expenses', { params }).then(r => setData(r.data));
  }, []);

  useEffect(() => { load(); }, [load]);

  const applyFilter = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    const params = {};
    Object.entries(next).forEach(([k, v]) => { if (v) params[k] = v; });
    api.get('/finance/expenses', { params }).then(r => setData(r.data));
  };

  const clearFilters = () => {
    const empty = { committee: '', responsible: '', q: '', from: '', to: '' };
    setFilters(empty);
    api.get('/finance/expenses').then(r => setData(r.data));
  };

  const hasFilters = Object.values(filters).some(v => v);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date || !form.concept || !form.responsible || !form.amount) {
      setError('Fecha, concepto, responsable y monto son requeridos'); return;
    }
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      for (const f of files) fd.append('files', f);
      await api.post('/finance/expenses', fd);
      setShowForm(false);
      setForm({ date: '', committee: '', concept: '', amount: '', responsible: '', notes: '' });
      setFiles([]); load();
    } catch (err) { setError(err.response?.data?.error || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta salida?')) return;
    await api.delete(`/finance/expenses/${id}`);
    load();
  };

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card expense">
          <span className="stat-num">{fmt(data.total)}</span>
          <span className="stat-label">Total Salidas</span>
        </div>
        {data.byCommittee.filter(c => c.committee).slice(0, 4).map(c => (
          <div key={c.committee} className="stat-card">
            <span className="stat-num">{fmt(c.total)}</span>
            <span className="stat-label">{c.committee}</span>
          </div>
        ))}
      </div>

      <div className="page-header">
        <h2>Registro de Salidas</h2>
        <button className="btn primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nueva Salida'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2>Registrar Salida</h2>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
              <select value={form.committee} onChange={e => setForm({ ...form, committee: e.target.value })}>
                <option value="">— Comité / Área —</option>
                {COMMITTEES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input placeholder="Concepto *" value={form.concept} onChange={e => setForm({ ...form, concept: e.target.value })} required />
              <input type="number" step="0.01" min="0" placeholder="Monto *" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
              <input placeholder="Responsable *" value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} required />
              <input placeholder="Notas" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              <div className="full-width">
                <label style={{ fontSize: '.85rem', color: 'var(--text-light)', display: 'block', marginBottom: '.3rem' }}>Comprobantes</label>
                <input type="file" multiple onChange={e => setFiles(Array.from(e.target.files).slice(0, 5))} />
              </div>
            </div>
            <button className="btn primary" type="submit">Registrar Salida</button>
          </form>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem', flexWrap: 'wrap', gap: '.5rem' }}>
          <h2 style={{ margin: 0 }}>Registro de Salidas</h2>
          {hasFilters && <button className="btn small" onClick={clearFilters}>Limpiar filtros</button>}
        </div>

        <div className="filter-bar" style={{ marginBottom: '.75rem' }}>
          <input
            className="search-input" style={{ maxWidth: 220, marginBottom: 0 }}
            placeholder="Buscar concepto, notas..."
            value={filters.q} onChange={e => applyFilter('q', e.target.value)}
          />
          <select value={filters.committee} onChange={e => applyFilter('committee', e.target.value)}>
            <option value="">Comité / Área</option>
            {COMMITTEES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            style={{ maxWidth: 180, padding: '.4rem .65rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '.8rem' }}
            placeholder="Responsable"
            value={filters.responsible} onChange={e => applyFilter('responsible', e.target.value)}
          />
          <input
            type="date" style={{ maxWidth: 160, padding: '.4rem .65rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '.8rem' }}
            value={filters.from} onChange={e => applyFilter('from', e.target.value)}
          />
          <input
            type="date" style={{ maxWidth: 160, padding: '.4rem .65rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '.8rem' }}
            value={filters.to} onChange={e => applyFilter('to', e.target.value)}
          />
        </div>

        {data.expenses.length === 0 ? (
          <p className="empty-state">No hay salidas{hasFilters ? ' que coincidan con los filtros' : ' registradas'}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Fecha</th><th>Comité</th><th>Concepto</th><th>Monto</th><th>Responsable</th><th>Notas</th><th>Acciones</th></tr></thead>
              <tbody>
                {data.expenses.map(e => (
                  <tr key={e.id}>
                    <td>{e.id}</td>
                    <td>{e.date}</td>
                    <td>{e.committee || '—'}</td>
                    <td><strong>{e.concept}</strong></td>
                    <td>{fmt(e.amount)}</td>
                    <td>{e.responsible}</td>
                    <td>{e.notes || '—'}</td>
                    <td>
                      <button className="icon-btn danger" onClick={() => handleDelete(e.id)} title="Eliminar">🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: REPORTES MENSUALES
// ═══════════════════════════════════════════════════════════════════════════
function TabReportes() {
  const [reports, setReports] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const [reportData, setReportData] = useState(null);
  const [writtenReport, setWrittenReport] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get('/finance/monthly-reports').then(r => setReports(r.data));
  }, []);

  useEffect(() => { load(); }, [load]);

  const generatePreview = async () => {
    try {
      const r = await api.post('/finance/monthly-reports/generate', { month: parseInt(form.month), year: parseInt(form.year) });
      setReportData(r.data);
      setWrittenReport(r.data.written_report || '');
    } catch (err) { setError(err.response?.data?.error || 'Error al generar'); }
  };

  const saveReport = async () => {
    if (!reportData) return;
    try {
      await api.post('/finance/monthly-reports', {
        ...reportData, written_report: writtenReport
      });
      setShowForm(false); setReportData(null); load();
    } catch (err) { setError(err.response?.data?.error || 'Error al guardar'); }
  };

  const deleteReport = async (id) => {
    if (!confirm('¿Eliminar este reporte?')) return;
    await api.delete(`/finance/monthly-reports/${id}`);
    load();
  };

  const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  return (
    <div>
      <div className="page-header">
        <h2>Reportes Mensuales</h2>
        <button className="btn primary" onClick={() => { setShowForm(!showForm); setReportData(null); setError(''); }}>
          {showForm ? 'Cancelar' : '+ Generar Reporte'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2>Generar Reporte Mensual</h2>
          {error && <div className="error-msg">{error}</div>}
          <div className="form-grid">
            <select value={form.month} onChange={e => setForm({ ...form, month: e.target.value })}>
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
            <input type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} min="2020" max="2030" />
          </div>
          <button className="btn" onClick={generatePreview}>Generar Vista Previa</button>

          {reportData && (
            <div style={{ marginTop: '1rem' }}>
              <div className="finance-summary-grid">
                <div className="finance-summary-card">
                  <div className="label">Saldo Inicial</div>
                  <div className="value">{fmt(reportData.initial_balance)}</div>
                </div>
                <div className="finance-summary-card income">
                  <div className="label">Aportaciones</div>
                  <div className="value">{fmt(reportData.contributions_total)}</div>
                </div>
                <div className="finance-summary-card expense">
                  <div className="label">Salidas</div>
                  <div className="value">{fmt(reportData.expenses_total)}</div>
                </div>
                <div className="finance-summary-card balance">
                  <div className="label">Saldo Final</div>
                  <div className="value">{fmt(reportData.final_balance)}</div>
                </div>
              </div>

              <div className="field" style={{ marginTop: '1rem' }}>
                <label>Reporte Escrito del Mes</label>
                <textarea
                  rows={6}
                  value={writtenReport}
                  onChange={e => setWrittenReport(e.target.value)}
                  placeholder="Descripción narrativa del periodo financiero..."
                  style={{ width: '100%', padding: '.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '.9rem', resize: 'vertical' }}
                />
              </div>

              <button className="btn primary" onClick={saveReport} style={{ marginTop: '.75rem' }}>Guardar Reporte</button>
            </div>
          )}
        </div>
      )}

      <div className="card">
        {reports.length === 0 ? (
          <p className="empty-state">No hay reportes mensuales generados</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Periodo</th><th>Saldo Inicial</th><th>Aportaciones</th><th>Patrocinios Efectivo</th><th>Patrocinios Especie</th><th>Salidas</th><th>Saldo Final</th><th>Acciones</th></tr></thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.id}>
                    <td><strong>{MONTHS[r.month - 1]} {r.year}</strong></td>
                    <td>{fmt(r.initial_balance)}</td>
                    <td>{fmt(r.contributions_total)}</td>
                    <td>{fmt(r.sponsorships_cash)}</td>
                    <td>{fmt(r.sponsorships_kind)}</td>
                    <td>{fmt(r.expenses_total)}</td>
                    <td style={{ color: r.final_balance >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>{fmt(r.final_balance)}</td>
                    <td>
                      <button className="icon-btn danger" onClick={() => deleteReport(r.id)} title="Eliminar">🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const TABS = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'aportaciones', label: 'Aportaciones' },
  { key: 'patrocinios', label: 'Patrocinios' },
  { key: 'solicitudes', label: 'Solicitudes' },
  { key: 'salidas', label: 'Salidas' },
  { key: 'reportes', label: 'Reportes' },
];

export default function Finance() {
  const [tab, setTab] = useState('resumen');

  return (
    <div>
      <div className="page-header">
        <h1>Finanzas</h1>
      </div>

      <div className="finance-tabs">
        {TABS.map(t => (
          <button key={t.key} className={`finance-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'resumen' && <TabResumen />}
      {tab === 'aportaciones' && <TabAportaciones />}
      {tab === 'patrocinios' && <TabPatrocinios />}
      {tab === 'solicitudes' && <TabSolicitudes />}
      {tab === 'salidas' && <TabSalidas />}
      {tab === 'reportes' && <TabReportes />}
    </div>
  );
}
