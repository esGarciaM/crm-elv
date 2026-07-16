import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import api from '../api';
import SeguimientoComunicado from '../components/SeguimientoComunicado';

export default function Communications() {
  const [tab, setTab] = useState('dashboard');
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [stats, setStats] = useState({ byStatus: [], byType: [] });
  const [communications, setCommunications] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [form, setForm] = useState({ employee_name: '', department_id: '', document_type_id: '', status: 'asignado', priority: 'media', notes: '', image_url: '', video_url: '' });
  const [error, setError] = useState('');
  const [seguimientoId, setSeguimientoId] = useState(null);
  const [patrocinios, setPatrocinios] = useState([]);
  const [pStats, setPStats] = useState({ totalCash: 0, totalKind: 0, totalMixed: 0, totalPaid: 0, totalGeneral: 0 });
  const [pSearch, setPSearch] = useState('');
  const [showDocUrlsModal, setShowDocUrlsModal] = useState(false);
  const [selectedPatrocinio, setSelectedPatrocinio] = useState(null);
  const [docUrls, setDocUrls] = useState([]);
  const [docUrlsSaving, setDocUrlsSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewDocName, setPreviewDocName] = useState('');
  const [previewSaving, setPreviewSaving] = useState(false);

  const fmt = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 });

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

  const loadPatrocinios = () => {
    const params = {};
    if (pSearch) params.q = pSearch;
    api.get('/finance/sponsorships', { params }).then(r => {
      setPatrocinios(r.data.sponsorships);
      setPStats({ totalCash: r.data.totalCash, totalKind: r.data.totalKind, totalMixed: r.data.totalMixed, totalPaid: r.data.totalPaid, totalGeneral: r.data.totalGeneral });
    });
  };

  useEffect(() => { if (tab === 'patrocinios') loadPatrocinios(); }, [tab, pSearch]);

  const openDocUrls = (p) => {
    setSelectedPatrocinio(p);
    setShowDocUrlsModal(true);
    const clientDocTypes = docTypes.filter(dt => dt.is_client);
    api.get(`/patrocinio-doc-urls/${p.id}`).then(r => {
      const existing = r.data;
      setDocUrls(clientDocTypes.map(dt => {
        const found = existing.find(e => e.document_type_id === dt.id);
        return { document_type_id: dt.id, document_type_name: dt.name, url: found ? found.url || '' : '' };
      }));
    });
  };

  const saveDocUrls = async () => {
    setDocUrlsSaving(true);
    try {
      await api.put(`/patrocinio-doc-urls/${selectedPatrocinio.id}`, { urls: docUrls });
      setShowDocUrlsModal(false);
      setSelectedPatrocinio(null);
    } catch {
      alert('Error al guardar URLs');
    }
    setDocUrlsSaving(false);
  };

  const generateDoc = async (docTypeId, docTypeName) => {
    try {
      const res = await api.post(`/patrocinio-doc-urls/${selectedPatrocinio.id}/generate`, { document_type_id: docTypeId });
      setPreviewHtml(res.data.html);
      setPreviewUrl(res.data.url);
      setPreviewDocName(docTypeName);
    } catch (e) {
      alert(e.response?.data?.error || 'Error al generar documento');
    }
  };

  const saveEditedDoc = async (docTypeId) => {
    setPreviewSaving(true);
    try {
      const res = await api.put(`/patrocinio-doc-urls/${selectedPatrocinio.id}/regenerate`, { document_type_id: docTypeId, html: previewHtml });
      setPreviewUrl(res.data.url);
      const next = docUrls.map(d => d.document_type_id === docTypeId ? { ...d, url: res.data.url } : d);
      setDocUrls(next);
    } catch (e) {
      alert(e.response?.data?.error || 'Error al guardar');
    }
    setPreviewSaving(false);
  };

  useEffect(() => { load(); }, []);

  const submitForm = async (e) => {
    e.preventDefault();
    if (!form.employee_name.trim()) return;
    try {
      await api.post('/communications', form);
      setForm({ employee_name: '', department_id: '', document_type_id: '', status: 'asignado', priority: 'media', notes: '', image_url: '', video_url: '' });
      setError('');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear comunicación');
    }
  };

  const statusColors = { asignado: 'var(--text-light)', en_redaccion: 'var(--warning)', en_revision: 'var(--info)', aprobado: 'var(--success)', entregado: 'var(--accent)' };
  const priorityLabels = { alta: 'Alta', media: 'Media', baja: 'Baja' };
  const statusLabels = { asignado: 'Asignado', en_redaccion: 'En Redacción', en_revision: 'En Revisión', aprobado: 'Aprobado', entregado: 'Entregado' };

  const statusOptions = ['asignado', 'en_redaccion', 'en_revision', 'aprobado', 'entregado'];

  return (
    <div>
      <h1>Gestión de Comunicaciones</h1>

      <div className="finance-tabs">
        <button className={`finance-tab ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>Dashboard</button>
        <button className={`finance-tab ${tab === 'new' ? 'active' : ''}`} onClick={() => setTab('new')}>Nueva Solicitud</button>
        <button className={`finance-tab ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>Solicitudes</button>
        <button className={`finance-tab ${tab === 'patrocinios' ? 'active' : ''}`} onClick={() => setTab('patrocinios')}>Patrocinios</button>
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
                    <div key={t.name || 'Sin tipo'} className="card stat-card" style={{ borderTop: '3px solid var(--accent)', minWidth: 0 }}>
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
            <label style={{ display: 'block', marginTop: '1rem' }}>Enlace de Imagen:
              <input type="url" placeholder="https://ejemplo.com/imagen.jpg" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} style={{ display: 'block', marginTop: '.25rem', width: '100%' }} />
            </label>
            <label style={{ display: 'block', marginTop: '1rem' }}>Enlace de Video:
              <input type="url" placeholder="https://ejemplo.com/video.mp4" value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} style={{ display: 'block', marginTop: '.25rem', width: '100%' }} />
            </label>
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
                  <th>Medios</th>
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
                        catch { alert('Error al actualizar estado'); }
                      }} style={{ padding: '.25rem', borderRadius: '4px', border: `1px solid ${statusColors[c.status] || '#ccc'}` }}>
                        {statusOptions.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
                      </select>
                    </td>
                    <td><span className={`badge ${c.priority}`}>{priorityLabels[c.priority]}</span></td>
                    <td>
                      {c.image_url && <a href={c.image_url} target="_blank" rel="noreferrer" style={{ display: 'block' }}>Imagen</a>}
                      {c.video_url && <a href={c.video_url} target="_blank" rel="noreferrer" style={{ display: 'block' }}>Video</a>}
                      {!c.image_url && !c.video_url && '-'}
                    </td>
                    <td>
                      <button className="btn small" style={{ marginRight: '.25rem' }} onClick={() => setSeguimientoId(seguimientoId === c.id ? null : c.id)}>
                        Seguimiento
                      </button>
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

      {tab === 'patrocinios' && (
        <div className="card">
            <h2>Detalle de Patrocinios ({patrocinios.length})</h2>

            <div className="filter-bar" style={{ marginBottom: '.75rem' }}>
              <input
                className="search-input" style={{ maxWidth: 220, marginBottom: 0 }}
                placeholder="Buscar empresa, contacto..."
                value={pSearch} onChange={e => setPSearch(e.target.value)}
              />
            </div>

            {patrocinios.length === 0 ? (
              <p className="empty-state">No hay patrocinios{pSearch ? ' que coincidan con la búsqueda' : ' registrados'}</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Contacto</th>
                      <th>Tipo</th>
                      <th>Paquete</th>
                      <th>Estado Pago</th>
                      <th>Pagado</th>
                      <th>Visita</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patrocinios.map(p => (
                      <tr key={p.id}>
                        <td><strong>{p.company_name || '—'}</strong></td>
                        <td>{p.contact_person || '—'}</td>
                        <td><span className={`status-badge ${p.sponsorship_type?.toLowerCase().includes('especie') ? 'pending' : 'completed'}`}>{p.sponsorship_type || '—'}</span></td>
                        <td>{p.package || '—'}</td>
                        <td><span className={`status-badge ${p.payment_status?.toLowerCase()}`}>{p.payment_status || 'Pendiente'}</span></td>
                        <td style={{ color: p.total_paid > 0 ? 'var(--success)' : 'var(--text-muted)', fontWeight: p.total_paid > 0 ? 600 : 400 }}>{fmt(p.total_paid)}</td>
                        <td>{p.visit_status || '—'}</td>
                        <td>
                          <button className="btn small primary" onClick={() => openDocUrls(p)}>
                            Documentos
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
      )}

      {seguimientoId && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ margin: 0 }}>Seguimiento del comunicado #{seguimientoId}</h3>
            <button className="btn" onClick={() => setSeguimientoId(null)}>Cerrar</button>
          </div>
          <SeguimientoComunicado communicationId={seguimientoId} />
        </div>
      )}

      {showDocUrlsModal && (
        <div className="modal-overlay" onClick={() => { setShowDocUrlsModal(false); setPreviewHtml(''); setPreviewUrl(''); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 720, padding: 0, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
              <div>
                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600, marginBottom: '.2rem' }}>Documentos del Patrocinador</div>
                <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{selectedPatrocinio?.company_name || '—'}</h2>
              </div>
              <button className="modal-close" onClick={() => { setShowDocUrlsModal(false); setPreviewHtml(''); setPreviewUrl(''); }} aria-label="Cerrar modal">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div style={{ display: 'flex', minHeight: 400, overflow: 'hidden' }}>
              {/* Left panel: doc list */}
              <div style={{ flex: previewHtml ? '0 0 280px' : '1', borderRight: previewHtml ? '1px solid var(--border)' : 'none', overflowY: 'auto', overflowX: 'hidden', padding: '1rem 1.25rem', minWidth: 0 }}>
                {docUrls.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                    {docUrls.map((d, i) => {
                      const hasUrl = d.url.trim().length > 0;
                      const dt = docTypes.find(t => t.id === d.document_type_id);
                      const hasTemplate = dt && dt.template_body;
                      return (
                        <div key={d.document_type_id} style={{ padding: '.6rem .75rem', borderRadius: 'var(--radius)', background: hasUrl ? 'var(--success-subtle)' : 'var(--bg-secondary)', border: `1px solid ${hasUrl ? 'var(--success)' : 'var(--border)'}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.35rem' }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: hasUrl ? 'var(--success)' : 'var(--text-muted)' }} />
                            <span style={{ fontWeight: 600, fontSize: '.82rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.document_type_name}</span>
                            {hasUrl && (
                              <a href={d.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: '.7rem', color: 'var(--primary)', textDecoration: 'none', padding: '.1rem .35rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card)', flexShrink: 0 }} title="Abrir">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                              </a>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '.35rem', alignItems: 'center' }}>
                            <input type="url" placeholder="URL del documento" value={d.url} onChange={e => { const next = [...docUrls]; next[i] = { ...next[i], url: e.target.value }; setDocUrls(next); }} style={{ flex: 1, minWidth: 0, padding: '.35rem .5rem', border: `1px solid ${hasUrl ? 'var(--success)' : 'var(--border)'}`, borderRadius: '5px', fontSize: '.78rem', background: 'var(--card)', color: 'var(--text)' }} />
                            {hasTemplate && (
                              <button className="btn small primary" style={{ fontSize: '.68rem', padding: '.3rem .5rem', flexShrink: 0 }} onClick={() => generateDoc(d.document_type_id, d.document_type_name)}>
                                Generar
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {docUrls.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '.85rem' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '.5rem', opacity: .5 }}>📄</div>
                    No hay tipos de documento configurados
                  </div>
                )}
              </div>

              {/* Right panel: preview */}
              {previewHtml && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                  <div style={{ padding: '.65rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
                    <span style={{ fontWeight: 600, fontSize: '.85rem' }}>{previewDocName}</span>
                    <div style={{ display: 'flex', gap: '.35rem' }}>
                      <button className="btn small primary" style={{ fontSize: '.72rem' }} disabled={previewSaving} onClick={() => {
                        const dt = docTypes.find(t => t.name === previewDocName);
                        if (dt) saveEditedDoc(dt.id);
                      }}>
                        {previewSaving ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button className="btn small" style={{ fontSize: '.72rem' }} onClick={() => { setPreviewHtml(''); setPreviewUrl(''); setPreviewEditing(false); }}>Cerrar</button>
                    </div>
                  </div>
                  <div style={{ flex: 1, overflow: 'auto', background: '#fff' }}>
                    <iframe srcDoc={previewHtml} sandbox="allow-same-origin" style={{ width: '100%', height: '100%', minHeight: 350, border: 'none' }} title="Vista previa del documento" />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '.85rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '.5rem', background: 'var(--bg-secondary)' }}>
              <button className="btn" onClick={() => { setShowDocUrlsModal(false); setPreviewHtml(''); setPreviewUrl(''); setPreviewEditing(false); }}>Cerrar</button>
              <button className="btn primary" disabled={docUrlsSaving} onClick={saveDocUrls}>
                {docUrlsSaving ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem' }}>
                    <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .6s linear infinite', display: 'inline-block' }} />
                    Guardando...
                  </span>
                ) : 'Guardar URLs'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
