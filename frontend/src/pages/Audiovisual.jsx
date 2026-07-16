import { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import api from '../api';

export default function Audiovisual() {
  const [activeTab, setActiveTab] = useState('patrocinios');
  const [users, setUsers] = useState([]);

  // ═══ PATROCINIOS STATE ═══
  const [avItems, setAvItems] = useState([]);
  const [avStats, setAvStats] = useState(null);
  const [avSearch, setAvSearch] = useState('');
  const [avPage, setAvPage] = useState(1);
  const [avTotalPages, setAvTotalPages] = useState(1);
  const [avFilterStatus, setAvFilterStatus] = useState('');
  const [showAvForm, setShowAvForm] = useState(false);
  const [avForm, setAvForm] = useState({});
  const [avFormErrors, setAvFormErrors] = useState([]);
  const [patrocinios, setPatrocinios] = useState([]);

  // Detail / Seguimiento
  const [selectedAv, setSelectedAv] = useState(null);
  const [avDetail, setAvDetail] = useState(null);
  const [avChecklist, setAvChecklist] = useState([]);
  const [avComments, setAvComments] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [avDetailTab, setAvDetailTab] = useState('seguimiento');
  const [newComment, setNewComment] = useState('');
  const [commentResponsible, setCommentResponsible] = useState('');
  const [commentVideoLink, setCommentVideoLink] = useState('');
  const [commentFiles, setCommentFiles] = useState([]);
  const [sendingComment, setSendingComment] = useState(false);
  const [togglingItem, setTogglingItem] = useState(null);

  // ═══ EVENTOS STATE ═══
  const [evItems, setEvItems] = useState([]);
  const [evStats, setEvStats] = useState(null);
  const [evSearch, setEvSearch] = useState('');
  const [evPage, setEvPage] = useState(1);
  const [evTotalPages, setEvTotalPages] = useState(1);
  const [evFilterName, setEvFilterName] = useState('');
  const [showEvForm, setShowEvForm] = useState(false);
  const [evForm, setEvForm] = useState({});
  const [evFormErrors, setEvFormErrors] = useState([]);

  // Event Detail / Seguimiento
  const [selectedEv, setSelectedEv] = useState(null);
  const [evDetail, setEvDetail] = useState(null);
  const [evComments, setEvComments] = useState([]);
  const [evDetailLoading, setEvDetailLoading] = useState(false);
  const [evNewComment, setEvNewComment] = useState('');
  const [evCommentVideoLink, setEvCommentVideoLink] = useState('');
  const [evCommentImageLink, setEvCommentImageLink] = useState('');
  const [evSendingComment, setEvSendingComment] = useState(false);

  // Calendar
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [calItems, setCalItems] = useState([]);
  const [calSelectedDate, setCalSelectedDate] = useState(null);
  const [calDetailModal, setCalDetailModal] = useState(null);

  const VALID_AV_STATUS = ['completo', 'progreso', 'incompleto'];
  const VALID_EVENT_NAMES = ['dia del estudiante', 'ventas de la carrera', 'video promocional', 'mercaday', 'simposio', 'entrevistas', 'spirit week', 'otro'];

  // ═══════════════════════════════════════════════════════════
  // ── DATA LOADING ─────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════

  const loadUsers = () => { api.get('/users').then((r) => setUsers(r.data)).catch(() => {}); };
  const loadPatrocinios = () => { api.get('/patrocinios?limit=500').then((r) => setPatrocinios(r.data.patrocinios || r.data.items || r.data)).catch(() => {}); };

  // Patrocinios
  const loadAv = () => {
    let url = `/audiovisual/patrocinios?page=${avPage}&search=${avSearch}`;
    if (avFilterStatus) url += `&status=${avFilterStatus}`;
    api.get(url).then((r) => { setAvItems(r.data.items); setAvTotalPages(r.data.totalPages); });
  };
  const loadAvStats = () => { api.get('/audiovisual/patrocinios/stats').then((r) => setAvStats(r.data)).catch(() => {}); };

  const loadAvDetail = async (id) => {
    setDetailLoading(true);
    try {
      const r = await api.get(`/audiovisual/patrocinios/${id}`);
      setAvDetail(r.data.item);
      setAvChecklist(r.data.checklist);
      setAvComments(r.data.comments);
    } catch { setAvDetail(null); setAvChecklist([]); setAvComments([]); }
    setDetailLoading(false);
  };

  // Eventos
  const loadEv = () => {
    let url = `/audiovisual/events?page=${evPage}&search=${evSearch}`;
    if (evFilterName) url += `&event_name=${evFilterName}`;
    api.get(url).then((r) => { setEvItems(r.data.items); setEvTotalPages(r.data.totalPages); });
  };
  const loadEvStats = () => { api.get('/audiovisual/events/stats').then((r) => setEvStats(r.data)).catch(() => {}); };
  const loadCalEvents = () => { api.get(`/audiovisual/events/calendar?year=${calYear}&month=${calMonth}`).then((r) => setCalItems(r.data)).catch(() => {}); };

  const loadEvDetail = async (id) => {
    setEvDetailLoading(true);
    try {
      const r = await api.get(`/audiovisual/events/${id}`);
      setEvDetail(r.data.item);
      setEvComments(r.data.comments);
    } catch { setEvDetail(null); setEvComments([]); }
    setEvDetailLoading(false);
  };

  useEffect(() => { loadUsers(); loadPatrocinios(); loadAvStats(); loadEvStats(); loadCalEvents(); }, []);
  useEffect(() => { loadAv(); }, [avPage, avSearch, avFilterStatus]);
  useEffect(() => { loadEv(); }, [evPage, evSearch, evFilterName]);
  useEffect(() => { loadCalEvents(); }, [calYear, calMonth]);

  // ═══════════════════════════════════════════════════════════
  // ── PATROCINIO CRUD ──────────────────────────────────────
  // ═══════════════════════════════════════════════════════════

  const handleAvSave = async () => {
    const errs = [];
    if (!avForm.patrocinio_id) errs.push('El patrocinio es obligatorio');
    if (avForm.status && !VALID_AV_STATUS.includes(avForm.status)) errs.push('Estado invalido');
    setAvFormErrors(errs);
    if (errs.length > 0) return;
    try {
      if (avForm.id) await api.put(`/audiovisual/patrocinios/${avForm.id}`, avForm);
      else await api.post('/audiovisual/patrocinios', avForm);
      setShowAvForm(false); setAvForm({}); setAvFormErrors([]);
      loadAv(); loadAvStats();
    } catch (err) {
      const data = err.response?.data;
      if (data?.details) setAvFormErrors(data.details);
      else if (data?.error) setAvFormErrors([data.error]);
      else setAvFormErrors(['Error al guardar']);
    }
  };

  const handleAvDelete = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return;
    await api.delete(`/audiovisual/patrocinios/${id}`);
    if (selectedAv?.id === id) { setSelectedAv(null); setAvDetail(null); }
    loadAv(); loadAvStats();
  };

  const openAvDetail = (item) => { setSelectedAv(item); loadAvDetail(item.id); };
  const closeAvDetail = () => { setSelectedAv(null); setAvDetail(null); setAvChecklist([]); setAvComments([]); };

  // ── Checklist ──
  const toggleChecklistItem = async (itemId, completed) => {
    setTogglingItem(itemId);
    await api.put(`/audiovisual/patrocinios/${selectedAv.id}/checklist`, { item_id: itemId, completed: !completed });
    loadAvDetail(selectedAv.id);
    setTogglingItem(null);
  };

  // ── Comments ──
  const sendComment = async () => {
    if ((!newComment.trim() && commentFiles.length === 0 && !commentVideoLink) || !selectedAv) return;
    setSendingComment(true);
    const fd = new FormData();
    if (newComment.trim()) fd.append('comment', newComment.trim());
    if (commentResponsible) fd.append('responsible_id', commentResponsible);
    if (commentVideoLink) fd.append('video_link', commentVideoLink);
    for (const f of commentFiles) fd.append('files', f);
    try {
      await api.post(`/audiovisual/patrocinios/${selectedAv.id}/comments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setNewComment(''); setCommentResponsible(''); setCommentVideoLink(''); setCommentFiles([]);
      loadAvDetail(selectedAv.id);
    } catch {}
    setSendingComment(false);
  };

  const deleteComment = async (commentId) => {
    if (!confirm('¿Eliminar este comentario?')) return;
    await api.delete(`/audiovisual/patrocinios/${selectedAv.id}/comments/${commentId}`);
    loadAvDetail(selectedAv.id);
  };

  // ═══════════════════════════════════════════════════════════
  // ── EVENTO CRUD ──────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════

  const handleEvSave = async () => {
    const errs = [];
    if (!evForm.name) errs.push('El nombre del evento es obligatorio');
    setEvFormErrors(errs);
    if (errs.length > 0) return;
    try {
      if (evForm.id) await api.put(`/audiovisual/events/${evForm.id}`, evForm);
      else await api.post('/audiovisual/events', evForm);
      setShowEvForm(false); setEvForm({}); setEvFormErrors([]);
      loadEv(); loadEvStats(); loadCalEvents();
    } catch (err) {
      const data = err.response?.data;
      if (data?.details) setEvFormErrors(data.details);
      else if (data?.error) setEvFormErrors([data.error]);
      else setEvFormErrors(['Error al guardar']);
    }
  };

  const handleEvDelete = async (id) => {
    if (!confirm('¿Eliminar este evento?')) return;
    await api.delete(`/audiovisual/events/${id}`);
    if (selectedEv?.id === id) { setSelectedEv(null); setEvDetail(null); }
    loadEv(); loadEvStats(); loadCalEvents();
  };

  const openEvDetail = (item) => { setSelectedEv(item); loadEvDetail(item.id); };
  const closeEvDetail = () => { setSelectedEv(null); setEvDetail(null); setEvComments([]); };

  // ── Event Comments ──
  const sendEvComment = async () => {
    if ((!evNewComment.trim() && !evCommentVideoLink && !evCommentImageLink) || !selectedEv) return;
    setEvSendingComment(true);
    try {
      const payload = {};
      if (evNewComment.trim()) payload.comment = evNewComment.trim();
      if (evCommentVideoLink) payload.video_link = evCommentVideoLink;
      if (evCommentImageLink) payload.image_link = evCommentImageLink;
      await api.post(`/audiovisual/events/${selectedEv.id}/comments`, payload);
      setEvNewComment(''); setEvCommentVideoLink(''); setEvCommentImageLink('');
      loadEvDetail(selectedEv.id);
    } catch {}
    setEvSendingComment(false);
  };

  const deleteEvComment = async (commentId) => {
    if (!confirm('¿Eliminar este comentario?')) return;
    await api.delete(`/audiovisual/events/${selectedEv.id}/comments/${commentId}`);
    loadEvDetail(selectedEv.id);
  };

  // ═══════════════════════════════════════════════════════════
  // ── HELPERS ──────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════

  const avStatusColor = (s) => ({ 'completo': 'success', 'progreso': 'info', 'incompleto': 'warning' }[s] || '');
  const avStatusBg = (s) => ({ 'completo': 'var(--badge-success-bg)', 'progreso': 'var(--badge-info-bg)', 'incompleto': 'var(--badge-pending-bg)' }[s] || 'var(--badge-neutral-bg)');

  const chartData = useMemo(() => {
    if (!avStats) return [];
    return [
      { name: 'Completo', value: avStats.completo, color: '#22c55e' },
      { name: 'En progreso', value: avStats.progreso, color: 'var(--info)' },
      { name: 'Incompleto', value: avStats.incompleto, color: '#f59e0b' },
    ].filter(d => d.value > 0);
  }, [avStats]);

  const evChartData = useMemo(() => {
    if (!evStats?.byName) return [];
    const colors = ['var(--info)', 'var(--text-light)', '#06b6d4', '#10b981', '#f59e0b', 'var(--danger)', '#ec4899', 'var(--text-light)'];
    return evStats.byName.map((e, i) => ({ name: e.name, value: e.count, color: colors[i % colors.length] }));
  }, [evStats]);

  // Calendar
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
    return calItems.filter(e => e.event_date === dateStr);
  };

  const calMonthName = new Date(calYear, calMonth - 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  const eventDateColor = (dateStr) => {
    if (!dateStr) return 'var(--text-light)';
    const today = new Date().toISOString().slice(0, 10);
    if (dateStr < today) return 'var(--text-muted)';
    if (dateStr === today) return 'var(--info)';
    return 'var(--text-light)';
  };

  // ═══════════════════════════════════════════════════════════
  // ── RENDER ───────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════

  const isEventTab = activeTab === 'eventos';

  return (
    <div>
      <div className="page-header">
        <h1>Audiovisual</h1>
        <button className="btn success" onClick={() => isEventTab ? (setShowEvForm(!showEvForm), setEvForm({})) : (setShowAvForm(!showAvForm), setAvForm({}))}>
          {isEventTab ? (showEvForm ? 'Cancelar' : '+ Nuevo Evento') : (showAvForm ? 'Cancelar' : '+ Nuevo Registro')}
        </button>
      </div>

      {/* ── Tab Bar ── */}
      <div className="page-tabs">
        {[
          { key: 'patrocinios', label: 'Patrocinios' },
          { key: 'eventos', label: 'Eventos' },
          { key: 'calendario', label: 'Calendario' },
        ].map(t => (
          <button key={t.key} className={activeTab === t.key ? 'active' : ''}
            onClick={() => { setActiveTab(t.key); setShowAvForm(false); setShowEvForm(false); }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════ PATROCINIOS TAB ════════════════ */}
      {activeTab === 'patrocinios' && !selectedAv && (
        <>
          {/* Stats */}
          {avStats && (
            <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="stat-card"><span className="stat-num">{avStats.total}</span><span className="stat-label">Total Registros</span></div>
              <div className="stat-card success"><span className="stat-num">{avStats.completo}</span><span className="stat-label">Completos</span></div>
              <div className="stat-card info"><span className="stat-num">{avStats.progreso}</span><span className="stat-label">En Progreso</span></div>
              <div className="stat-card warning"><span className="stat-num">{avStats.incompleto}</span><span className="stat-label">Incompletos</span></div>
              <div className="stat-card" style={{ borderLeftColor: 'var(--text-light)' }}><span className="stat-num">{avStats.checklistCompleted}/{avStats.checklistTotal}</span><span className="stat-label">Checklist Avanzado</span></div>
            </div>
          )}

          <div className="dashboard-grid" style={{ marginBottom: '1.5rem' }}>
            <div style={{ background: 'var(--card)', borderRadius: '8px', padding: '1.5rem', border: '1px solid var(--border)' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>Distribucion por Estatus</h3>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart><Pie data={chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={4} dataKey="value">
                    {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie><Tooltip /><Legend /></PieChart>
                </ResponsiveContainer>
              ) : <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Sin datos</p>}
            </div>
            <div style={{ background: 'var(--card)', borderRadius: '8px', padding: '1.5rem', border: '1px solid var(--border)' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>Progreso del Checklist</h3>
              {avStats && avStats.checklistTotal > 0 ? (
                <div style={{ padding: '2rem' }}>
                  <div style={{ background: 'var(--border)', borderRadius: '999px', height: '24px', overflow: 'hidden' }}>
                    <div style={{ background: 'var(--success)', height: '100%', borderRadius: '999px', transition: 'width 0.5s', width: `${Math.round((avStats.checklistCompleted / avStats.checklistTotal) * 100)}%` }} />
                  </div>
                  <p style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.9rem', color: 'var(--text-light)' }}>
                    {avStats.checklistCompleted} de {avStats.checklistTotal} items completados ({Math.round((avStats.checklistCompleted / avStats.checklistTotal) * 100)}%)
                  </p>
                </div>
              ) : <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Sin items en checklist</p>}
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input className="search-input" placeholder="Buscar por empresa, contacto, alumno..." value={avSearch} onChange={(e) => { setAvSearch(e.target.value); setAvPage(1); }} style={{ flex: 1, minWidth: '250px' }} />
            <select value={avFilterStatus} onChange={(e) => { setAvFilterStatus(e.target.value); setAvPage(1); }} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <option value="">Todos los Estados</option>
              {VALID_AV_STATUS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>

          <div className="table-container">
            <table>
              <thead><tr><th>Cliente</th><th>Contacto</th><th>Paquete</th><th>Alumno</th><th>Video</th><th>Reels</th><th>Entrega</th><th>Checklist</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                {avItems.map(item => (
                  <tr key={item.id} className={selectedAv?.id === item.id ? 'row-selected' : ''} onClick={() => openAvDetail(item)} style={{ cursor: 'pointer' }}>
                    <td><strong>{item.company_name || '-'}</strong></td>
                    <td style={{ fontSize: '0.8rem' }}>{item.contact_person || '-'}</td>
                    <td style={{ fontSize: '0.8rem' }}>{item.package || '-'}</td>
                    <td style={{ fontSize: '0.8rem' }}>{item.student_obtained || '-'}</td>
                    <td style={{ fontSize: '0.8rem' }}>{item.video_url ? <a href={item.video_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: 'var(--info)' }}>Ver</a> : '—'}</td>
                    <td style={{ fontSize: '0.8rem' }}>{item.reels_url ? <a href={item.reels_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: 'var(--text-light)' }}>Ver</a> : '—'}</td>
                    <td style={{ fontSize: '0.8rem' }}>{item.delivery_date || '—'}</td>
                    <td style={{ fontSize: '0.8rem' }}>{item.checklist_completed || 0}/{item.checklist_total || 0}</td>
                    <td><span className={`status-badge ${avStatusColor(item.status)}`}>{item.status || '-'}</span></td>
                    <td className="actions-cell" onClick={e => e.stopPropagation()}>
                      <button className="icon-btn danger" title="Eliminar" onClick={() => handleAvDelete(item.id)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {avItems.length === 0 && <tr><td colSpan="10" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Sin registros audiovisuales</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button disabled={avPage <= 1} onClick={() => setAvPage(avPage - 1)}>Anterior</button>
            <span>Pagina {avPage} de {avTotalPages}</span>
            <button disabled={avPage >= avTotalPages} onClick={() => setAvPage(avPage + 1)}>Siguiente</button>
          </div>
        </>
      )}

      {/* ════════════════ PATROCINIO DETAIL + SEGUIMIENTO ════════════════ */}
      {activeTab === 'patrocinios' && selectedAv && (
        <div>
          {/* Back button */}
          <button onClick={closeAvDetail} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text-light)', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', marginBottom: '1.25rem', transition: 'all 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
            Volver a la lista
          </button>
          {detailLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--info)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Cargando detalle...</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          ) : avDetail ? (
            <>
              <div className="finance-tabs" style={{ marginBottom: '1.5rem' }}>
                <button className={`finance-tab ${avDetailTab === 'seguimiento' ? 'active' : ''}`} onClick={() => setAvDetailTab('seguimiento')}>Seguimiento</button>
              </div>

              {avDetailTab === 'seguimiento' && (
              <div className="dashboard-grid" style={{ alignItems: 'start' }}>

              {/* ── Left: Info Card ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'var(--card)', borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)' }}>
                  {/* Card header with accent */}
                  <div style={{ background: 'linear-gradient(135deg, #0f3460 0%, #1a4a7a 100%)', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'white', letterSpacing: '-0.01em' }}>{avDetail.company_name}</h3>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)' }}>Patrocinador</span>
                      </div>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600, textTransform: 'capitalize', letterSpacing: '0.02em', background: avDetail.status === 'completo' ? 'var(--badge-success-bg)' : avDetail.status === 'progreso' ? 'var(--badge-info-bg)' : 'var(--badge-warning-bg)', color: avDetail.status === 'completo' ? 'var(--badge-success-text)' : avDetail.status === 'progreso' ? 'var(--badge-info-text)' : 'var(--badge-warning-text)' }}>
                      {avDetail.status === 'completo' && <span style={{ marginRight: '0.3rem' }}>&#10003;</span>}
                      {avDetail.status === 'progreso' && <span style={{ marginRight: '0.3rem' }}>&#8987;</span>}
                      {avDetail.status === 'incompleto' && <span style={{ marginRight: '0.3rem' }}>&#9888;</span>}
                      {avDetail.status}
                    </span>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {/* Contacto */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--badge-info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--info)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '2px' }}>Contacto</span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 500 }}>{avDetail.contact_person || '—'}</span>
                        </div>
                      </div>
                      {/* Paquete */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--badge-neutral-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '2px' }}>Paquete</span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 500 }}>{avDetail.package || '—'}</span>
                        </div>
                      </div>
                      {/* Alumno */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--badge-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '2px' }}>Alumno</span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 500 }}>{avDetail.student_obtained || '—'}</span>
                        </div>
                      </div>
                      {/* Fecha Entrega */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--badge-pending-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '2px' }}>Fecha Entrega</span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 500 }}>{avDetail.delivery_date || '—'}</span>
                        </div>
                      </div>
                      {/* Video */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--badge-info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--info)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '2px' }}>Video</span>
                          {avDetail.video_url ? (
                            <a href={avDetail.video_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: 'var(--info)', fontWeight: 500, textDecoration: 'none' }}>
                              Ver video
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '3px', verticalAlign: 'middle' }}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            </a>
                          ) : <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>—</span>}
                        </div>
                      </div>
                      {/* Reels */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--badge-neutral-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/></svg>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '2px' }}>Reels</span>
                          {avDetail.reels_url ? (
                            <a href={avDetail.reels_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontWeight: 500, textDecoration: 'none' }}>
                              Ver reels
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '3px', verticalAlign: 'middle' }}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            </a>
                          ) : <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>—</span>}
                        </div>
                      </div>
                    </div>
                    {/* Observaciones */}
                    {avDetail.observations && (
                      <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Observaciones</span>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-dark)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{avDetail.observations}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Checklist Card ── */}
                <div style={{ background: 'var(--card)', borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)' }}>
                  <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'linear-gradient(135deg, var(--success), #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                      </div>
                      <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>Checklist</h3>
                    </div>
                    {avChecklist.length > 0 && (
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: avChecklist.filter(i => i.completed).length === avChecklist.length ? 'var(--success)' : 'var(--text-light)', background: avChecklist.filter(i => i.completed).length === avChecklist.length ? 'var(--success-subtle)' : 'var(--bg-secondary)', padding: '0.25rem 0.6rem', borderRadius: '999px' }}>
                        {avChecklist.filter(i => i.completed).length}/{avChecklist.length}
                      </span>
                    )}
                  </div>
                  {avChecklist.length > 0 && (
                    <div style={{ padding: '0.85rem 1.25rem 0' }}>
                      <div style={{ background: 'var(--bg-hover)', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                        <div style={{
                          background: avChecklist.length > 0 && avChecklist.filter(i => i.completed).length === avChecklist.length
                            ? 'linear-gradient(90deg, var(--success), #16a34a)'
                            : 'linear-gradient(90deg, #3b82f6, var(--info))',
                          height: '100%', borderRadius: '999px', transition: 'width 0.4s ease',
                          width: `${avChecklist.length > 0 ? Math.round((avChecklist.filter(i => i.completed).length / avChecklist.length) * 100) : 0}%`
                        }} />
                      </div>
                    </div>
                  )}
                  <div style={{ padding: '0.5rem 0.75rem 0.75rem' }}>
                    {avChecklist.length === 0 ? (
                      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1.5rem 0', margin: 0 }}>Sin items en checklist</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {avChecklist.map(item => (
                          <div key={item.id} style={{
                            display: 'flex', alignItems: 'center', gap: '0.6rem',
                            padding: '0.55rem 0.65rem', borderRadius: '8px',
                            background: item.completed ? 'var(--success-subtle)' : 'transparent',
                            transition: 'all 0.15s',
                            opacity: togglingItem === item.id ? 0.5 : 1
                          }}>
                            <div style={{
                              width: '18px', height: '18px', borderRadius: '5px',
                              border: item.completed ? 'none' : '2px solid var(--border)',
                              background: item.completed ? 'linear-gradient(135deg, var(--success), #16a34a)' : 'white',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0, cursor: 'pointer', transition: 'all 0.15s'
                            }} onClick={() => toggleChecklistItem(item.id, item.completed)}>
                              {item.completed && (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              )}
                            </div>
                            <span style={{
                              flex: 1, fontSize: '0.83rem',
                              textDecoration: item.completed ? 'line-through' : 'none',
                              color: item.completed ? 'var(--text-muted)' : 'var(--text-dark)',
                              fontWeight: item.completed ? 400 : 500
                            }}>{item.label || item.item_text}</span>
                            {item.completed_at && (
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{item.completed_at?.slice(0, 10)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Right: Comments (Chat-style) ── */}
              <div style={{ background: 'var(--card)', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', maxHeight: '75vh', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
                {/* Chat header */}
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #0f3460, #1a4a7a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>Seguimiento del Equipo</h3>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{avComments.length} {avComments.length === 1 ? 'mensaje' : 'mensajes'}</span>
                  </div>
                </div>

                {/* Chat messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {avComments.length === 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', gap: '0.75rem' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Sin comentarios aun</p>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Sé el primero en comentar</span>
                    </div>
                  )}
                  {avComments.map((c, cIdx) => {
                    const prevComment = avComments[cIdx - 1];
                    const showAvatar = !prevComment || prevComment.created_by_name !== c.created_by_name;
                    const initials = (c.created_by_name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                    const avatarColors = ['var(--info)', 'var(--text-light)', 'var(--success)', 'var(--warning)', 'var(--danger)', 'var(--info)', 'var(--danger)'];
                    const colorIdx = (c.created_by_name || '').split('').reduce((a, ch) => a + ch.charCodeAt(0), 0) % avatarColors.length;

                    return (
                      <div key={c.id} style={{ padding: showAvatar && cIdx > 0 ? '0.4rem 0 0' : '0' }}>
                        {c.deleted ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', margin: '0.25rem 0' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem', margin: 0 }}>Mensaje eliminado por {c.deleted_by_name}</p>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'flex-start' }}>
                            {/* Avatar */}
                            {showAvatar ? (
                              <div style={{
                                width: '32px', height: '32px', borderRadius: '8px',
                                background: `linear-gradient(135deg, ${avatarColors[colorIdx]}, ${avatarColors[colorIdx]}dd)`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, fontSize: '0.7rem', fontWeight: 700, color: 'white',
                                boxShadow: `0 2px 6px ${avatarColors[colorIdx]}33`
                              }}>
                                {initials}
                              </div>
                            ) : <div style={{ width: '32px', flexShrink: 0 }} />}

                            {/* Message bubble */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              {showAvatar && (
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '3px' }}>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>{c.created_by_name || 'Usuario'}</span>
                                  {c.responsible_name && (
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-light)', background: 'var(--badge-neutral-bg)', padding: '1px 6px', borderRadius: '999px', fontWeight: 500 }}>
                                      → {c.responsible_name}
                                    </span>
                                  )}
                                  <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                    {c.created_at?.slice(0, 10) === new Date().toISOString().slice(0, 10)
                                      ? `Hoy ${c.created_at?.slice(11, 16)}`
                                      : c.created_at?.slice(0, 10) === new Date(Date.now() - 86400000).toISOString().slice(0, 10)
                                        ? `Ayer ${c.created_at?.slice(11, 16)}`
                                        : c.created_at?.slice(0, 16).replace('T', ' ')}
                                  </span>
                                </div>
                              )}
                              <div style={{
                                background: 'var(--card)',
                                border: '1px solid var(--border)',
                                borderRadius: showAvatar ? '4px 10px 10px 10px' : '10px',
                                padding: '0.55rem 0.75rem',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                              }}>
                                {c.comment && (
                                  <p style={{ fontSize: '0.84rem', margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-dark)', lineHeight: 1.55 }}>{c.comment}</p>
                                )}
                                {c.video_link && (
                                  <a href={c.video_link} target="_blank" rel="noreferrer" style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                    marginTop: c.comment ? '0.4rem' : 0, padding: '0.3rem 0.6rem',
                                    background: 'var(--badge-info-bg)', borderRadius: '6px', border: '1px solid var(--badge-info-bg)',
                                    fontSize: '0.78rem', color: 'var(--info)', textDecoration: 'none', fontWeight: 500
                                  }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                    Ver video
                                  </a>
                                )}
                                {c.files?.length > 0 && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: c.comment || c.video_link ? '0.45rem' : '0.15rem' }}>
                                    {c.files.map(f => (
                                      <a key={f.id} href={f.file_url} target="_blank" rel="noreferrer" style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                        padding: '0.25rem 0.55rem', background: 'var(--bg-hover)',
                                        borderRadius: '6px', fontSize: '0.72rem', color: 'var(--text-dark)',
                                        textDecoration: 'none', border: '1px solid var(--border)', fontWeight: 500,
                                        transition: 'background 0.15s'
                                      }}>
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                                        {f.file_name || 'Archivo'}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {/* Delete button */}
                              <button onClick={() => deleteComment(c.id)} style={{
                                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)',
                                fontSize: '0.68rem', marginTop: '0.2rem', padding: '2px 4px',
                                borderRadius: '4px', opacity: 0.5, transition: 'opacity 0.15s',
                                display: 'inline-flex', alignItems: 'center', gap: '3px'
                              }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                                Eliminar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ── Comment Input Area ── */}
                <div style={{ padding: '0.85rem 1rem', borderTop: '1px solid var(--border)', background: 'var(--card)' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.65rem 0.75rem', transition: 'border-color 0.15s' }}>
                    <textarea
                      className="full-width"
                      rows={2}
                      placeholder="Escribe un comentario..."
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment(); } }}
                      style={{
                        flex: 1, border: 'none', background: 'transparent', outline: 'none',
                        fontSize: '0.85rem', color: 'var(--text)', resize: 'none', lineHeight: 1.5,
                        fontFamily: 'inherit', minHeight: '36px', padding: '0'
                      }}
                    />
                    <button onClick={sendComment} disabled={sendingComment} style={{
                      width: '34px', height: '34px', borderRadius: '8px', border: 'none',
                      background: (newComment.trim() || commentFiles.length > 0 || commentVideoLink)
                        ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'var(--border)',
                      color: 'white', cursor: (newComment.trim() || commentFiles.length > 0 || commentVideoLink) ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'all 0.15s', boxShadow: (newComment.trim() || commentFiles.length > 0 || commentVideoLink)
                        ? '0 2px 6px rgba(59,130,246,0.3)' : 'none'
                    }}>
                      {sendingComment ? (
                        <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                      )}
                    </button>
                  </div>
                  {/* Toolbar row */}
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.5rem', minHeight: '32px' }}>
                    <select value={commentResponsible} onChange={e => setCommentResponsible(e.target.value)} style={{
                      padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border)',
                      fontSize: '0.75rem', color: 'var(--text-light)', background: 'var(--card)', cursor: 'pointer', outline: 'none',
                      height: '32px', boxSizing: 'border-box'
                    }}>
                      <option value="">Responsable</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <input className="search-input" placeholder="Link de video" value={commentVideoLink} onChange={e => setCommentVideoLink(e.target.value)} style={{
                      flex: 1, minWidth: '120px', fontSize: '0.75rem', padding: '0.35rem 0.5rem',
                      height: '32px', boxSizing: 'border-box'
                    }} />
                    <label style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0 0.6rem',
                      background: 'var(--card)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem',
                      color: 'var(--text-light)', border: '1px solid var(--border)', transition: 'background 0.15s',
                      height: '32px', boxSizing: 'border-box'
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      Imagenes
                      <input type="file" accept="image/*" multiple onChange={e => setCommentFiles(Array.from(e.target.files).slice(0, 5))} style={{ display: 'none' }} />
                    </label>
                    {commentFiles.length > 0 && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--info)', fontWeight: 600, background: 'var(--badge-info-bg)', padding: '0.2rem 0.5rem', borderRadius: '999px' }}>
                        {commentFiles.length} archivo{commentFiles.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            )}
          </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem', gap: '0.75rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--danger-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <p style={{ color: 'var(--danger)', fontSize: '0.9rem', fontWeight: 500, margin: 0 }}>Error al cargar el detalle</p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════ EVENTOS TAB ════════════════ */}
      {activeTab === 'eventos' && !selectedEv && (
        <>
          {evStats && (
            <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="stat-card"><span className="stat-num">{evStats.total}</span><span className="stat-label">Total Eventos</span></div>
              <div className="stat-card info"><span className="stat-num">{evStats.upcoming}</span><span className="stat-label">Proximos</span></div>
              <div className="stat-card" style={{ borderLeftColor: 'var(--text-muted)' }}><span className="stat-num">{evStats.past}</span><span className="stat-label">Pasados</span></div>
            </div>
          )}

          <div className="dashboard-grid" style={{ marginBottom: '1.5rem' }}>
            <div style={{ background: 'var(--card)', borderRadius: '8px', padding: '1.5rem', border: '1px solid var(--border)' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>Eventos por Tipo</h3>
              {evChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart><Pie data={evChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={4} dataKey="value">
                    {evChartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie><Tooltip /><Legend /></PieChart>
                </ResponsiveContainer>
              ) : <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Sin datos</p>}
            </div>
            <div style={{ background: 'var(--card)', borderRadius: '8px', padding: '1.5rem', border: '1px solid var(--border)' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>Detalle por Tipo</h3>
              {evStats?.byName?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {evStats.byName.map(e => (
                    <div key={e.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.75rem', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '0.85rem' }}>
                      <span style={{ textTransform: 'capitalize' }}>{e.name}</span><strong>{e.count}</strong>
                    </div>
                  ))}
                </div>
              ) : <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Sin eventos</p>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input className="search-input" placeholder="Buscar evento..." value={evSearch} onChange={e => { setEvSearch(e.target.value); setEvPage(1); }} style={{ flex: 1, minWidth: '250px' }} />
            <select value={evFilterName} onChange={e => { setEvFilterName(e.target.value); setEvPage(1); }} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <option value="">Todos los Tipos</option>
              {VALID_EVENT_NAMES.map(n => <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>)}
            </select>
          </div>

          <div className="table-container">
            <table>
              <thead><tr><th>Nombre</th><th>Fecha</th><th>Video</th><th>Reels</th><th>Acciones</th></tr></thead>
              <tbody>
                {evItems.map(ev => (
                  <tr key={ev.id} className={selectedEv?.id === ev.id ? 'row-selected' : ''} onClick={() => openEvDetail(ev)} style={{ cursor: 'pointer' }}>
                    <td><strong style={{ textTransform: 'capitalize' }}>{ev.name || '-'}</strong></td>
                    <td style={{ fontSize: '0.8rem' }}>{ev.event_date || '—'}</td>
                    <td style={{ fontSize: '0.8rem' }}>{ev.video_url ? <a href={ev.video_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: 'var(--info)' }}>Ver</a> : '—'}</td>
                    <td style={{ fontSize: '0.8rem' }}>{ev.reels_url ? <a href={ev.reels_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: 'var(--text-light)' }}>Ver</a> : '—'}</td>
                    <td className="actions-cell" onClick={e => e.stopPropagation()}>
                      <button className="icon-btn danger" title="Eliminar" onClick={() => handleEvDelete(ev.id)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {evItems.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Sin eventos</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button disabled={evPage <= 1} onClick={() => setEvPage(evPage - 1)}>Anterior</button>
            <span>Pagina {evPage} de {evTotalPages}</span>
            <button disabled={evPage >= evTotalPages} onClick={() => setEvPage(evPage + 1)}>Siguiente</button>
          </div>
        </>
      )}

      {/* ════════════════ EVENTO DETAIL + SEGUIMIENTO ════════════════ */}
      {activeTab === 'eventos' && selectedEv && (
        <div>
          <button className="btn-sm" onClick={closeEvDetail} style={{ marginBottom: '1rem' }}>← Volver a la lista</button>
          {evDetailLoading ? <p style={{ textAlign: 'center', padding: '2rem' }}>Cargando...</p> : evDetail ? (
            <div className="dashboard-grid">
               {/* Left: Event Info */}
              <div style={{ background: 'var(--card)', borderRadius: '8px', padding: '1.5rem', border: '1px solid var(--border)' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1rem', textTransform: 'capitalize' }}>{evDetail.name}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div><label style={{ fontWeight: 600, color: 'var(--text-light)', fontSize: '0.75rem', display: 'block' }}>FECHA</label>{evDetail.event_date || '—'}</div>
                  <div><label style={{ fontWeight: 600, color: 'var(--text-light)', fontSize: '0.75rem', display: 'block' }}>VIDEO</label>{evDetail.video_url ? <a href={evDetail.video_url} target="_blank" rel="noreferrer" style={{ color: 'var(--info)' }}>Ver video</a> : '—'}</div>
                  <div><label style={{ fontWeight: 600, color: 'var(--text-light)', fontSize: '0.75rem', display: 'block' }}>REELS</label>{evDetail.reels_url ? <a href={evDetail.reels_url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-light)' }}>Ver reels</a> : '—'}</div>
                  <div style={{ gridColumn: 'span 2' }}><label style={{ fontWeight: 600, color: 'var(--text-light)', fontSize: '0.75rem', display: 'block' }}>OBSERVACIONES</label>{evDetail.observations || '—'}</div>
                </div>
              </div>

              {/* Right: Comments (Chat) */}
              <div style={{ background: 'var(--card)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', maxHeight: '70vh' }}>
                <h3 style={{ padding: '1rem 1.5rem 0.5rem', fontSize: '0.95rem' }}>Seguimiento</h3>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem' }}>
                  {evComments.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Sin comentarios aun</p>}
                  {evComments.map(c => (
                    <div key={c.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                      {c.deleted ? (
                        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>Mensaje eliminado por {c.deleted_by_name}</p>
                      ) : (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <strong style={{ fontSize: '0.85rem' }}>{c.created_by_name || 'Usuario'}</strong>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{c.created_at?.slice(0, 16)}</span>
                          </div>
                          {c.comment && <p style={{ fontSize: '0.85rem', margin: '0.25rem 0', whiteSpace: 'pre-wrap' }}>{c.comment}</p>}
                          {c.video_link && <a href={c.video_link} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--info)' }}>🔗 Ver video</a>}
                          {c.image_link && <a href={c.image_link} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--info)' }}>🖼️ Ver imagen</a>}
                          {c.files?.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
                              {c.files.map(f => (
                                <a key={f.id} href={f.file_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', padding: '0.2rem 0.5rem', background: 'var(--bg-hover)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--info)', textDecoration: 'none' }}>
                                  📎 {f.file_name || 'Archivo'}
                                </a>
                              ))}
                            </div>
                          )}
                          <button onClick={() => deleteEvComment(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.7rem', marginTop: '0.25rem' }}>Eliminar</button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)' }}>
                  <textarea className="full-width" rows={2} placeholder="Escribe un comentario..." value={evNewComment} onChange={e => setEvNewComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendEvComment(); } }} style={{ marginBottom: '0.5rem' }} />
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', minHeight: '32px' }}>
                    <input className="search-input" placeholder="Link de video (opcional)" value={evCommentVideoLink} onChange={e => setEvCommentVideoLink(e.target.value)} style={{ flex: 1, minWidth: '150px', fontSize: '0.8rem', height: '32px', boxSizing: 'border-box', padding: '0.35rem 0.5rem' }} />
                    <input className="search-input" placeholder="Link de imagen (opcional)" value={evCommentImageLink} onChange={e => setEvCommentImageLink(e.target.value)} style={{ flex: 1, minWidth: '150px', fontSize: '0.8rem', height: '32px', boxSizing: 'border-box', padding: '0.35rem 0.5rem' }} />
                    <button className="btn success" onClick={sendEvComment} disabled={evSendingComment} style={{ fontSize: '0.8rem' }}>{evSendingComment ? '...' : 'Enviar'}</button>
                  </div>
                </div>
              </div>
            </div>
          ) : <p style={{ textAlign: 'center', color: 'var(--danger)' }}>Error al cargar</p>}
        </div>
      )}

      {/* ════════════════ CALENDARIO TAB ════════════════ */}
      {activeTab === 'calendario' && (
        <div style={{ background: 'var(--card)', borderRadius: '8px', padding: '1.5rem', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <button className="btn-sm" onClick={() => { if (calMonth === 1) { setCalMonth(12); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }}>← Anterior</button>
            <h3 style={{ textTransform: 'capitalize', margin: 0 }}>{calMonthName}</h3>
            <button className="btn-sm" onClick={() => { if (calMonth === 12) { setCalMonth(1); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }}>Siguiente →</button>
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
                        {events.slice(0, 3).map(ev => (
                          <div key={ev.id} onClick={e => { e.stopPropagation(); setCalDetailModal(ev); }}
                            style={{ fontSize: '0.6rem', padding: '1px 4px', borderRadius: '3px', background: 'var(--badge-neutral-bg)', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', borderLeft: '2px solid var(--text-light)', cursor: 'pointer', textTransform: 'capitalize' }}>
                            {ev.name}
                          </div>
                        ))}
                        {events.length > 3 && <span style={{ fontSize: '0.6rem', color: 'var(--text-light)', textAlign: 'center' }}>+{events.length - 3} mas</span>}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {calSelectedDate && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ margin: 0 }}>{new Date(calYear, calMonth - 1, calSelectedDate).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</h4>
              </div>
              {getEventsForDay(calSelectedDate).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {getEventsForDay(calSelectedDate).map(ev => (
                    <div key={ev.id} onClick={() => setCalDetailModal(ev)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', background: 'var(--card)', borderRadius: '6px', cursor: 'pointer', borderLeft: '3px solid var(--text-light)' }}>
                      <span style={{ fontSize: '1rem' }}>🎬</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize' }}>{ev.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{ev.event_date || '—'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Sin eventos este dia</p>}
            </div>
          )}
        </div>
      )}

      {/* ════════════════ CALENDAR DETAIL MODAL ════════════════ */}
      {calDetailModal && (
        <div className="modal-overlay" onClick={() => setCalDetailModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', textTransform: 'capitalize' }}>🎬 {calDetailModal.name}</h2>
              <button className="btn-sm" onClick={() => setCalDetailModal(null)}>Cerrar</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div><label style={{ fontWeight: 600, color: 'var(--text-light)', fontSize: '0.75rem', display: 'block' }}>FECHA</label>{calDetailModal.event_date || '—'}</div>
              <div><label style={{ fontWeight: 600, color: 'var(--text-light)', fontSize: '0.75rem', display: 'block' }}>VIDEO</label>{calDetailModal.video_url ? <a href={calDetailModal.video_url} target="_blank" rel="noreferrer" style={{ color: 'var(--info)' }}>Ver</a> : '—'}</div>
              <div><label style={{ fontWeight: 600, color: 'var(--text-light)', fontSize: '0.75rem', display: 'block' }}>REELS</label>{calDetailModal.reels_url ? <a href={calDetailModal.reels_url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-light)' }}>Ver</a> : '—'}</div>
              <div style={{ gridColumn: 'span 2' }}><label style={{ fontWeight: 600, color: 'var(--text-light)', fontSize: '0.75rem', display: 'block' }}>OBSERVACIONES</label>{calDetailModal.observations || '—'}</div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ AV FORM MODAL ════════════════ */}
      {showAvForm && (
        <div className="modal-overlay" onClick={() => { setShowAvForm(false); setAvFormErrors([]); }}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <h2>Nuevo Registro Audiovisual</h2>
            {avFormErrors.length > 0 && <div className="form-errors">{avFormErrors.map((e, i) => <p key={i} style={{ color: 'var(--danger)', margin: '2px 0' }}>{e}</p>)}</div>}
            <div className="form-grid">
              <select value={avForm.patrocinio_id || ''} onChange={e => setAvForm({ ...avForm, patrocinio_id: e.target.value || null })}>
                <option value="">Patrocinio *</option>
                {(Array.isArray(patrocinios) ? patrocinios : []).map(p => <option key={p.id} value={p.id}>{p.company_name} — {p.contact_person || 'Sin contacto'}</option>)}
              </select>
              <select value={avForm.status || 'incompleto'} onChange={e => setAvForm({ ...avForm, status: e.target.value })}>
                {VALID_AV_STATUS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
              <input placeholder="Link de video" value={avForm.video_url || ''} onChange={e => setAvForm({ ...avForm, video_url: e.target.value })} />
              <input placeholder="Link de reels" value={avForm.reels_url || ''} onChange={e => setAvForm({ ...avForm, reels_url: e.target.value })} />
              <div><label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '2px' }}>Fecha de entrega</label><input type="date" value={avForm.delivery_date || ''} onChange={e => setAvForm({ ...avForm, delivery_date: e.target.value })} style={{ width: '100%' }} /></div>
              <div style={{ gridColumn: 'span 2' }}><textarea className="full-width" placeholder="Observaciones" value={avForm.observations || ''} onChange={e => setAvForm({ ...avForm, observations: e.target.value })} rows={3} /></div>
            </div>
            <button className="btn" onClick={handleAvSave} style={{ marginTop: '1rem' }}>Guardar</button>
          </div>
        </div>
      )}

      {/* ════════════════ EVENT FORM MODAL ════════════════ */}
      {showEvForm && (
        <div className="modal-overlay" onClick={() => { setShowEvForm(false); setEvFormErrors([]); }}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <h2>Nuevo Evento</h2>
            {evFormErrors.length > 0 && <div className="form-errors">{evFormErrors.map((e, i) => <p key={i} style={{ color: 'var(--danger)', margin: '2px 0' }}>{e}</p>)}</div>}
            <div className="form-grid">
              <select value={evForm.name || ''} onChange={e => setEvForm({ ...evForm, name: e.target.value })}>
                <option value="">Nombre del evento *</option>
                {VALID_EVENT_NAMES.map(n => <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>)}
              </select>
              <div><label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '2px' }}>Fecha del evento</label><input type="date" value={evForm.event_date || ''} onChange={e => setEvForm({ ...evForm, event_date: e.target.value })} style={{ width: '100%' }} /></div>
              <input placeholder="Link de video" value={evForm.video_url || ''} onChange={e => setEvForm({ ...evForm, video_url: e.target.value })} />
              <input placeholder="Link de reels" value={evForm.reels_url || ''} onChange={e => setEvForm({ ...evForm, reels_url: e.target.value })} />
              <div style={{ gridColumn: 'span 2' }}><textarea className="full-width" placeholder="Observaciones / Fotos del evento" value={evForm.observations || ''} onChange={e => setEvForm({ ...evForm, observations: e.target.value })} rows={3} /></div>
            </div>
            <button className="btn" onClick={handleEvSave} style={{ marginTop: '1rem' }}>Guardar</button>
          </div>
        </div>
      )}
    </div>
  );
}
