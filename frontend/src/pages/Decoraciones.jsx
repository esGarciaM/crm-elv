import { useState, useEffect, useMemo } from 'react';
import api from '../api';
import DatePicker from '../components/DatePicker';
import TimePicker from '../components/TimePicker';

const VALID_STATUS = ['Pendiente', 'En preparacion', 'Completado', 'Cancelado'];

const statusColor = (s) => {
  const map = { 'Pendiente': 'warning', 'En preparacion': 'info', 'Completado': 'success', 'Cancelado': 'danger' };
  return map[s] || '';
};

const statusBg = (s) => {
  const map = {
    'Pendiente': 'var(--badge-pending-bg)',
    'En preparacion': 'var(--badge-info-bg)',
    'Completado': 'var(--badge-success-bg)',
    'Cancelado': 'var(--badge-danger-bg)'
  };
  return map[s] || 'var(--badge-neutral-bg)';
};

const statusColorValue = (s) => {
  const map = {
    'Pendiente': 'var(--warning)',
    'En preparacion': 'var(--info)',
    'Completado': 'var(--success)',
    'Cancelado': 'var(--danger)'
  };
  return map[s] || 'var(--text-light)';
};

export default function Decoraciones() {
  const [activeTab, setActiveTab] = useState('lista');
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterPatrocinio, setFilterPatrocinio] = useState('');
  const [patrocinios, setPatrocinios] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [formErrors, setFormErrors] = useState([]);

  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Calendar state
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [calItems, setCalItems] = useState([]);
  const [calSelectedDate, setCalSelectedDate] = useState(null);
  const [calDetailModal, setCalDetailModal] = useState(null);

  const load = () => {
    let url = `/decoraciones?page=${page}&search=${search}`;
    if (filterStatus) url += `&status=${filterStatus}`;
    if (filterDateFrom) url += `&date_from=${filterDateFrom}`;
    if (filterDateTo) url += `&date_to=${filterDateTo}`;
    if (filterPatrocinio) url += `&patrocinio_id=${filterPatrocinio}`;
    api.get(url).then((r) => { setItems(r.data.items); setTotalPages(r.data.totalPages); });
  };

  const loadStats = () => { api.get('/decoraciones/stats').then((r) => setStats(r.data)).catch(() => {}); };
  const loadUpcoming = () => { api.get('/decoraciones/upcoming?limit=5').then((r) => setUpcoming(r.data)).catch(() => {}); };
  const loadCalendar = () => { api.get(`/decoraciones/calendar?year=${calYear}&month=${calMonth}`).then((r) => setCalItems(r.data)).catch(() => {}); };
  const loadPatrocinios = () => { api.get('/patrocinios?limit=500').then((r) => setPatrocinios(r.data.patrocinios || r.data.items || r.data)).catch(() => {}); };

  useEffect(() => { load(); }, [page, search, filterStatus, filterDateFrom, filterDateTo, filterPatrocinio]);
  useEffect(() => { loadStats(); loadUpcoming(); loadPatrocinios(); }, []);
  useEffect(() => { loadCalendar(); }, [calYear, calMonth]);

  const openDetail = async (item) => {
    setSelected(item);
    setDetailLoading(true);
    try { const r = await api.get(`/decoraciones/${item.id}`); setDetail(r.data); } catch { setDetail(null); }
    setDetailLoading(false);
  };
  const closeDetail = () => { setSelected(null); setDetail(null); };

  const openNew = (preloadedDate) => {
    setForm(preloadedDate ? { status: 'Pendiente', evento_fecha: preloadedDate } : { status: 'Pendiente' });
    setEditing(null);
    setFormErrors([]);
    setShowForm(!showForm);
  };

  const handleEdit = (item) => {
    setForm({ ...item });
    setEditing(item.id);
    setShowForm(true);
    setFormErrors([]);
  };

  const setFormVal = (field, value) => setForm({ ...form, [field]: value });

  const handleSave = async () => {
    const errs = [];
    if (!form.evento_nombre || !form.evento_nombre.trim()) errs.push('El nombre del evento es obligatorio');
    if (form.presupuesto && parseFloat(form.presupuesto) < 0) errs.push('El presupuesto no puede ser negativo');
    if (form.status && !VALID_STATUS.includes(form.status)) errs.push('Estado invalido');
    setFormErrors(errs);
    if (errs.length > 0) return;
    try {
      if (editing) await api.put(`/decoraciones/${editing}`, form);
      else await api.post('/decoraciones', form);
      setShowForm(false); setEditing(null); setForm({}); setFormErrors([]);
      load(); loadStats(); loadUpcoming();
    } catch (err) {
      const data = err.response?.data;
      if (data?.details) setFormErrors(data.details);
      else if (data?.error) setFormErrors([data.error]);
      else setFormErrors(['Error al guardar']);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este evento?')) return;
    await api.delete(`/decoraciones/${id}`);
    if (selected?.id === id) closeDetail();
    load(); loadStats(); loadUpcoming();
  };

  const handleStatusChange = async (id, newStatus) => {
    try { await api.put(`/decoraciones/${id}`, { status: newStatus }); load(); loadStats(); loadUpcoming(); } catch {}
  };

  const formatMoney = (n) => (n == null ? 0 : Number(n).toLocaleString('es-MX'));
  const formatDateTime = (item) => `${item?.evento_fecha?.slice(0, 10) || '—'}${item?.evento_hora ? ` ${item.evento_hora}` : ''}`;

  // ── Calendar helpers ──
  const calDaysInMonth = new Date(calYear, calMonth, 0).getDate();
  const calFirstDay = new Date(calYear, calMonth - 1, 1).getDay();

  const calGrid = useMemo(() => {
    const days = [];
    for (let i = 0; i < calFirstDay; i++) days.push(null);
    for (let d = 1; d <= calDaysInMonth; d++) days.push(d);
    return days;
  }, [calYear, calMonth, calDaysInMonth, calFirstDay]);

  const getEventsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calItems.filter(item => item.evento_fecha && item.evento_fecha.slice(0, 10) === dateStr);
  };

  const calMonthName = new Date(calYear, calMonth - 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="page-header">
        <h1>Decoraciones</h1>
        <button className="btn success" onClick={openNew}>
          {showForm ? 'Cancelar' : '+ Nuevo Evento'}
        </button>
      </div>

      {/* ── Tab Bar ── */}
      <div className="page-tabs">
        {[
          { key: 'lista', label: 'Eventos' },
          { key: 'calendario', label: 'Calendario' },
        ].map(t => (
          <button
            key={t.key}
            className={activeTab === t.key ? 'active' : ''}
            onClick={() => { setActiveTab(t.key); setShowForm(false); setFormErrors([]); }}
          >{t.label}</button>
        ))}
      </div>

      {activeTab === 'lista' && (
        <>
      {/* ── Stats ── */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <span className="stat-num">{stats.total}</span>
            <span className="stat-label">Total Eventos</span>
          </div>
          <div className="stat-card warning">
            <span className="stat-num">{stats.pending}</span>
            <span className="stat-label">Pendientes</span>
          </div>
          <div className="stat-card info">
            <span className="stat-num">{stats.inPreparation}</span>
            <span className="stat-label">En Preparacion</span>
          </div>
          <div className="stat-card" style={{ borderLeftColor: '#06b6d4' }}>
            <span className="stat-num">{stats.todayEvents}</span>
            <span className="stat-label">Eventos Hoy</span>
          </div>
          <div className="stat-card success">
            <span className="stat-num">{stats.completed}</span>
            <span className="stat-label">Completados</span>
          </div>
          <div className="stat-card" style={{ borderLeftColor: '#10b981' }}>
            <span className="stat-num">${formatMoney(stats.totalBudget)}</span>
            <span className="stat-label">Presupuesto Total</span>
          </div>
        </div>
      )}

      {/* ── Proximos eventos ── */}
      {upcoming.length > 0 && (
        <div style={{ background: 'var(--card)', borderRadius: '8px', padding: '1.5rem', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '0.95rem', color: 'var(--text)' }}>Proximos Eventos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {upcoming.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', background: 'var(--bg-secondary)', borderRadius: '6px', borderLeft: `3px solid ${statusBg(item.status)}`, cursor: 'pointer' }} onClick={() => openDetail(item)}>
                <span style={{ fontSize: '1.1rem' }}>🎨</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.evento_nombre}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{item.lugar || 'Sin lugar'} · {formatDateTime(item)}{item.patrocinio_empresa ? ` · ${item.patrocinio_empresa}` : ''}</div>
                </div>
                <span className={`status-badge ${statusColor(item.status)}`} style={{ fontSize: '0.7rem' }}>{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filtros ── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input className="search-input" placeholder="Buscar por evento, lugar, tematica, proveedor..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ flex: 1, minWidth: '250px' }} />
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
          <option value="">Todos los Estados</option>
          {VALID_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }} />
        <input type="date" value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }} />
        <select value={filterPatrocinio} onChange={(e) => { setFilterPatrocinio(e.target.value); setPage(1); }} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
          <option value="">Todos los Patrocinadores</option>
          {patrocinios.map(p => <option key={p.id} value={p.id}>{p.company_name || `#${p.id}`}</option>)}
        </select>
      </div>

      {/* ── Tabla principal ── */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nombre del Evento</th>
              <th>Patrocinador</th>
              <th>Fecha del Evento</th>
              <th>Presupuesto</th>
              <th>Lugar</th>
              <th>Tematica</th>
              <th>Material a Comprar</th>
              <th>Proveedores</th>
              <th>Alumno Asignado</th>
              <th>Observaciones</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className={selected?.id === item.id ? 'row-selected' : ''} onClick={() => openDetail(item)} style={{ cursor: 'pointer' }}>
                <td><strong>{item.evento_nombre || '-'}</strong></td>
                <td>{item.patrocinio_empresa || '-'}</td>
                <td style={{ fontSize: '0.8rem' }}>{formatDateTime(item)}</td>
                <td style={{ fontSize: '0.8rem' }}>${formatMoney(item.presupuesto)}</td>
                <td>{item.lugar || '-'}</td>
                <td>{item.tematica || '-'}</td>
                <td style={{ maxWidth: '180px' }}>{item.material_a_comprar || '-'}</td>
                <td>{item.proveedores || '-'}</td>
                <td>{item.alumno_asignado || '-'}</td>
                <td style={{ maxWidth: '180px' }}>{item.observaciones || '-'}</td>
                <td>
                  <select value={item.status} onChange={(e) => { e.stopPropagation(); handleStatusChange(item.id, e.target.value); }} onClick={(e) => e.stopPropagation()}
                    className={`status-badge ${statusColor(item.status)}`} style={{ border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: '2px 6px', borderRadius: '4px', background: statusBg(item.status) }}>
                    {VALID_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                  <button className="icon-btn edit" title="Editar" onClick={() => handleEdit(item)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button className="icon-btn danger" title="Eliminar" onClick={() => handleDelete(item.id)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan="12" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Sin eventos registrados</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
        <span>Pagina {page} de {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Siguiente</button>
      </div>
        </>
      )}

      {/* ════════════════ CALENDARIO TAB ════════════════ */}
      {activeTab === 'calendario' && (
        <div style={{ background: 'var(--card)', borderRadius: '8px', padding: '1.5rem', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <button className="btn-sm" onClick={() => { if (calMonth === 1) { setCalMonth(12); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }}>← Anterior</button>
            <h3 style={{ textTransform: 'capitalize', margin: 0 }}>{calMonthName}</h3>
            <button className="btn-sm" onClick={() => { if (calMonth === 12) { setCalMonth(1); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }}>Siguiente →</button>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.75rem', color: 'var(--text-light)', flexWrap: 'wrap' }}>
            {VALID_STATUS.map(s => (
              <span key={s}><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: statusColorValue(s), marginRight: '4px' }}></span>{s}</span>
            ))}
          </div>

          <div className="calendar-grid">
            {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'].map(d => (
              <div key={d} style={{ background: 'var(--bg-hover)', padding: '0.5rem', textAlign: 'center', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-light)' }}>{d}</div>
            ))}
            {calGrid.map((day, i) => {
              const events = getEventsForDay(day);
              const isToday = day && calYear === new Date().getFullYear() && calMonth === new Date().getMonth() + 1 && day === new Date().getDate();
              return (
                <div key={i} onClick={() => day && setCalSelectedDate(calSelectedDate === day ? null : day)}
                  style={{ background: 'var(--card)', padding: '0.35rem', minHeight: '80px', cursor: day ? 'pointer' : 'default', border: isToday ? '2px solid var(--info)' : calSelectedDate === day ? '2px solid var(--primary)' : 'none' }}>
                  {day && (
                    <>
                      <span style={{ display: 'inline-block', width: '24px', height: '24px', lineHeight: '24px', textAlign: 'center', borderRadius: '50%', fontSize: '0.8rem', fontWeight: isToday ? 700 : 400, background: isToday ? 'var(--info)' : 'transparent', color: isToday ? 'white' : 'var(--text)' }}>{day}</span>
                      <div style={{ marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        {events.slice(0, 4).map(ev => (
                          <div key={ev.id} onClick={(e) => { e.stopPropagation(); setCalDetailModal(ev); }}
                            style={{ fontSize: '0.6rem', padding: '1px 4px', borderRadius: '3px', background: statusBg(ev.status), color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', borderLeft: `2px solid ${statusColorValue(ev.status)}`, cursor: 'pointer' }}>
                            {ev.evento_hora && <strong style={{ marginRight: '2px' }}>{ev.evento_hora}</strong>}{ev.evento_nombre}
                          </div>
                        ))}
                        {events.length > 4 && <span style={{ fontSize: '0.6rem', color: 'var(--text-light)', textAlign: 'center' }}>+{events.length - 4} mas</span>}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected day detail */}
          {calSelectedDate && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ margin: 0 }}>{new Date(calYear, calMonth - 1, calSelectedDate).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</h4>
                <button className="btn success" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }} onClick={() => openNew(`${calYear}-${String(calMonth).padStart(2, '0')}-${String(calSelectedDate).padStart(2, '0')}`)}>+ Agregar Evento</button>
              </div>
              {getEventsForDay(calSelectedDate).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {getEventsForDay(calSelectedDate).map(ev => (
                    <div key={ev.id} onClick={() => setCalDetailModal(ev)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', background: 'var(--card)', borderRadius: '6px', cursor: 'pointer', borderLeft: `3px solid ${statusColorValue(ev.status)}` }}>
                      <span style={{ fontSize: '1rem' }}>🎨</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{ev.evento_nombre}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{formatDateTime(ev)}{ev.lugar ? ` · ${ev.lugar}` : ''}{ev.patrocinio_empresa ? ` · ${ev.patrocinio_empresa}` : ''}</div>
                      </div>
                      <span className={`status-badge ${statusColor(ev.status)}`} style={{ fontSize: '0.7rem' }}>{ev.status}</span>
                    </div>
                  ))}
                </div>
              ) : <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Sin eventos este dia</p>}
            </div>
          )}
        </div>
      )}

      {/* ═══ FORM MODAL ═══ */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditing(null); setFormErrors([]); }}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? 'Editar Evento' : 'Nuevo Evento'}</h2>
            {formErrors.length > 0 && <div className="form-errors">{formErrors.map((e, i) => <p key={i} style={{ color: 'var(--danger)', margin: '2px 0' }}>{e}</p>)}</div>}
            <div className="form-grid">
              <input placeholder="Nombre del evento *" value={form.evento_nombre || ''} onChange={(e) => setFormVal('evento_nombre', e.target.value)} />
              <div><label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '2px' }}>Fecha del Evento</label><DatePicker value={form.evento_fecha || ''} onChange={(v) => setFormVal('evento_fecha', v)} /></div>
              <div><label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '2px' }}>Hora del Evento</label><TimePicker value={form.evento_hora || ''} onChange={(v) => setFormVal('evento_hora', v)} /></div>
              <div><label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '2px' }}>Presupuesto del Evento</label><input type="number" step="0.01" min="0" placeholder="0.00" value={form.presupuesto || ''} onChange={(e) => setFormVal('presupuesto', e.target.value)} style={{ width: '100%' }} /></div>
              <select value={form.status || 'Pendiente'} onChange={(e) => setFormVal('status', e.target.value)}>
                <option value="">Estado</option>
                {VALID_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={form.patrocinio_id || ''} onChange={(e) => setFormVal('patrocinio_id', e.target.value || null)}>
                <option value="">Sin patrocinador</option>
                {patrocinios.map(p => <option key={p.id} value={p.id}>{p.company_name}{p.contact_person ? ` — ${p.contact_person}` : ''}</option>)}
              </select>
              <input placeholder="Lugar del evento" value={form.lugar || ''} onChange={(e) => setFormVal('lugar', e.target.value)} />
              <input placeholder="Tematica" value={form.tematica || ''} onChange={(e) => setFormVal('tematica', e.target.value)} />
              <input placeholder="Proveedores" value={form.proveedores || ''} onChange={(e) => setFormVal('proveedores', e.target.value)} />
              <input placeholder="Alumno asignado" value={form.alumno_asignado || ''} onChange={(e) => setFormVal('alumno_asignado', e.target.value)} />
              <div style={{ gridColumn: 'span 2' }}><textarea className="full-width" placeholder="Material a comprar" value={form.material_a_comprar || ''} onChange={(e) => setFormVal('material_a_comprar', e.target.value)} rows={3} /></div>
              <div style={{ gridColumn: 'span 2' }}><textarea className="full-width" placeholder="Observaciones" value={form.observaciones || ''} onChange={(e) => setFormVal('observaciones', e.target.value)} rows={3} /></div>
            </div>
            <button className="btn" onClick={handleSave} style={{ marginTop: '1rem' }}>Guardar</button>
          </div>
        </div>
      )}

      {/* ═══ DETAIL MODAL ═══ */}
      {selected && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div className="modal modal-wide detail-panel" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            {detailLoading ? <p style={{ textAlign: 'center', padding: '2rem' }}>Cargando detalle...</p> : detail ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.3rem' }}>🎨</span>
                    <h2 style={{ margin: 0 }}>{detail.evento_nombre || 'Sin nombre'}</h2>
                  </div>
                  <button className="btn-sm" onClick={closeDetail}>Cerrar</button>
                </div>
                <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
                  <div><label style={{ fontWeight: 600, display: 'block', color: 'var(--text-light)', fontSize: '0.75rem' }}>FECHA DEL EVENTO</label>{formatDateTime(detail)}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: 'var(--text-light)', fontSize: '0.75rem' }}>PRESUPUESTO</label>${formatMoney(detail.presupuesto)}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: 'var(--text-light)', fontSize: '0.75rem' }}>PATROCINADOR</label>{detail.patrocinio_empresa || '—'}{detail.patrocinio_contacto ? ` (${detail.patrocinio_contacto})` : ''}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: 'var(--text-light)', fontSize: '0.75rem' }}>LUGAR</label>{detail.lugar || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: 'var(--text-light)', fontSize: '0.75rem' }}>TEMATICA</label>{detail.tematica || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: 'var(--text-light)', fontSize: '0.75rem' }}>PROVEEDORES</label>{detail.proveedores || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: 'var(--text-light)', fontSize: '0.75rem' }}>ALUMNO ASIGNADO</label>{detail.alumno_asignado || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: 'var(--text-light)', fontSize: '0.75rem' }}>ESTADO</label><span className={`status-badge ${statusColor(detail.status)}`}>{detail.status || '—'}</span></div>
                  <div style={{ gridColumn: 'span 2' }}><label style={{ fontWeight: 600, display: 'block', color: 'var(--text-light)', fontSize: '0.75rem' }}>MATERIAL A COMPRAR</label>{detail.material_a_comprar || '—'}</div>
                  {detail.observaciones && <div style={{ gridColumn: 'span 2' }}><label style={{ fontWeight: 600, display: 'block', color: 'var(--text-light)', fontSize: '0.75rem' }}>OBSERVACIONES</label>{detail.observaciones}</div>}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                  <strong>Creado por:</strong> {detail.created_by_name || '—'} · <strong>Fecha:</strong> {detail.created_at || '—'}
                  {detail.updated_by_name && <> · <strong>Ultima modificacion:</strong> {detail.updated_by_name} ({detail.updated_at || '—'})</>}
                </div>
              </>
            ) : <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--danger)' }}>Error al cargar detalle</p>}
          </div>
        </div>
      )}

      {/* ════════════════ CALENDAR DETAIL MODAL ════════════════ */}
      {calDetailModal && (
        <div className="modal-overlay" onClick={() => setCalDetailModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>🎨 Detalle de Evento</h2>
              <button className="btn-sm" onClick={() => setCalDetailModal(null)}>Cerrar</button>
            </div>
            <div className="form-grid" style={{ gap: '0.75rem' }}>
              <div style={{ gridColumn: 'span 2' }}><label style={{ fontWeight: 600, display: 'block', color: 'var(--text-light)', fontSize: '0.75rem' }}>NOMBRE DEL EVENTO</label>{calDetailModal.evento_nombre || '—'}</div>
              <div><label style={{ fontWeight: 600, display: 'block', color: 'var(--text-light)', fontSize: '0.75rem' }}>FECHA</label>{formatDateTime(calDetailModal)}</div>
              <div><label style={{ fontWeight: 600, display: 'block', color: 'var(--text-light)', fontSize: '0.75rem' }}>ESTADO</label><span className={`status-badge ${statusColor(calDetailModal.status)}`}>{calDetailModal.status}</span></div>
              <div><label style={{ fontWeight: 600, display: 'block', color: 'var(--text-light)', fontSize: '0.75rem' }}>PATROCINADOR</label>{calDetailModal.patrocinio_empresa || '—'}</div>
              <div><label style={{ fontWeight: 600, display: 'block', color: 'var(--text-light)', fontSize: '0.75rem' }}>PRESUPUESTO</label>${formatMoney(calDetailModal.presupuesto)}</div>
              <div><label style={{ fontWeight: 600, display: 'block', color: 'var(--text-light)', fontSize: '0.75rem' }}>LUGAR</label>{calDetailModal.lugar || '—'}</div>
              <div><label style={{ fontWeight: 600, display: 'block', color: 'var(--text-light)', fontSize: '0.75rem' }}>TEMATICA</label>{calDetailModal.tematica || '—'}</div>
              <div><label style={{ fontWeight: 600, display: 'block', color: 'var(--text-light)', fontSize: '0.75rem' }}>PROVEEDORES</label>{calDetailModal.proveedores || '—'}</div>
              <div><label style={{ fontWeight: 600, display: 'block', color: 'var(--text-light)', fontSize: '0.75rem' }}>ALUMNO ASIGNADO</label>{calDetailModal.alumno_asignado || '—'}</div>
              {calDetailModal.material_a_comprar && <div style={{ gridColumn: 'span 2' }}><label style={{ fontWeight: 600, display: 'block', color: 'var(--text-light)', fontSize: '0.75rem' }}>MATERIAL A COMPRAR</label>{calDetailModal.material_a_comprar}</div>}
              {calDetailModal.observaciones && <div style={{ gridColumn: 'span 2' }}><label style={{ fontWeight: 600, display: 'block', color: 'var(--text-light)', fontSize: '0.75rem' }}>OBSERVACIONES</label>{calDetailModal.observaciones}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
