import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function fmt(n) {
  return '$' + (n || 0).toLocaleString('es-MX');
}

export default function Patrocinios() {
  const navigate = useNavigate();
  const [patrocinios, setPatrocinios] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [formErrors, setFormErrors] = useState([]);

  // Detail panel
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Documents
  const [uploading, setUploading] = useState(false);

  // Tasks
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium', assigned_to: '' });
  const [users, setUsers] = useState([]);
  const [packages, setPackages] = useState([]);

  const load = () => {
    api.get(`/patrocinios?page=${page}&search=${search}`).then((r) => {
      setPatrocinios(r.data.patrocinios);
      setTotalPages(r.data.totalPages);
    });
  };

  const loadStats = () => {
    api.get('/patrocinios/stats').then((r) => setStats(r.data)).catch(() => {});
  };

  const loadUsers = () => {
    api.get('/users').then((r) => setUsers(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  };

  const loadPackages = () => {
    api.get('/packages').then((r) => setPackages(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  };

  useEffect(() => { load(); }, [page, search]);
  useEffect(() => { loadStats(); loadUsers(); loadPackages(); }, []);

  // ── Detail panel ──
  const openDetail = async (p) => {
    setSelected(p);
    setDetailLoading(true);
    try {
      const r = await api.get(`/patrocinios/${p.id}`);
      setDetail(r.data);
    } catch {
      setDetail(null);
    }
    setDetailLoading(false);
  };

  const closeDetail = () => {
    setSelected(null);
    setDetail(null);
  };

  // ── CRUD ──
  const validateForm = () => {
    const errs = [];
    if (form.sponsorship_type && !['Monetario', 'Especie', 'Especie/Monetario', 'Pendiente'].includes(form.sponsorship_type)) {
      errs.push('Tipo de patrocinio inválido');
    }
    if (form.payment_status && !['Pagado', 'Pendiente', 'Abonado', 'Cancelado'].includes(form.payment_status)) {
      errs.push('Estado de pago inválido');
    }
    if (form.visit_status && !['Visitado', 'En linea', 'Visita pendiente', 'Visita agendada', 'No quiso'].includes(form.visit_status)) {
      errs.push('Estado de visita inválido');
    }
    setFormErrors(errs);
    return errs.length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    try {
      if (editing) {
        await api.put(`/patrocinios/${editing}`, form);
      } else {
        await api.post('/patrocinios', form);
      }
      setShowForm(false);
      setEditing(null);
      setForm({});
      setFormErrors([]);
      load();
      loadStats();
    } catch (err) {
      const data = err.response?.data;
      if (data?.details) setFormErrors(data.details);
      else if (data?.error) setFormErrors([data.error]);
      else setFormErrors(['Error al guardar']);
    }
  };

  const handleEdit = (p) => {
    setForm({ ...p });
    setEditing(p.id);
    setShowForm(true);
    setFormErrors([]);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este patrocinio?')) return;
    await api.delete(`/patrocinios/${id}`);
    if (selected?.id === id) closeDetail();
    load();
    loadStats();
  };

  const openNew = () => {
    setForm({});
    setEditing(null);
    setFormErrors([]);
    setShowForm(!showForm);
  };

  const set = (field, value) => setForm({ ...form, [field]: value });

  // ── Document upload ──
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !detail) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('category', 'general');
    try {
      await api.post(`/patrocinios/${detail.id}/documents`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const r = await api.get(`/patrocinios/${detail.id}`);
      setDetail(r.data);
    } catch (err) {
      alert('Error al subir archivo: ' + (err.response?.data?.error || err.message));
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleDeleteDoc = async (docId) => {
    if (!confirm('¿Eliminar este documento?')) return;
    await api.delete(`/patrocinios/${detail.id}/documents/${docId}`);
    const r = await api.get(`/patrocinios/${detail.id}`);
    setDetail(r.data);
  };

  // ── Tasks ──
  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return;
    await api.post(`/patrocinios/${detail.id}/tasks`, newTask);
    setNewTask({ title: '', priority: 'medium', assigned_to: '' });
    const r = await api.get(`/patrocinios/${detail.id}`);
    setDetail(r.data);
  };

  // ── Helper ──
  const statusColor = (s) => {
    const map = {
      'Pagado': 'success', 'Abonado': 'info', 'Pendiente': 'warning', 'Cancelado': 'danger',
      'Visitado': 'success', 'En linea': 'info', 'Visita pendiente': 'warning', 'Visita agendada': 'info', 'No quiso': 'danger',
      'Cumplido': 'success', 'No': 'danger', 'No requiere': 'neutral',
      'Entregados': 'success'
    };
    return map[s] || '';
  };

  return (
    <div>
      <div className="page-header">
        <h1>Patrocinios</h1>
          <button className="btn success" onClick={openNew}>
            {showForm ? 'Cancelar' : '+ Nuevo Patrocinio'}
          </button>
      </div>

      {/* ── Stats ── */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <span className="stat-num">{stats.total}</span>
            <span className="stat-label">Total Patrocinios</span>
          </div>
          <div className="stat-card success">
            <span className="stat-num">{fmt(stats.totalPagado)}</span>
            <span className="stat-label">Recaudado</span>
            <span className="stat-sub">{stats.byPayment?.find(p => p.payment_status === 'Pagado')?.count || 0} pagados</span>
          </div>
          <div className="stat-card warning">
            <span className="stat-num">{fmt(stats.totalPendiente)}</span>
            <span className="stat-label">Por Cobrar</span>
            <span className="stat-sub">{stats.byPayment?.find(p => p.payment_status === 'Pendiente')?.count || 0} pendientes</span>
          </div>
          <div className="stat-card info">
            <span className="stat-num">{fmt(stats.totalAbonado)}</span>
            <span className="stat-label">Abonado Parcial</span>
          </div>
          <div className="stat-card" style={{ borderLeftColor: '#8b5cf6' }}>
            <span className="stat-num">{stats.inKindCount}</span>
            <span className="stat-label">En Especie</span>
            <span className="stat-sub">{fmt(stats.inKindEstimated)} estimado</span>
          </div>
          <div className="stat-card" style={{ borderLeftColor: '#f59e0b' }}>
            <span className="stat-num">{fmt(stats.totalEstimated)}</span>
            <span className="stat-label">Meta Total</span>
          </div>
        </div>
      )}

      {/* ── Search ── */}
      <input
        className="search-input"
        placeholder="Buscar por patrocinador, contacto o alumno..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
      />

      {/* ── Form Modal ── */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditing(null); setFormErrors([]); }}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? 'Editar Patrocinio' : 'Nuevo Patrocinio'}</h2>

            {formErrors.length > 0 && (
              <div className="form-errors">
                {formErrors.map((e, i) => <p key={i} style={{ color: '#dc2626', margin: '2px 0' }}>⚠ {e}</p>)}
              </div>
            )}

            <div className="form-grid">
              <input placeholder="Nombre del patrocinador (empresa o persona)" value={form.company_name || ''} onChange={(e) => set('company_name', e.target.value)} />
              <input placeholder="Nombre de la persona que dio el patrocinio" value={form.contact_person || ''} onChange={(e) => set('contact_person', e.target.value)} />
              <input placeholder="Contacto (teléfono)" value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
              <select value={form.sponsorship_type || ''} onChange={(e) => set('sponsorship_type', e.target.value)}>
                <option value="">Tipo de patrocinio</option>
                <option>Monetario</option>
                <option>Especie</option>
                <option>Especie/Monetario</option>
                <option>Pendiente</option>
              </select>
              <select value={form.package || ''} onChange={(e) => set('package', e.target.value)}>
                <option value="">Paquete</option>
                {packages.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
              <select value={form.visit_status || ''} onChange={(e) => set('visit_status', e.target.value)}>
                <option value="">Visitado o Falta por visitar</option>
                <option>Visitado</option>
                <option>En linea</option>
                <option>Visita pendiente</option>
                <option>Visita agendada</option>
                <option>No quiso</option>
              </select>
              <select value={form.payment_status || ''} onChange={(e) => set('payment_status', e.target.value)}>
                <option value="">Pagado o no</option>
                <option>Pagado</option>
                <option>Pendiente</option>
                <option>Abonado</option>
                <option>Cancelado</option>
              </select>
              <input placeholder="Alumno que lo consiguió" value={form.student_obtained || ''} onChange={(e) => set('student_obtained', e.target.value)} />
              <input placeholder="Alumno que se comunicó" value={form.student_contacted || ''} onChange={(e) => set('student_contacted', e.target.value)} />
              <textarea className="full-width" placeholder="En caso de ser en especie, registrar lo que se acordó" value={form.in_kind_detail || ''} onChange={(e) => set('in_kind_detail', e.target.value)} />
              <input placeholder="Cantidad abonada y nombre del alumno que recibió" value={form.payment_detail || ''} onChange={(e) => set('payment_detail', e.target.value)} />
              <select value={form.social_media_fulfilled || ''} onChange={(e) => set('social_media_fulfilled', e.target.value)}>
                <option value="">Patrocinio cumplido en redes</option>
                <option>Cumplido</option>
                <option>No</option>
                <option>No requiere</option>
              </select>
              <select value={form.tickets_delivered || ''} onChange={(e) => set('tickets_delivered', e.target.value)}>
                <option value="">Boletos entregados</option>
                <option>Entregados</option>
                <option>No</option>
                <option>No requiere</option>
              </select>
              <input placeholder="Pedir logo (PDF, .ai o .eps)" value={form.logo_requested || ''} onChange={(e) => set('logo_requested', e.target.value)} />
              <textarea className="full-width" placeholder="Notas" value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} />
            </div>
            <button className="btn" onClick={handleSave} style={{ marginTop: '1rem' }}>Guardar</button>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th title="Nombre del Patrocinador (empresa o persona)">Patrocinador</th>
              <th title="Nombre de la persona que dio el patrocinio">Persona</th>
              <th title="Contacto de la persona que dio el patrocinio">Teléfono</th>
              <th title="Tipo de patrocinio">Tipo</th>
              <th title="Paquete">Paquete</th>
              <th title="Visitado o Falta por visitar">Visita</th>
              <th title="Pagado o no">Pago</th>
              <th title="Alumno que lo consiguió">Alumno</th>
              <th title="Alumno que se comunicó">Alumno Contactado</th>
              <th title="Patrocinio cumplido en redes">Redes</th>
              <th title="Boletos entregados">Boletos</th>
              <th title="Usuario que creó el registro">Creado por</th>
              <th title="Porcentaje de avance del checklist del paquete">Avance</th>
              <th title="Acciones disponibles">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {patrocinios.map((p) => (
              <tr key={p.id}
                className={selected?.id === p.id ? 'row-selected' : ''}
                onClick={() => openDetail(p)}
                style={{ cursor: 'pointer' }}
              >
                <td><strong>{p.company_name || 'Sin nombre'}</strong></td>
                <td>{p.contact_person || '-'}</td>
                <td>{p.phone || '-'}</td>
                <td><span className={`status-badge ${statusColor(p.sponsorship_type)}`}>{p.sponsorship_type || '-'}</span></td>
                <td>{p.package || '-'}</td>
                <td><span className={`status-badge ${statusColor(p.visit_status)}`}>{p.visit_status || '-'}</span></td>
                <td><span className={`status-badge ${statusColor(p.payment_status)}`}>{p.payment_status || '-'}</span></td>
                <td>{p.student_obtained || '-'}</td>
                <td>{p.student_contacted || '-'}</td>
                <td><span className={`status-badge ${statusColor(p.social_media_fulfilled)}`}>{p.social_media_fulfilled || '-'}</span></td>
                <td><span className={`status-badge ${statusColor(p.tickets_delivered)}`}>{p.tickets_delivered || '-'}</span></td>
                <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{p.created_by_name || '—'}</td>
                <td style={{ minWidth: '100px' }}>
                  {p.checklist_total > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                      <div className="mini-progress-track">
                        <div className="mini-progress-fill" style={{ width: `${Math.round((p.checklist_completed / p.checklist_total) * 100)}%` }} />
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: p.checklist_completed === p.checklist_total ? '#16a34a' : '#64748b', whiteSpace: 'nowrap' }}>
                        {Math.round((p.checklist_completed / p.checklist_total) * 100)}%
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>—</span>
                  )}
                </td>
                <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                  <button className="icon-btn seguimiento" title="Seguimiento" onClick={() => navigate(`/patrocinios/${p.id}/seguimiento`)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                      <rect x="9" y="3" width="6" height="4" rx="1"/>
                      <path d="M9 14l2 2 4-4"/>
                    </svg>
                  </button>
                  <button className="icon-btn edit" title="Editar" onClick={() => handleEdit(p)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button className="icon-btn danger" title="Eliminar" onClick={() => handleDelete(p.id)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      <line x1="10" y1="11" x2="10" y2="17"/>
                      <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
            {patrocinios.length === 0 && (
              <tr><td colSpan="14" style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Sin patrocinios registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
        <span>Página {page} de {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Siguiente</button>
      </div>

      {/* ═══════════════════════════════════════════════════════
          DETAIL PANEL (slide-over)
         ═══════════════════════════════════════════════════════ */}
      {selected && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div className="modal modal-wide detail-panel" onClick={(e) => e.stopPropagation()}
               style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            {detailLoading ? (
              <p style={{ textAlign: 'center', padding: '2rem' }}>Cargando detalle...</p>
            ) : detail ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ margin: 0 }}>{detail.company_name || 'Sin nombre'}</h2>
                  <button className="btn-sm" onClick={closeDetail}>✕ Cerrar</button>
                </div>

                {/* Info Grid */}
                <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>CONTACTO</label>{detail.contact_person || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>TELÉFONO</label>{detail.phone || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>TIPO</label><span className={`status-badge ${statusColor(detail.sponsorship_type)}`}>{detail.sponsorship_type || '—'}</span></div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>PAQUETE</label>{detail.package || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>VISITA</label><span className={`status-badge ${statusColor(detail.visit_status)}`}>{detail.visit_status || '—'}</span></div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>PAGO</label><span className={`status-badge ${statusColor(detail.payment_status)}`}>{detail.payment_status || '—'}</span></div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>ALUMNO QUE LO CONSIGUIÓ</label>{detail.student_obtained || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>ALUMNO QUE SE COMUNICÓ</label>{detail.student_contacted || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>REDES SOCIALES</label>{detail.social_media_fulfilled || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>BOLETOS</label>{detail.tickets_delivered || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>LOGO</label>{detail.logo_requested || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>DETALLE ESPECIE</label>{detail.in_kind_detail || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>DETALLE PAGO</label>{detail.payment_detail || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>NOTAS</label>{detail.notes || '—'}</div>
                </div>

                {/* Audit info */}
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1.5rem', padding: '0.5rem', background: '#f8fafc', borderRadius: '6px' }}>
                  <strong>Creado por:</strong> {detail.created_by_name || '—'} ·{' '}
                  <strong>Fecha:</strong> {detail.created_at || '—'}
                  {detail.updated_by_name && (
                    <> · <strong>Última modificación:</strong> {detail.updated_by_name} ({detail.updated_at || '—'})</>
                  )}
                </div>

                {/* ── Documents ── */}
                <h3>Documentos</h3>
                <div style={{ marginBottom: '1rem' }}>
                  <input
                    type="file"
                    onChange={handleUpload}
                    disabled={uploading}
                    style={{ fontSize: '0.85rem' }}
                  />
                  {uploading && <span style={{ marginLeft: '0.5rem', color: '#64748b' }}>Subiendo...</span>}
                </div>
                {detail.documents && detail.documents.length > 0 ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Archivo</th>
                        <th>Tipo</th>
                        <th>Tamaño</th>
                        <th>Subido por</th>
                        <th>Fecha</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.documents.map((doc) => (
                        <tr key={doc.id}>
                          <td>{doc.original_name}</td>
                          <td style={{ fontSize: '0.75rem' }}>{doc.mime_type}</td>
                          <td style={{ fontSize: '0.75rem' }}>{(doc.size / 1024).toFixed(1)} KB</td>
                          <td style={{ fontSize: '0.75rem' }}>{doc.uploaded_by_name || '—'}</td>
                          <td style={{ fontSize: '0.75rem' }}>{doc.created_at}</td>
                          <td>
                            <a
                              href={`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/patrocinios/${detail.id}/documents/${doc.id}/download`}
                              className="btn-sm"
                              style={{ textDecoration: 'none', display: 'inline-block' }}
                              download
                            >Descargar</a>
                            <button className="btn-sm btn-danger" onClick={() => handleDeleteDoc(doc.id)} style={{ marginLeft: '0.25rem' }}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sin documentos adjuntos</p>
                )}

                {/* ── Tasks ── */}
                <h3 style={{ marginTop: '1.5rem' }}>Tareas vinculadas</h3>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <input
                    placeholder="Nueva tarea..."
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    style={{ flex: 1, minWidth: '200px' }}
                  />
                  <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                    <option value="low">Baja</option>
                  </select>
                  <select value={newTask.assigned_to} onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}>
                    <option value="">Asignar a...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <button className="btn" onClick={handleCreateTask} disabled={!newTask.title.trim()}>Agregar</button>
                </div>
                {detail.tasks && detail.tasks.length > 0 ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Título</th>
                        <th>Estado</th>
                        <th>Prioridad</th>
                        <th>Asignado</th>
                        <th>Fecha límite</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.tasks.map((t) => (
                        <tr key={t.id}>
                          <td>{t.title}</td>
                          <td><span className={`status-badge ${t.status}`}>{t.status}</span></td>
                          <td><span className={`priority-badge ${t.priority}`}>{t.priority}</span></td>
                          <td>{t.assigned_name || '—'}</td>
                          <td>{t.due_date || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sin tareas vinculadas</p>
                )}
              </>
            ) : (
              <p style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>Error al cargar detalle</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
