import { useState, useEffect } from 'react';
import api from '../api';

export default function Redes() {
  const [items, setItems] = useState([]);
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

  // Filters
  const [filterEstado, setFilterEstado] = useState('');
  const [filterPost, setFilterPost] = useState('');
  const [filterReels, setFilterReels] = useState('');

  // Patrocinio search
  const [patrocinios, setPatrocinios] = useState([]);

  const load = () => {
    let url = `/redes?page=${page}&search=${search}`;
    if (filterEstado) url += `&estado=${filterEstado}`;
    if (filterPost) url += `&post_programados=${filterPost}`;
    if (filterReels) url += `&reels=${filterReels}`;
    api.get(url).then((r) => {
      setItems(r.data.redes);
      setTotalPages(r.data.totalPages);
    });
  };

  const loadStats = () => {
    api.get('/redes/stats').then((r) => setStats(r.data)).catch(() => {});
  };

  const loadPatrocinios = () => {
    api.get('/disenos/patrocinios/search').then((r) => setPatrocinios(r.data)).catch(() => {});
  };

  useEffect(() => { load(); }, [page, search, filterEstado, filterPost, filterReels]);
  useEffect(() => { loadStats(); loadPatrocinios(); }, []);

  // ── Detail panel ──
  const openDetail = async (item) => {
    setSelected(item);
    setDetailLoading(true);
    try {
      const r = await api.get(`/redes/${item.id}`);
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
  const handleSave = async () => {
    const errs = [];
    if (form.estado && !['completo', 'en progreso', 'incompleto'].includes(form.estado)) errs.push('Estado inválido');
    if (form.post_programados && !['SI', 'No', 'en diseño'].includes(form.post_programados)) errs.push('Post programados inválido');
    if (form.reels && !['grabados', 'editando', 'programados', 'no aplica'].includes(form.reels)) errs.push('Reels inválido');
    setFormErrors(errs);
    if (errs.length > 0) return;

    try {
      if (editing) {
        await api.put(`/redes/${editing}`, form);
      } else {
        await api.post('/redes', form);
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

  const handleEdit = (item) => {
    setForm({ ...item });
    setEditing(item.id);
    setShowForm(true);
    setFormErrors([]);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return;
    await api.delete(`/redes/${id}`);
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

  // ── Helpers ──
  const estadoColor = (s) => {
    const map = { 'completo': 'success', 'en progreso': 'info', 'incompleto': 'warning' };
    return map[s] || '';
  };

  const postColor = (s) => {
    const map = { 'SI': 'success', 'No': 'danger', 'en diseño': 'info' };
    return map[s] || '';
  };

  const reelsColor = (s) => {
    const map = { 'grabados': 'success', 'editando': 'info', 'programados': '', 'no aplica': 'neutral' };
    return map[s] || '';
  };

  return (
    <div>
      <div className="page-header">
        <h1>Redes Sociales</h1>
        <button className="btn success" onClick={openNew}>
          {showForm ? 'Cancelar' : '+ Nuevo Registro'}
        </button>
      </div>

      {/* ── Stats ── */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <span className="stat-num">{stats.total}</span>
            <span className="stat-label">Total Registros</span>
          </div>
          <div className="stat-card success">
            <span className="stat-num">{stats.byEstado?.find(e => e.estado === 'completo')?.count || 0}</span>
            <span className="stat-label">Completos</span>
          </div>
          <div className="stat-card info">
            <span className="stat-num">{stats.byEstado?.find(e => e.estado === 'en progreso')?.count || 0}</span>
            <span className="stat-label">En Progreso</span>
          </div>
          <div className="stat-card warning">
            <span className="stat-num">{stats.byEstado?.find(e => e.estado === 'incompleto')?.count || 0}</span>
            <span className="stat-label">Incompletos</span>
          </div>
          <div className="stat-card" style={{ borderLeftColor: '#8b5cf6' }}>
            <span className="stat-num">{stats.byPost?.find(p => p.post_programados === 'SI')?.count || 0}</span>
            <span className="stat-label">Posts Programados</span>
          </div>
          <div className="stat-card" style={{ borderLeftColor: '#06b6d4' }}>
            <span className="stat-num">{stats.byReels?.find(r => r.reels === 'grabados')?.count || 0}</span>
            <span className="stat-label">Reels Grabados</span>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          className="search-input"
          placeholder="Buscar por folio, empresa, responsable, actividad..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ flex: 1, minWidth: '250px' }}
        />
        <select value={filterEstado} onChange={(e) => { setFilterEstado(e.target.value); setPage(1); }} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <option value="">Todos los Estados</option>
          <option>completo</option>
          <option>en progreso</option>
          <option>incompleto</option>
        </select>
        <select value={filterPost} onChange={(e) => { setFilterPost(e.target.value); setPage(1); }} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <option value="">Todos los Posts</option>
          <option>SI</option>
          <option>No</option>
          <option>en diseño</option>
        </select>
        <select value={filterReels} onChange={(e) => { setFilterReels(e.target.value); setPage(1); }} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <option value="">Todos los Reels</option>
          <option>grabados</option>
          <option>editando</option>
          <option>programados</option>
          <option>no aplica</option>
        </select>
      </div>

      {/* ── Form Modal ── */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditing(null); setFormErrors([]); }}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? 'Editar Registro' : 'Nuevo Registro de Redes'}</h2>

            {formErrors.length > 0 && (
              <div className="form-errors">
                {formErrors.map((e, i) => <p key={i} style={{ color: '#dc2626', margin: '2px 0' }}>⚠ {e}</p>)}
              </div>
            )}

            <div className="form-grid">
              <input placeholder="Folio" value={form.folio || ''} onChange={(e) => set('folio', e.target.value)} />
              <input placeholder="Empresa / Nombre" value={form.empresa_nombre || ''} onChange={(e) => set('empresa_nombre', e.target.value)} />
              <input placeholder="Responsable" value={form.responsable || ''} onChange={(e) => set('responsable', e.target.value)} />
              <input placeholder="Actividad" value={form.actividad || ''} onChange={(e) => set('actividad', e.target.value)} />
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>Fecha Inicio</label>
                <input type="date" value={form.fecha_inicio || ''} onChange={(e) => set('fecha_inicio', e.target.value)} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>Fecha Límite</label>
                <input type="date" value={form.fecha_limite || ''} onChange={(e) => set('fecha_limite', e.target.value)} style={{ width: '100%' }} />
              </div>
              <select value={form.estado || ''} onChange={(e) => set('estado', e.target.value)}>
                <option value="">Estado</option>
                <option>completo</option>
                <option>en progreso</option>
                <option>incompleto</option>
              </select>
              <select value={form.post_programados || ''} onChange={(e) => set('post_programados', e.target.value)}>
                <option value="">Post Programados</option>
                <option>SI</option>
                <option>No</option>
                <option>en diseño</option>
              </select>
              <select value={form.reels || ''} onChange={(e) => set('reels', e.target.value)}>
                <option value="">Reels</option>
                <option>grabados</option>
                <option>editando</option>
                <option>programados</option>
                <option>no aplica</option>
              </select>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Vincular a Patrocinio</label>
                <select value={form.patrocinio_id || ''} onChange={(e) => set('patrocinio_id', e.target.value || null)} style={{ width: '100%' }}>
                  <option value="">Sin vincular</option>
                  {patrocinios.map(p => (
                    <option key={p.id} value={p.id}>{p.company_name} — {p.contact_person || 'Sin contacto'}</option>
                  ))}
                </select>
              </div>
              <textarea className="full-width" placeholder="Observaciones" value={form.observaciones || ''} onChange={(e) => set('observaciones', e.target.value)} />
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
              <th>Folio</th>
              <th>Empresa / Nombre</th>
              <th>Responsable</th>
              <th>Actividad</th>
              <th>Inicio</th>
              <th>Límite</th>
              <th>Estado</th>
              <th>Posts</th>
              <th>Reels</th>
              <th>Patrocinio</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className={selected?.id === item.id ? 'row-selected' : ''}
                onClick={() => openDetail(item)}
                style={{ cursor: 'pointer' }}
              >
                <td><strong>{item.folio || '-'}</strong></td>
                <td>{item.empresa_nombre || '-'}</td>
                <td>{item.responsable || '-'}</td>
                <td>{item.actividad || '-'}</td>
                <td style={{ fontSize: '0.8rem' }}>{item.fecha_inicio || '-'}</td>
                <td style={{ fontSize: '0.8rem' }}>{item.fecha_limite || '-'}</td>
                <td><span className={`status-badge ${estadoColor(item.estado)}`}>{item.estado || '-'}</span></td>
                <td><span className={`status-badge ${postColor(item.post_programados)}`}>{item.post_programados || '-'}</span></td>
                <td><span className={`status-badge ${reelsColor(item.reels)}`}>{item.reels || '-'}</span></td>
                <td style={{ fontSize: '0.78rem' }}>{item.patrocinio_empresa || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                  <button className="icon-btn edit" title="Editar" onClick={() => handleEdit(item)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button className="icon-btn danger" title="Eliminar" onClick={() => handleDelete(item.id)}>
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
            {items.length === 0 && (
              <tr><td colSpan="11" style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Sin registros de redes sociales</td></tr>
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

      {/* ═══ DETAIL PANEL ═══ */}
      {selected && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div className="modal modal-wide detail-panel" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            {detailLoading ? (
              <p style={{ textAlign: 'center', padding: '2rem' }}>Cargando detalle...</p>
            ) : detail ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ margin: 0 }}>{detail.empresa_nombre || detail.folio || 'Sin nombre'}</h2>
                  <button className="btn-sm" onClick={closeDetail}>✕ Cerrar</button>
                </div>

                <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>FOLIO</label>{detail.folio || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>EMPRESA / NOMBRE</label>{detail.empresa_nombre || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>RESPONSABLE</label>{detail.responsable || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>ACTIVIDAD</label>{detail.actividad || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>FECHA INICIO</label>{detail.fecha_inicio || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>FECHA LÍMITE</label>{detail.fecha_limite || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>ESTADO</label><span className={`status-badge ${estadoColor(detail.estado)}`}>{detail.estado || '—'}</span></div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>POST PROGRAMADOS</label><span className={`status-badge ${postColor(detail.post_programados)}`}>{detail.post_programados || '—'}</span></div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>REELS</label><span className={`status-badge ${reelsColor(detail.reels)}`}>{detail.reels || '—'}</span></div>
                  <div style={{ gridColumn: 'span 2' }}><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>OBSERVACIONES</label>{detail.observaciones || '—'}</div>
                </div>

                {detail.patrocinio_empresa && (
                  <div style={{ padding: '0.75rem', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', marginBottom: '1.5rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem', color: '#0369a1' }}>Patrocinio Vinculado</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <div><strong>Empresa:</strong> {detail.patrocinio_empresa}</div>
                      <div><strong>Contacto:</strong> {detail.patrocinio_contacto || '—'}</div>
                      <div><strong>Teléfono:</strong> {detail.patrocinio_telefono || '—'}</div>
                    </div>
                  </div>
                )}

                <div style={{ fontSize: '0.75rem', color: '#94a3b8', padding: '0.5rem', background: '#f8fafc', borderRadius: '6px' }}>
                  <strong>Creado por:</strong> {detail.created_by_name || '—'} ·{' '}
                  <strong>Fecha:</strong> {detail.created_at || '—'}
                  {detail.updated_by_name && (
                    <> · <strong>Última modificación:</strong> {detail.updated_by_name} ({detail.updated_at || '—'})</>
                  )}
                </div>
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
