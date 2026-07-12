import { useState, useEffect } from 'react';
import api from '../api';

function fmt(n) {
  return '$' + (n || 0).toLocaleString('es-MX');
}

function fmtPercent(n) {
  return Math.round((n || 0) * 100) + '%';
}

export default function Disenos() {
  const [disenos, setDisenos] = useState([]);
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
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPrioridad, setFilterPrioridad] = useState('');

  // Patrocinio search for linking
  const [patrocinioSearch, setPatrocinioSearch] = useState('');
  const [patrocinios, setPatrocinios] = useState([]);

  const load = () => {
    let url = `/disenos?page=${page}&search=${search}`;
    if (filterStatus) url += `&status=${filterStatus}`;
    if (filterPrioridad) url += `&prioridad=${filterPrioridad}`;
    api.get(url).then((r) => {
      setDisenos(r.data.disenos);
      setTotalPages(r.data.totalPages);
    });
  };

  const loadStats = () => {
    api.get('/disenos/stats').then((r) => setStats(r.data)).catch(() => {});
  };

  const loadPatrocinios = () => {
    const q = patrocinioSearch ? `?search=${patrocinioSearch}` : '';
    api.get(`/disenos/patrocinios/search${q}`).then((r) => setPatrocinios(r.data)).catch(() => {});
  };

  useEffect(() => { load(); }, [page, search, filterStatus, filterPrioridad]);
  useEffect(() => { loadStats(); loadPatrocinios(); }, []);
  useEffect(() => { loadPatrocinios(); }, [patrocinioSearch]);

  // ── Detail panel ──
  const openDetail = async (d) => {
    setSelected(d);
    setDetailLoading(true);
    try {
      const r = await api.get(`/disenos/${d.id}`);
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
    if (form.prioridad && !['MAXIMA', 'ALTA', 'MEDIA', 'BAJA'].includes(form.prioridad)) {
      errs.push('Prioridad inválida');
    }
    if (form.status && !['PENDIENTE', 'SE TRABAJA', 'EN REVISION', 'COMPLETADO', 'CANCELADO'].includes(form.status)) {
      errs.push('Status inválido');
    }
    setFormErrors(errs);
    if (errs.length > 0) return;

    try {
      const payload = { ...form };
      if (payload.costo !== undefined && payload.costo !== null) payload.costo = parseFloat(payload.costo) || 0;
      if (payload.liquidado !== undefined && payload.liquidado !== null) payload.liquidado = parseFloat(payload.liquidado) || 0;
      if (payload.n_orden !== undefined && payload.n_orden !== null) payload.n_orden = parseInt(payload.n_orden) || null;

      if (editing) {
        await api.put(`/disenos/${editing}`, payload);
      } else {
        await api.post('/disenos', payload);
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

  const handleEdit = (d) => {
    setForm({ ...d });
    setEditing(d.id);
    setShowForm(true);
    setFormErrors([]);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este diseño?')) return;
    await api.delete(`/disenos/${id}`);
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
  const statusColor = (s) => {
    const map = {
      'PENDIENTE': 'warning', 'SE TRABAJA': 'info', 'EN REVISION': '',
      'COMPLETADO': 'success', 'CANCELADO': 'danger',
      'MAXIMA': 'danger', 'ALTA': 'warning', 'MEDIA': 'info', 'BAJA': 'neutral'
    };
    return map[s] || '';
  };

  const liquidadoBadge = (v) => {
    const pct = (v || 0) * 100;
    if (pct >= 100) return 'success';
    if (pct >= 50) return 'info';
    if (pct > 0) return 'warning';
    return 'danger';
  };

  return (
    <div>
      <div className="page-header">
        <h1>Diseños</h1>
        <button className="btn success" onClick={openNew}>
          {showForm ? 'Cancelar' : '+ Nuevo Diseño'}
        </button>
      </div>

      {/* ── Stats ── */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <span className="stat-num">{stats.total}</span>
            <span className="stat-label">Total Diseños</span>
          </div>
          <div className="stat-card info">
            <span className="stat-num">{fmt(stats.totalCosto)}</span>
            <span className="stat-label">Costo Total</span>
          </div>
          <div className="stat-card success">
            <span className="stat-num">{fmtPercent(stats.totalLiquidado)}</span>
            <span className="stat-label">Promedio Liquidado</span>
          </div>
          <div className="stat-card warning">
            <span className="stat-num">{stats.byStatus?.find(s => s.status === 'SE TRABAJA')?.count || 0}</span>
            <span className="stat-label">En Trabajo</span>
          </div>
          <div className="stat-card danger">
            <span className="stat-num">{stats.byPrioridad?.find(p => p.prioridad === 'MAXIMA')?.count || 0}</span>
            <span className="stat-label">Prioridad Máxima</span>
          </div>
          <div className="stat-card success">
            <span className="stat-num">{stats.byStatus?.find(s => s.status === 'COMPLETADO')?.count || 0}</span>
            <span className="stat-label">Completados</span>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          className="search-input"
          placeholder="Buscar por descripción, responsable, paquete..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ flex: 1, minWidth: '250px' }}
        />
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}
        >
          <option value="">Todos los Status</option>
          <option>PENDIENTE</option>
          <option>SE TRABAJA</option>
          <option>EN REVISION</option>
          <option>COMPLETADO</option>
          <option>CANCELADO</option>
        </select>
        <select
          value={filterPrioridad}
          onChange={(e) => { setFilterPrioridad(e.target.value); setPage(1); }}
          style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}
        >
          <option value="">Todas las Prioridades</option>
          <option>MAXIMA</option>
          <option>ALTA</option>
          <option>MEDIA</option>
          <option>BAJA</option>
        </select>
      </div>

      {/* ── Form Modal ── */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditing(null); setFormErrors([]); }}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? 'Editar Diseño' : 'Nuevo Diseño'}</h2>

            {formErrors.length > 0 && (
              <div className="form-errors">
                {formErrors.map((e, i) => <p key={i} style={{ color: '#dc2626', margin: '2px 0' }}>⚠ {e}</p>)}
              </div>
            )}

            <div className="form-grid">
              <input
                type="number"
                placeholder="# Orden"
                value={form.n_orden || ''}
                onChange={(e) => set('n_orden', e.target.value)}
              />
              <input
                placeholder="# Paquete"
                value={form.n_paquete || ''}
                onChange={(e) => set('n_paquete', e.target.value)}
              />
              <input
                placeholder="Descripción del proyecto"
                value={form.descripcion_proyecto || ''}
                onChange={(e) => set('descripcion_proyecto', e.target.value)}
                style={{ gridColumn: 'span 2' }}
              />
              <input
                placeholder="Responsable de patrocinio"
                value={form.responsable_patrocinio || ''}
                onChange={(e) => set('responsable_patrocinio', e.target.value)}
              />
              <input
                placeholder="Responsable de diseño"
                value={form.responsable_diseno || ''}
                onChange={(e) => set('responsable_diseno', e.target.value)}
              />
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>Fecha Inicio</label>
                <input
                  type="date"
                  value={form.fecha_inicio || ''}
                  onChange={(e) => set('fecha_inicio', e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>Fecha Vencimiento</label>
                <input
                  type="date"
                  value={form.fecha_vencimiento || ''}
                  onChange={(e) => set('fecha_vencimiento', e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <select value={form.prioridad || ''} onChange={(e) => set('prioridad', e.target.value)}>
                <option value="">Prioridad</option>
                <option>MAXIMA</option>
                <option>ALTA</option>
                <option>MEDIA</option>
                <option>BAJA</option>
              </select>
              <select value={form.status || ''} onChange={(e) => set('status', e.target.value)}>
                <option value="">Status</option>
                <option>PENDIENTE</option>
                <option>SE TRABAJA</option>
                <option>EN REVISION</option>
                <option>COMPLETADO</option>
                <option>CANCELADO</option>
              </select>
              <input
                type="number"
                placeholder="Costo"
                value={form.costo || ''}
                onChange={(e) => set('costo', e.target.value)}
              />
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>Liquidado (0-1)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  placeholder="Ej: 0.5 = 50%"
                  value={form.liquidado || ''}
                  onChange={(e) => set('liquidado', e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <input
                placeholder="Comités involucrados (separados por coma)"
                value={form.comites_involucrados || ''}
                onChange={(e) => set('comites_involucrados', e.target.value)}
                style={{ gridColumn: 'span 2' }}
              />
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Vincular a Patrocinio</label>
                <select
                  value={form.patrocinio_id || ''}
                  onChange={(e) => set('patrocinio_id', e.target.value || null)}
                  style={{ width: '100%' }}
                >
                  <option value="">Sin vincular</option>
                  {patrocinios.map(p => (
                    <option key={p.id} value={p.id}>{p.company_name} — {p.contact_person || 'Sin contacto'}</option>
                  ))}
                </select>
              </div>
              <textarea
                className="full-width"
                placeholder="Comentarios extras"
                value={form.comentarios_extras || ''}
                onChange={(e) => set('comentarios_extras', e.target.value)}
              />
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
              <th>#</th>
              <th>Paq.</th>
              <th>Descripción del Proyecto</th>
              <th>Resp. Patrocinio</th>
              <th>Resp. Diseño</th>
              <th>Inicio</th>
              <th>Vencimiento</th>
              <th>Prioridad</th>
              <th>Costo</th>
              <th>Liquidado</th>
              <th>Comités</th>
              <th>Status</th>
              <th>Patrocinio Vinculado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {disenos.map((d) => (
              <tr
                key={d.id}
                className={selected?.id === d.id ? 'row-selected' : ''}
                onClick={() => openDetail(d)}
                style={{ cursor: 'pointer' }}
              >
                <td>{d.n_orden || '-'}</td>
                <td>{d.n_paquete || '-'}</td>
                <td><strong>{d.descripcion_proyecto || 'Sin descripción'}</strong></td>
                <td>{d.responsable_patrocinio || '-'}</td>
                <td>{d.responsable_diseno || '-'}</td>
                <td style={{ fontSize: '0.8rem' }}>{d.fecha_inicio || '-'}</td>
                <td style={{ fontSize: '0.8rem' }}>{d.fecha_vencimiento || '-'}</td>
                <td><span className={`status-badge ${statusColor(d.prioridad)}`}>{d.prioridad || '-'}</span></td>
                <td style={{ whiteSpace: 'nowrap' }}>{fmt(d.costo)}</td>
                <td>
                  <span className={`status-badge ${liquidadoBadge(d.liquidado)}`}>
                    {fmtPercent(d.liquidado)}
                  </span>
                </td>
                <td style={{ fontSize: '0.78rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.comites_involucrados || '-'}</td>
                <td><span className={`status-badge ${statusColor(d.status)}`}>{d.status || '-'}</span></td>
                <td style={{ fontSize: '0.78rem' }}>{d.patrocinio_empresa || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                  <button className="icon-btn edit" title="Editar" onClick={() => handleEdit(d)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button className="icon-btn danger" title="Eliminar" onClick={() => handleDelete(d.id)}>
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
            {disenos.length === 0 && (
              <tr><td colSpan="14" style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Sin diseños registrados</td></tr>
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
          <div className="modal modal-wide detail-panel" onClick={(e) => e.stopPropagation()}
               style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            {detailLoading ? (
              <p style={{ textAlign: 'center', padding: '2rem' }}>Cargando detalle...</p>
            ) : detail ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ margin: 0 }}>{detail.descripcion_proyecto || 'Sin descripción'}</h2>
                  <button className="btn-sm" onClick={closeDetail}>✕ Cerrar</button>
                </div>

                <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>N. ORDEN</label>{detail.n_orden || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>N. PAQUETE</label>{detail.n_paquete || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>RESP. PATROCINIO</label>{detail.responsable_patrocinio || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>RESP. DISEÑO</label>{detail.responsable_diseno || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>FECHA INICIO</label>{detail.fecha_inicio || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>FECHA VENCIMIENTO</label>{detail.fecha_vencimiento || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>PRIORIDAD</label><span className={`status-badge ${statusColor(detail.prioridad)}`}>{detail.prioridad || '—'}</span></div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>STATUS</label><span className={`status-badge ${statusColor(detail.status)}`}>{detail.status || '—'}</span></div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>COSTO</label>{fmt(detail.costo)}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>LIQUIDADO</label><span className={`status-badge ${liquidadoBadge(detail.liquidado)}`}>{fmtPercent(detail.liquidado)}</span></div>
                  <div style={{ gridColumn: 'span 2' }}><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>COMITÉS INVOLUCRADOS</label>{detail.comites_involucrados || '—'}</div>
                  <div style={{ gridColumn: 'span 2' }}><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>COMENTARIOS</label>{detail.comentarios_extras || '—'}</div>
                </div>

                {/* Patrocinio vinculado */}
                {detail.patrocinio_empresa && (
                  <div style={{ padding: '0.75rem', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', marginBottom: '1.5rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem', color: '#0369a1' }}>Patrocinio Vinculado</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <div><strong>Empresa:</strong> {detail.patrocinio_empresa}</div>
                      <div><strong>Contacto:</strong> {detail.patrocinio_contacto || '—'}</div>
                      <div><strong>Teléfono:</strong> {detail.patrocinio_telefono || '—'}</div>
                      <div><strong>Paquete:</strong> {detail.patrocinio_paquete || '—'}</div>
                      <div><strong>Pago:</strong> {detail.patrocinio_pago_status || '—'}</div>
                    </div>
                  </div>
                )}

                {/* Audit info */}
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
