import { useState, useEffect } from 'react';
import api from '../api';

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function iconFor(mime) {
  if (mime.includes('pdf')) return '📄';
  if (mime.includes('image')) return '🖼';
  if (mime.includes('word') || mime.includes('document')) return '📝';
  if (mime.includes('excel') || mime.includes('spreadsheet')) return '📊';
  if (mime.includes('text')) return '📃';
  return '📎';
}

const statusLabels = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  paid: 'Pagado'
};

export default function Finance() {
  const [expenses, setExpenses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [deptFilter, setDeptFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedId, setExpandedId] = useState(null);

  const [form, setForm] = useState({
    responsible_name: '', concept: '', description: '', justification: '',
    amount: '', required_date: '', impact_if_not_done: '', department_id: ''
  });
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadExpenses = () => {
    const params = { page, limit: 20 };
    if (deptFilter) params.department_id = deptFilter;
    api.get('/expenses', { params }).then(r => {
      setExpenses(r.data.expenses);
      setTotalPages(r.data.totalPages);
    });
  };

  useEffect(() => {
    api.get('/departments').then(r => setDepartments(r.data));
    api.get('/employees').then(r => setEmployees(r.data));
  }, []);

  useEffect(() => { loadExpenses(); }, [page, deptFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.responsible_name.trim() || !form.concept.trim() || !form.amount) {
      setError('Responsable, concepto y monto son requeridos');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      for (let i = 0; i < files.length; i++) fd.append('files', files[i]);
      await api.post('/expenses', fd);
      setShowForm(false);
      setForm({ responsible_name: '', concept: '', description: '', justification: '', amount: '', required_date: '', impact_if_not_done: '', department_id: '' });
      setFiles([]);
      setPage(1);
      loadExpenses();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear gasto');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id, status) => {
    await api.put(`/expenses/${id}`, { status });
    loadExpenses();
  };

  const deleteExpense = async (id) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    await api.delete(`/expenses/${id}`);
    loadExpenses();
  };

  const totalAmount = expenses.reduce((s, e) => {
    const st = e.status;
    if (st === 'approved' || st === 'paid' || st === 'pending') return s + e.amount;
    return s;
  }, 0);

  return (
    <div>
      <div className="page-header">
        <h1>Finanzas</h1>
        <div className="page-actions">
          <button className="btn" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : '+ Nuevo Gasto'}
          </button>
        </div>
      </div>

      {expenses.length > 0 && (
        <div className="stats-grid" style={{ marginBottom: '1rem' }}>
          <div className="stat-card info">
            <span className="stat-num">${totalAmount.toLocaleString()}</span>
            <span className="stat-label">Total en Gastos</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">{expenses.length}</span>
            <span className="stat-label">Gastos Registrados</span>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card">
          <h2>Registrar Gasto</h2>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <select value={form.responsible_name} onChange={e => setForm({ ...form, responsible_name: e.target.value })} required>
                <option value="">— Seleccionar responsable —</option>
                {employees.filter(e => e.active).map(emp => (
                  <option key={emp.id} value={`${emp.first_name} ${emp.last_name}`}>{emp.first_name} {emp.last_name}</option>
                ))}
              </select>
              <input placeholder="Concepto del gasto *" value={form.concept} onChange={e => setForm({ ...form, concept: e.target.value })} required />
              <textarea className="full-width" placeholder="Descripción / Justificación" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <input type="number" step="0.01" min="0" placeholder="Monto solicitado *" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
              <input type="date" placeholder="Fecha requerida" value={form.required_date} onChange={e => setForm({ ...form, required_date: e.target.value })} />
              <textarea className="full-width" placeholder="¿Qué pasaría si este gasto no se realiza?" value={form.impact_if_not_done} onChange={e => setForm({ ...form, impact_if_not_done: e.target.value })} />
              <select value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
                <option value="">— Departamento —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <div className="full-width">
                <label style={{ fontSize: '.85rem', color: 'var(--text-light)', display: 'block', marginBottom: '.3rem' }}>
                  Archivos (hasta 5, máx 10 MB c/u): PDF, Documento, Imagen, Hoja de cálculo
                </label>
                <input
                  type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.csv,.txt"
                  onChange={e => setFiles(Array.from(e.target.files).slice(0, 5))}
                />
                {files.length > 0 && (
                  <div style={{ marginTop: '.5rem', fontSize: '.8rem', color: 'var(--text-light)' }}>
                    {files.map((f, i) => <div key={i}>{f.name} ({fmtSize(f.size)})</div>)}
                  </div>
                )}
              </div>
            </div>
            <button className="btn primary" type="submit" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Registrar Gasto'}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        {expenses.length === 0 ? (
          <p className="empty-state">No hay gastos registrados</p>
        ) : (
          <div className="task-list">
            {expenses.map(e => (
              <div key={e.id} className="task-card" style={{ borderLeftColor: e.status === 'approved' ? 'var(--success)' : e.status === 'rejected' ? 'var(--danger)' : e.status === 'paid' ? 'var(--info)' : 'var(--warning)' }}>
                <div className="task-header">
                  <div>
                    <h3>{e.concept}</h3>
                    <div className="task-meta">
                      <span>Responsable: {e.responsible_name}</span>
                      {e.department_name && <span>Depto: {e.department_name}</span>}
                      <span>Monto: ${Number(e.amount).toLocaleString()}</span>
                      {e.required_date && <span>Requiere: {e.required_date}</span>}
                    </div>
                  </div>
                  <div className="task-actions">
                    <span className={`status-badge ${e.status}`}>{statusLabels[e.status] || e.status}</span>
                    <select className="status-select" value={e.status} onChange={ev => updateStatus(e.id, ev.target.value)}>
                      <option value="pending">Pendiente</option>
                      <option value="approved">Aprobado</option>
                      <option value="rejected">Rechazado</option>
                      <option value="paid">Pagado</option>
                    </select>
                    <button className="btn small" onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}>
                      {expandedId === e.id ? '▲' : '▼'} Detalle
                    </button>
                    <button className="btn small danger" onClick={() => deleteExpense(e.id)}>🗑</button>
                  </div>
                </div>

                {expandedId === e.id && (
                  <div style={{ marginTop: '.75rem', paddingTop: '.75rem', borderTop: '1px solid var(--border)' }}>
                    {e.description && <p style={{ fontSize: '.85rem', marginBottom: '.5rem' }}><strong>Descripción:</strong> {e.description}</p>}
                    {e.justification && <p style={{ fontSize: '.85rem', marginBottom: '.5rem' }}><strong>Justificación:</strong> {e.justification}</p>}
                    {e.impact_if_not_done && <p style={{ fontSize: '.85rem', marginBottom: '.5rem' }}><strong>Impacto si no se realiza:</strong> {e.impact_if_not_done}</p>}
                    {e.quote_date && <p style={{ fontSize: '.85rem', marginBottom: '.5rem' }}><strong>Fecha cotización:</strong> {e.quote_date}</p>}
                    {e.created_by_name && <p style={{ fontSize: '.85rem', marginBottom: '.5rem' }}><strong>Creado por:</strong> {e.created_by_name}</p>}

                    {e.files && e.files.length > 0 && (
                      <div style={{ marginTop: '.5rem' }}>
                        <strong style={{ fontSize: '.85rem' }}>Archivos:</strong>
                        <div className="docs-list" style={{ marginTop: '.35rem' }}>
                          {e.files.map(f => (
                            <div key={f.id} className="doc-item">
                              <span className="doc-icon">{iconFor(f.mime_type)}</span>
                              <div className="doc-info">
                                <a href={`/api/expenses/download/${f.id}?token=${localStorage.getItem('token')}`} target="_blank" rel="noopener noreferrer" className="doc-name">{f.original_name}</a>
                                <span className="doc-meta">{fmtSize(f.size)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
            <span>Página {page} de {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</button>
          </div>
        )}
      </div>
    </div>
  );
}
