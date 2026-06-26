import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import api from '../api';

export default function Communications() {
  const [tab, setTab] = useState('dashboard');
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [stats, setStats] = useState({ byStatus: [], byType: [] });
  const [communications, setCommunications] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [form, setForm] = useState({ employee_name: '', department_id: '', document_type_id: '', status: 'asignado', priority: 'media', notes: '' });
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');

  const load = (page = 1) => {
    api.get('/communications', { params: { page, limit: 50 } }).then(r => {
      setCommunications(r.data.communications);
      setPagination({ page: r.data.page, totalPages: r.data.totalPages, total: r.data.total });
    });
    api.get('/departments').then(r => setDepartments(r.data));
    api.get('/employees').then(r => setEmployees(r.data));
    api.get('/document-types').then(r => setDocTypes(r.data));
    api.get('/communications/stats').then(r => setStats(r.data));
  };

  useEffect(() => { load(); }, []);

  const submitForm = async (e) => {
    e.preventDefault();
    if (!form.employee_name.trim()) return;
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    for (const f of files) fd.append('files', f);
    try {
      await api.post('/communications', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm({ employee_name: '', department_id: '', document_type_id: '', status: 'asignado', priority: 'media', notes: '' });
      setFiles([]);
      setError('');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear comunicación');
    }
  };

  const statusColors = { asignado: '#6b7280', en_redaccion: '#f59e0b', en_revision: '#3b82f6', aprobado: '#10b981', entregado: '#6366f1' };
  const priorityLabels = { alta: 'Alta', media: 'Media', baja: 'Baja' };
  const statusLabels = { asignado: 'Asignado', en_redaccion: 'En Redacción', en_revision: 'En Revisión', aprobado: 'Aprobado', entregado: 'Entregado' };

  const statusOptions = ['asignado', 'en_redaccion', 'en_revision', 'aprobado', 'entregado'];

  const token = localStorage.getItem('token');

  return (
    <div>
      <h1>Gestión de Comunicaciones</h1>

      <div className="tabs" style={{ marginBottom: '1.5rem' }}>
        <button className={`filter-btn ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>Dashboard</button>
        <button className={`filter-btn ${tab === 'new' ? 'active' : ''}`} onClick={() => setTab('new')}>Nueva Solicitud</button>
        <button className={`filter-btn ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>Solicitudes</button>
      </div>

      {tab === 'dashboard' && (
        <div>
          <div className="dashboard-layout" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px' }}>
              <div className="cards-row">
                {statusOptions.map(s => {
                  const count = stats.byStatus.find(x => x.status === s)?.count || 0;
                  return (
                    <div key={s} className="card stat-card" style={{ borderTop: `3px solid ${statusColors[s]}` }}>
                      <div className="stat-value">{count}</div>
                      <div className="stat-label">{statusLabels[s]}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="card" style={{ flex: '1 1 300px' }}>
              <h3>Distribución por Estado</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={statusOptions.map(s => ({ name: statusLabels[s], value: stats.byStatus.find(x => x.status === s)?.count || 0 }))} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={3}>
                    {statusOptions.map(s => <Cell key={s} fill={statusColors[s]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <h3>Por Tipo de Documento</h3>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <div style={{ flex: '1 1 250px' }}>
                <div className="cards-row">
                  {stats.byType.map(t => (
                    <div key={t.name || 'Sin tipo'} className="card stat-card" style={{ borderTop: '3px solid #8b5cf6', minWidth: 0 }}>
                      <div className="stat-value">{t.count}</div>
                      <div className="stat-label">{t.name || 'Sin tipo'}</div>
                    </div>
                  ))}
                  {stats.byType.length === 0 && <p className="empty-state">Sin comunicaciones</p>}
                </div>
              </div>
              <div style={{ flex: '1 1 300px' }}>
                {stats.byType.length > 0 && (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={stats.byType.map(t => ({ name: t.name || 'Sin tipo', value: t.count }))} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {stats.byType.map((t, i) => <Cell key={t.name || i} fill={['#8b5cf6','#3b82f6','#10b981','#f59e0b','#ef4444','#ec4899','#6366f1'][i % 7]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'new' && (
        <div className="card">
          <h2>Nueva Solicitud de Comunicación</h2>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={submitForm}>
            <div className="form-grid">
              <label>Empleado:
                <select value={form.employee_name} onChange={e => setForm({ ...form, employee_name: e.target.value })} required>
                  <option value="">Seleccionar empleado</option>
                  {employees.map(e => (
                    <option key={e.id} value={`${e.first_name} ${e.last_name}`}>{e.first_name} {e.last_name}</option>
                  ))}
                </select>
              </label>
              <label>Departamento:
                <select value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
                  <option value="">Sin departamento</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </label>
              <label>Tipo de Documento:
                <select value={form.document_type_id} onChange={e => setForm({ ...form, document_type_id: e.target.value })}>
                  <option value="">Seleccionar tipo</option>
                  {docTypes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </label>
              <label>Prioridad:
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
              </label>
            </div>
            <label style={{ display: 'block', marginTop: '1rem' }}>Notas:
              <textarea className="full-width" rows="3" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ width: '100%', marginTop: '.25rem' }} />
            </label>
            <label style={{ display: 'block', marginTop: '1rem' }}>Archivos (max 10, 5 MB c/u):
              <input type="file" multiple onChange={e => setFiles([...e.target.files])} style={{ display: 'block', marginTop: '.25rem' }} />
            </label>
            {files.length > 0 && <p style={{ marginTop: '.5rem', color: '#666' }}>{files.length} archivo(s) seleccionado(s)</p>}
            <button type="submit" className="btn primary" style={{ marginTop: '1rem' }}>Crear Solicitud</button>
          </form>
        </div>
      )}

      {tab === 'list' && (
        <div className="card">
          <h2>Solicitudes ({pagination.total})</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Empleado</th>
                  <th>Departamento</th>
                  <th>Tipo Documento</th>
                  <th>Estado</th>
                  <th>Prioridad</th>
                  <th>Archivos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {communications.map(c => (
                  <tr key={c.id}>
                    <td>{c.folio}</td>
                    <td>{c.employee_name}</td>
                    <td>{c.department_name || '-'}</td>
                    <td>{c.document_type_name || '-'}</td>
                    <td>
                      <select value={c.status} onChange={async (e) => {
                        try { await api.put(`/communications/${c.id}`, { status: e.target.value }); load(pagination.page); }
                        catch (err) { alert('Error al actualizar estado'); }
                      }} style={{ padding: '.25rem', borderRadius: '4px', border: `1px solid ${statusColors[c.status] || '#ccc'}` }}>
                        {statusOptions.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
                      </select>
                    </td>
                    <td><span className={`badge ${c.priority}`}>{priorityLabels[c.priority]}</span></td>
                    <td>
                      {c.files?.map(f => (
                        <a key={f.id} href={`${api.defaults.baseURL}/communications/download/${f.id}?token=${token}`} target="_blank" rel="noreferrer" style={{ display: 'block' }}>{f.original_name}</a>
                      ))}
                      {(!c.files || c.files.length === 0) && '-'}
                    </td>
                    <td>
                      <button className="btn small danger" onClick={async () => {
                        if (confirm(`¿Eliminar ${c.folio}?`)) { await api.delete(`/communications/${c.id}`); load(pagination.page); }
                      }}>Eliminar</button>
                    </td>
                  </tr>
                ))}
                {communications.length === 0 && <tr><td colSpan="8" className="empty-state">Sin solicitudes</td></tr>}
              </tbody>
            </table>
          </div>
          {pagination.totalPages > 1 && (
            <div className="pagination" style={{ marginTop: '1rem', display: 'flex', gap: '.5rem', justifyContent: 'center' }}>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} className={`btn small ${p === pagination.page ? 'primary' : ''}`} onClick={() => load(p)}>{p}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
