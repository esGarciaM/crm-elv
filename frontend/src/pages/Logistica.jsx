import { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import api from '../api';

export default function Logistica() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // ── Shared state ──
  const [users, setUsers] = useState([]);

  // ═══ ACTIVITIES STATE ═══
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [types, setTypes] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [formErrors, setFormErrors] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterResponsible, setFilterResponsible] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const [upcoming, setUpcoming] = useState([]);

  // ═══ FLIGHTS STATE ═══
  const [flights, setFlights] = useState([]);
  const [flightStats, setFlightStats] = useState(null);
  const [flightSearch, setFlightSearch] = useState('');
  const [flightPage, setFlightPage] = useState(1);
  const [flightTotalPages, setFlightTotalPages] = useState(1);
  const [showFlightForm, setShowFlightForm] = useState(false);
  const [editingFlight, setEditingFlight] = useState(null);
  const [flightForm, setFlightForm] = useState({});
  const [flightFormErrors, setFlightFormErrors] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [flightDetail, setFlightDetail] = useState(null);
  const [flightDetailLoading, setFlightDetailLoading] = useState(false);

  const [flightFilterStatus, setFlightFilterStatus] = useState('');
  const [flightFilterSpeaker, setFlightFilterSpeaker] = useState('');
  const [flightFilterOrigin, setFlightFilterOrigin] = useState('');
  const [flightFilterDest, setFlightFilterDest] = useState('');
  const [flightFilterDateFrom, setFlightFilterDateFrom] = useState('');
  const [flightFilterDateTo, setFlightFilterDateTo] = useState('');

  const [upcomingFlights, setUpcomingFlights] = useState([]);

  // Calendar state
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [calItems, setCalItems] = useState([]);
  const [calFlights, setCalFlights] = useState([]);
  const [calSelectedDate, setCalSelectedDate] = useState(null);
  const [calDetailModal, setCalDetailModal] = useState(null);

  const VALID_STATUSES = ['Pendiente', 'En curso', 'Completo', 'Cancelado'];
  const VALID_FLIGHT_STATUS = ['Programado', 'Confirmado', 'En viaje', 'Finalizado', 'Cancelado'];

  // ═══════════════════════════════════════════════════════════
  // ── DATA LOADING ─────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════

  const load = () => {
    let url = `/logistics?page=${page}&search=${search}`;
    if (filterType) url += `&type_id=${filterType}`;
    if (filterStatus) url += `&status=${filterStatus}`;
    if (filterResponsible) url += `&responsible_id=${filterResponsible}`;
    if (filterDateFrom) url += `&date_from=${filterDateFrom}`;
    if (filterDateTo) url += `&date_to=${filterDateTo}`;
    api.get(url).then((r) => { setItems(r.data.items); setTotalPages(r.data.totalPages); });
  };

  const loadStats = () => { api.get('/logistics/stats').then((r) => setStats(r.data)).catch(() => {}); };
  const loadTypes = () => { api.get('/logistics/types').then((r) => setTypes(r.data)).catch(() => {}); };
  const loadUsers = () => { api.get('/users').then((r) => setUsers(r.data)).catch(() => {}); };
  const loadUpcoming = () => { api.get('/logistics/upcoming?limit=10').then((r) => setUpcoming(r.data)).catch(() => {}); };
  const loadCalendar = () => { api.get(`/logistics/calendar?year=${calYear}&month=${calMonth}`).then((r) => setCalItems(r.data)).catch(() => {}); };
  const loadCalFlights = () => { api.get(`/logistics/flights/calendar?year=${calYear}&month=${calMonth}`).then((r) => setCalFlights(r.data)).catch(() => {}); };

  const loadFlights = () => {
    let url = `/logistics/flights?page=${flightPage}&search=${flightSearch}`;
    if (flightFilterStatus) url += `&status=${flightFilterStatus}`;
    if (flightFilterSpeaker) url += `&speaker_id=${flightFilterSpeaker}`;
    if (flightFilterOrigin) url += `&origin=${flightFilterOrigin}`;
    if (flightFilterDest) url += `&destination=${flightFilterDest}`;
    if (flightFilterDateFrom) url += `&date_from=${flightFilterDateFrom}`;
    if (flightFilterDateTo) url += `&date_to=${flightFilterDateTo}`;
    api.get(url).then((r) => { setFlights(r.data.items); setFlightTotalPages(r.data.totalPages); });
  };

  const loadFlightStats = () => { api.get('/logistics/flights/stats').then((r) => setFlightStats(r.data)).catch(() => {}); };
  const loadUpcomingFlights = () => { api.get('/logistics/flights/upcoming?limit=3').then((r) => setUpcomingFlights(r.data)).catch(() => {}); };

  useEffect(() => { load(); }, [page, search, filterType, filterStatus, filterResponsible, filterDateFrom, filterDateTo]);
  useEffect(() => { loadStats(); loadTypes(); loadUsers(); loadUpcoming(); loadFlightStats(); loadUpcomingFlights(); }, []);
  useEffect(() => { loadCalendar(); loadCalFlights(); }, [calYear, calMonth]);
  useEffect(() => { loadFlights(); }, [flightPage, flightSearch, flightFilterStatus, flightFilterSpeaker, flightFilterOrigin, flightFilterDest, flightFilterDateFrom, flightFilterDateTo]);

  // ═══════════════════════════════════════════════════════════
  // ── ACTIVITY CRUD ────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════

  const openDetail = async (item) => {
    setSelected(item);
    setDetailLoading(true);
    try { const r = await api.get(`/logistics/${item.id}`); setDetail(r.data); } catch { setDetail(null); }
    setDetailLoading(false);
  };
  const closeDetail = () => { setSelected(null); setDetail(null); };

  const handleSave = async () => {
    const errs = [];
    if (!form.type_id) errs.push('El tipo es obligatorio');
    if (!form.title) errs.push('El titulo es obligatorio');
    if (form.status && !VALID_STATUSES.includes(form.status)) errs.push('Estado invalido');
    if (form.start_date && form.end_date && form.end_date < form.start_date) errs.push('La fecha de fin no puede ser menor a la fecha de inicio');
    setFormErrors(errs);
    if (errs.length > 0) return;
    try {
      if (editing) await api.put(`/logistics/${editing}`, form);
      else await api.post('/logistics', form);
      setShowForm(false); setEditing(null); setForm({}); setFormErrors([]);
      load(); loadStats(); loadCalendar(); loadUpcoming(); loadCalFlights();
    } catch (err) {
      const data = err.response?.data;
      if (data?.details) setFormErrors(data.details);
      else if (data?.error) setFormErrors([data.error]);
      else setFormErrors(['Error al guardar']);
    }
  };

  const handleEdit = (item) => { setForm({ ...item }); setEditing(item.id); setShowForm(true); setFormErrors([]); };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return;
    await api.delete(`/logistics/${id}`);
    if (selected?.id === id) closeDetail();
    load(); loadStats(); loadCalendar(); loadUpcoming(); loadCalFlights();
  };

  const handleStatusChange = async (id, newStatus) => {
    try { await api.put(`/logistics/${id}`, { status: newStatus }); load(); loadStats(); loadCalendar(); loadUpcoming(); } catch {}
  };

  const openNew = (preloadedDate) => {
    setForm(preloadedDate ? { start_date: preloadedDate } : {});
    setEditing(null); setFormErrors([]); setShowForm(!showForm);
  };

  const setFormVal = (field, value) => setForm({ ...form, [field]: value });

  // ═══════════════════════════════════════════════════════════
  // ── FLIGHT CRUD ──────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════

  const openFlightDetail = async (item) => {
    setSelectedFlight(item);
    setFlightDetailLoading(true);
    try { const r = await api.get(`/logistics/flights/${item.id}`); setFlightDetail(r.data); } catch { setFlightDetail(null); }
    setFlightDetailLoading(false);
  };
  const closeFlightDetail = () => { setSelectedFlight(null); setFlightDetail(null); };

  const handleFlightSave = async () => {
    const errs = [];
    if (!flightForm.speaker_id) errs.push('El conferencista es obligatorio');
    if (!flightForm.departure_date) errs.push('La fecha de abordaje es obligatoria');
    if (!flightForm.departure_time) errs.push('La hora de abordaje es obligatoria');
    if (!flightForm.origin) errs.push('El lugar de origen es obligatorio');
    if (!flightForm.destination) errs.push('El lugar de destino es obligatorio');
    if (flightForm.flight_price && parseFloat(flightForm.flight_price) < 0) errs.push('El precio no puede ser negativo');
    if (flightForm.departure_date && flightForm.return_date && flightForm.return_date < flightForm.departure_date) errs.push('La fecha de regreso no puede ser anterior a la de salida');
    if (flightForm.status && !VALID_FLIGHT_STATUS.includes(flightForm.status)) errs.push('Estado invalido');
    setFlightFormErrors(errs);
    if (errs.length > 0) return;
    try {
      if (editingFlight) await api.put(`/logistics/flights/${editingFlight}`, flightForm);
      else await api.post('/logistics/flights', flightForm);
      setShowFlightForm(false); setEditingFlight(null); setFlightForm({}); setFlightFormErrors([]);
      loadFlights(); loadFlightStats(); loadCalFlights(); loadUpcomingFlights();
    } catch (err) {
      const data = err.response?.data;
      if (data?.details) setFlightFormErrors(data.details);
      else if (data?.error) setFlightFormErrors([data.error]);
      else setFlightFormErrors(['Error al guardar']);
    }
  };

  const handleFlightEdit = (item) => { setFlightForm({ ...item }); setEditingFlight(item.id); setShowFlightForm(true); setFlightFormErrors([]); };

  const handleFlightDelete = async (id) => {
    if (!confirm('¿Eliminar este vuelo?')) return;
    await api.delete(`/logistics/flights/${id}`);
    if (selectedFlight?.id === id) closeFlightDetail();
    loadFlights(); loadFlightStats(); loadCalFlights(); loadUpcomingFlights();
  };

  const handleFlightStatusChange = async (id, newStatus) => {
    try { await api.put(`/logistics/flights/${id}`, { status: newStatus }); loadFlights(); loadFlightStats(); loadCalFlights(); loadUpcomingFlights(); } catch {}
  };

  const openNewFlight = () => {
    setFlightForm({}); setEditingFlight(null); setFlightFormErrors([]); setShowFlightForm(!showFlightForm);
  };

  const setFlightVal = (field, value) => setFlightForm({ ...flightForm, [field]: value });

  // ═══════════════════════════════════════════════════════════
  // ── HELPERS ──────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════

  const statusColor = (s) => {
    const map = { 'Pendiente': 'warning', 'En curso': 'info', 'Completo': 'success', 'Cancelado': 'danger' };
    return map[s] || '';
  };

  const statusBg = (s) => {
    const map = { 'Pendiente': '#fef3c7', 'En curso': '#dbeafe', 'Completo': '#dcfce7', 'Cancelado': '#fee2e2' };
    return map[s] || '#f1f5f9';
  };

  const flightStatusColor = (s) => {
    const map = { 'Programado': 'warning', 'Confirmado': 'info', 'En viaje': '', 'Finalizado': 'success', 'Cancelado': 'danger' };
    return map[s] || '';
  };

  const flightStatusBg = (s) => {
    const map = { 'Programado': '#fef3c7', 'Confirmado': '#dbeafe', 'En viaje': '#ede9fe', 'Finalizado': '#dcfce7', 'Cancelado': '#fee2e2' };
    return map[s] || '#f1f5f9';
  };

  const chartData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Pendiente', value: stats.pending, color: '#f59e0b' },
      { name: 'En curso', value: stats.inProgress, color: '#3b82f6' },
      { name: 'Completo', value: stats.completed, color: '#22c55e' },
      { name: 'Cancelado', value: stats.cancelled, color: '#ef4444' },
    ].filter(d => d.value > 0);
  }, [stats]);

  const flightChartData = useMemo(() => {
    if (!flightStats) return [];
    return [
      { name: 'Programado', value: flightStats.pending, color: '#f59e0b' },
      { name: 'Confirmado', value: flightStats.confirmed, color: '#3b82f6' },
      { name: 'En viaje', value: flightStats.inTrip, color: '#8b5cf6' },
      { name: 'Finalizado', value: flightStats.finished, color: '#22c55e' },
      { name: 'Cancelado', value: flightStats.cancelled, color: '#ef4444' },
    ].filter(d => d.value > 0);
  }, [flightStats]);

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
    const activities = calItems.filter(item => {
      if (!item.start_date) return false;
      const start = item.start_date.slice(0, 10);
      const end = item.end_date ? item.end_date.slice(0, 10) : start;
      return dateStr >= start && dateStr <= end;
    }).map(a => ({ ...a, _type: 'activity' }));
    const flightEvents = calFlights.filter(f => {
      if (!f.departure_date) return false;
      const dep = f.departure_date;
      const ret = f.return_date || dep;
      return dateStr >= dep && dateStr <= ret;
    }).map(f => ({ ...f, _type: 'flight' }));
    return [...activities, ...flightEvents];
  };

  const calMonthName = new Date(calYear, calMonth - 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  // ═══════════════════════════════════════════════════════════
  // ── RENDER ───────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════

  const isFlightTab = activeTab === 'vuelos';

  return (
    <div>
      <div className="page-header">
        <h1>Logistica</h1>
        <button className="btn success" onClick={() => isFlightTab ? openNewFlight() : openNew()}>
          {isFlightTab ? (showFlightForm ? 'Cancelar' : '+ Nuevo Vuelo') : (showForm ? 'Cancelar' : '+ Nueva Actividad')}
        </button>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        {[
          { key: 'dashboard', label: 'Dashboard' },
          { key: 'lista', label: 'Actividades' },
          { key: 'calendario', label: 'Calendario' },
          { key: 'vuelos', label: 'Vuelos' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setShowForm(false); setShowFlightForm(false); }}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
              fontWeight: activeTab === t.key ? 600 : 400,
              background: activeTab === t.key ? '#0f3460' : 'transparent',
              color: activeTab === t.key ? 'white' : '#64748b',
              transition: 'all 0.2s',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* ════════════════ DASHBOARD TAB ════════════════ */}
      {activeTab === 'dashboard' && (
        <>
          {/* Activity Stats */}
          {stats && (
            <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="stat-card">
                <span className="stat-num">{stats.total}</span>
                <span className="stat-label">Total Actividades</span>
              </div>
              <div className="stat-card warning">
                <span className="stat-num">{stats.pending}</span>
                <span className="stat-label">Pendientes</span>
              </div>
              <div className="stat-card info">
                <span className="stat-num">{stats.inProgress}</span>
                <span className="stat-label">En Curso</span>
              </div>
              <div className="stat-card success">
                <span className="stat-num">{stats.completed}</span>
                <span className="stat-label">Completadas</span>
              </div>
              <div className="stat-card danger">
                <span className="stat-num">{stats.cancelled}</span>
                <span className="stat-label">Canceladas</span>
              </div>
            </div>
          )}

          {/* Flight Stats */}
          {flightStats && (
            <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="stat-card" style={{ borderLeftColor: '#8b5cf6' }}>
                <span className="stat-num">{flightStats.total}</span>
                <span className="stat-label">Total Vuelos</span>
              </div>
              <div className="stat-card warning">
                <span className="stat-num">{flightStats.pending}</span>
                <span className="stat-label">Vuelos Programados</span>
              </div>
              <div className="stat-card info">
                <span className="stat-num">{flightStats.confirmed}</span>
                <span className="stat-label">Confirmados</span>
              </div>
              <div className="stat-card" style={{ borderLeftColor: '#06b6d4' }}>
                <span className="stat-num">{flightStats.todayFlights}</span>
                <span className="stat-label">Vuelos Hoy</span>
              </div>
              <div className="stat-card success">
                <span className="stat-num">{flightStats.finished}</span>
                <span className="stat-label">Finalizados</span>
              </div>
              <div className="stat-card" style={{ borderLeftColor: '#10b981' }}>
                <span className="stat-num">${flightStats.totalSpent?.toLocaleString() || 0}</span>
                <span className="stat-label">Total Invertido en Vuelos</span>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Activity Pie Chart */}
            <div style={{ background: 'white', borderRadius: '8px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '0.95rem', color: '#1e293b' }}>Actividades por Estatus</h3>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={4} dataKey="value">
                      {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Sin datos</p>}
            </div>

            {/* Flight Pie Chart */}
            <div style={{ background: 'white', borderRadius: '8px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '0.95rem', color: '#1e293b' }}>Vuelos por Estatus</h3>
              {flightChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={flightChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={4} dataKey="value">
                      {flightChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Sin datos</p>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Upcoming Activities */}
            <div style={{ background: 'white', borderRadius: '8px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '0.95rem', color: '#1e293b' }}>Proximas Actividades</h3>
              {upcoming.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {upcoming.slice(0, 5).map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', background: '#f8fafc', borderRadius: '6px', borderLeft: `3px solid ${item.type_color || '#64748b'}` }}>
                      <span style={{ fontSize: '1.1rem' }}>{item.type_icon || '📋'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.responsible_name || 'Sin asignar'} · {item.start_date?.slice(0, 10) || '—'}</div>
                      </div>
                      <span className={`status-badge ${statusColor(item.status)}`} style={{ fontSize: '0.7rem' }}>{item.status}</span>
                    </div>
                  ))}
                </div>
              ) : <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Sin actividades proximas</p>}
            </div>

            {/* Upcoming Flights */}
            <div style={{ background: 'white', borderRadius: '8px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.95rem', color: '#1e293b', margin: 0 }}>Proximos Vuelos</h3>
                {upcomingFlights.length >= 3 && (
                  <button className="btn-sm" onClick={() => setActiveTab('vuelos')} style={{ fontSize: '0.75rem' }}>Ver todos</button>
                )}
              </div>
              {upcomingFlights.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {upcomingFlights.map(f => (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', background: '#f8fafc', borderRadius: '6px', borderLeft: `3px solid ${flightStatusBg(f.status) === '#dcfce7' ? '#22c55e' : flightStatusBg(f.status) === '#dbeafe' ? '#3b82f6' : '#f59e0b'}` }}>
                      <span style={{ fontSize: '1.1rem' }}>✈️</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.speaker_name || 'Sin conferencista'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {f.origin || '—'} → {f.destination || '—'} · {f.departure_date?.slice(0, 10) || '—'} {f.departure_time || ''}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Recogo: {f.pickup_time || '—'}</div>
                      </div>
                      <span className={`status-badge ${flightStatusColor(f.status)}`} style={{ fontSize: '0.7rem' }}>{f.status}</span>
                    </div>
                  ))}
                </div>
              ) : <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Sin vuelos proximos</p>}
            </div>
          </div>

          {/* By Type + Flights by Destination */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {stats?.byType && (
              <div style={{ background: 'white', borderRadius: '8px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '0.95rem', color: '#1e293b' }}>Actividades por Tipo</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
                  {stats.byType.map(t => (
                    <div key={t.name} style={{ padding: '1rem', borderRadius: '8px', background: t.color + '15', border: `1px solid ${t.color}30`, textAlign: 'center' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 700, color: t.color }}>{t.count}</span>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>{t.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {flightStats?.byDestination?.length > 0 && (
              <div style={{ background: 'white', borderRadius: '8px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '0.95rem', color: '#1e293b' }}>Destinos mas Frecuentes</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {flightStats.byDestination.map((d, i) => (
                    <div key={d.destination} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: '6px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', width: '20px' }}>{i + 1}.</span>
                      <span style={{ flex: 1, fontSize: '0.85rem' }}>{d.destination}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f3460' }}>{d.count} vuelos</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ════════════════ LISTA TAB (Actividades) ════════════════ */}
      {activeTab === 'lista' && (
        <>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input className="search-input" placeholder="Buscar por titulo, descripcion, responsable..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ flex: 1, minWidth: '250px' }} />
            <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <option value="">Todos los Tipos</option>
              {types.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <option value="">Todos los Estados</option>
              {VALID_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterResponsible} onChange={(e) => { setFilterResponsible(e.target.value); setPage(1); }} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <option value="">Todos los Responsables</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <input type="date" value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
            <input type="date" value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr><th>Tipo</th><th>Titulo</th><th>Responsable</th><th>Fecha Inicio</th><th>Fecha Fin</th><th>Estado</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className={selected?.id === item.id ? 'row-selected' : ''} onClick={() => openDetail(item)} style={{ cursor: 'pointer' }}>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ fontSize: '1rem' }}>{item.type_icon || '📋'}</span>
                        <span style={{ fontSize: '0.8rem', color: item.type_color || '#64748b' }}>{item.type_name || '—'}</span>
                      </span>
                    </td>
                    <td><strong>{item.title || '-'}</strong></td>
                    <td>{item.responsible_name || '-'}</td>
                    <td style={{ fontSize: '0.8rem' }}>{item.start_date?.slice(0, 10) || '—'}</td>
                    <td style={{ fontSize: '0.8rem' }}>{item.end_date?.slice(0, 10) || '—'}</td>
                    <td>
                      <select value={item.status} onChange={(e) => { e.stopPropagation(); handleStatusChange(item.id, e.target.value); }} onClick={(e) => e.stopPropagation()}
                        className={`status-badge ${statusColor(item.status)}`} style={{ border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: '2px 6px', borderRadius: '4px', background: statusBg(item.status) }}>
                        {VALID_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
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
                {items.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Sin registros de logistica</td></tr>}
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

      {/* ════════════════ VUELOS TAB ════════════════ */}
      {activeTab === 'vuelos' && (
        <>
          {/* Flight Filters */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input className="search-input" placeholder="Buscar por conferencista, origen, destino..." value={flightSearch} onChange={(e) => { setFlightSearch(e.target.value); setFlightPage(1); }} style={{ flex: 1, minWidth: '250px' }} />
            <select value={flightFilterStatus} onChange={(e) => { setFlightFilterStatus(e.target.value); setFlightPage(1); }} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <option value="">Todos los Estados</option>
              {VALID_FLIGHT_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={flightFilterSpeaker} onChange={(e) => { setFlightFilterSpeaker(e.target.value); setFlightPage(1); }} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <option value="">Todos los Conferencistas</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <input className="search-input" placeholder="Origen" value={flightFilterOrigin} onChange={(e) => { setFlightFilterOrigin(e.target.value); setFlightPage(1); }} style={{ width: '140px', flex: 'none' }} />
            <input className="search-input" placeholder="Destino" value={flightFilterDest} onChange={(e) => { setFlightFilterDest(e.target.value); setFlightPage(1); }} style={{ width: '140px', flex: 'none' }} />
            <input type="date" value={flightFilterDateFrom} onChange={(e) => { setFlightFilterDateFrom(e.target.value); setFlightPage(1); }} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
            <input type="date" value={flightFilterDateTo} onChange={(e) => { setFlightFilterDateTo(e.target.value); setFlightPage(1); }} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr><th>Conferencista</th><th>Origen</th><th>Destino</th><th>Salida</th><th>Regreso</th><th>Precio</th><th>Estado</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {flights.map((f) => (
                  <tr key={f.id} className={selectedFlight?.id === f.id ? 'row-selected' : ''} onClick={() => openFlightDetail(f)} style={{ cursor: 'pointer' }}>
                    <td><strong>{f.speaker_name || '-'}</strong></td>
                    <td>{f.origin || '-'}</td>
                    <td>{f.destination || '-'}</td>
                    <td style={{ fontSize: '0.8rem' }}>{f.departure_date?.slice(0, 10) || '—'} {f.departure_time || ''}</td>
                    <td style={{ fontSize: '0.8rem' }}>{f.return_date?.slice(0, 10) || '—'}</td>
                    <td style={{ fontSize: '0.8rem' }}>${f.flight_price?.toLocaleString() || 0}</td>
                    <td>
                      <select value={f.status} onChange={(e) => { e.stopPropagation(); handleFlightStatusChange(f.id, e.target.value); }} onClick={(e) => e.stopPropagation()}
                        className={`status-badge ${flightStatusColor(f.status)}`} style={{ border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: '2px 6px', borderRadius: '4px', background: flightStatusBg(f.status) }}>
                        {VALID_FLIGHT_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                      <button className="icon-btn edit" title="Editar" onClick={() => handleFlightEdit(f)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="icon-btn danger" title="Eliminar" onClick={() => handleFlightDelete(f.id)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {flights.length === 0 && <tr><td colSpan="8" style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Sin vuelos registrados</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button disabled={flightPage <= 1} onClick={() => setFlightPage(flightPage - 1)}>Anterior</button>
            <span>Pagina {flightPage} de {flightTotalPages}</span>
            <button disabled={flightPage >= flightTotalPages} onClick={() => setFlightPage(flightPage + 1)}>Siguiente</button>
          </div>
        </>
      )}

      {/* ════════════════ CALENDARIO TAB ════════════════ */}
      {activeTab === 'calendario' && (
        <div style={{ background: 'white', borderRadius: '8px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <button className="btn-sm" onClick={() => { if (calMonth === 1) { setCalMonth(12); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }}>← Anterior</button>
            <h3 style={{ textTransform: 'capitalize', margin: 0 }}>{calMonthName}</h3>
            <button className="btn-sm" onClick={() => { if (calMonth === 12) { setCalMonth(1); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }}>Siguiente →</button>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.75rem', color: '#64748b', flexWrap: 'wrap' }}>
            <span><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: '#3b82f6', marginRight: '4px' }}></span>Actividad</span>
            <span><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: '#8b5cf6', marginRight: '4px' }}></span>Vuelo</span>
            {Object.entries({ 'Pendiente': '#f59e0b', 'En curso': '#3b82f6', 'Completo': '#22c55e', 'Cancelado': '#ef4444', 'Programado': '#f59e0b', 'Confirmado': '#3b82f6', 'Finalizado': '#22c55e' }).map(([k, v]) => (
              <span key={k}><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: v, marginRight: '4px' }}></span>{k}</span>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: '#e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'].map(d => (
              <div key={d} style={{ background: '#f1f5f9', padding: '0.5rem', textAlign: 'center', fontWeight: 600, fontSize: '0.75rem', color: '#64748b' }}>{d}</div>
            ))}
            {calGrid.map((day, i) => {
              const events = getEventsForDay(day);
              const isToday = day && calYear === new Date().getFullYear() && calMonth === new Date().getMonth() + 1 && day === new Date().getDate();
              return (
                <div key={i} onClick={() => day && setCalSelectedDate(calSelectedDate === day ? null : day)}
                  style={{ background: 'white', padding: '0.35rem', minHeight: '80px', cursor: day ? 'pointer' : 'default', border: isToday ? '2px solid #3b82f6' : calSelectedDate === day ? '2px solid #0f3460' : 'none' }}>
                  {day && (
                    <>
                      <span style={{ display: 'inline-block', width: '24px', height: '24px', lineHeight: '24px', textAlign: 'center', borderRadius: '50%', fontSize: '0.8rem', fontWeight: isToday ? 700 : 400, background: isToday ? '#3b82f6' : 'transparent', color: isToday ? 'white' : '#1e293b' }}>{day}</span>
                      <div style={{ marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        {events.slice(0, 4).map(ev => (
                          <div key={`${ev._type}-${ev.id}`} onClick={(e) => { e.stopPropagation(); setCalDetailModal(ev); }}
                            style={{ fontSize: '0.6rem', padding: '1px 4px', borderRadius: '3px', background: ev._type === 'flight' ? '#ede9fe' : statusBg(ev.status), color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', borderLeft: `2px solid ${ev._type === 'flight' ? '#8b5cf6' : (ev.type_color || '#64748b')}`, cursor: 'pointer' }}>
                            {ev._type === 'flight' ? `✈ ${ev.speaker_name || 'Vuelo'}` : ev.title}
                          </div>
                        ))}
                        {events.length > 4 && <span style={{ fontSize: '0.6rem', color: '#64748b', textAlign: 'center' }}>+{events.length - 4} mas</span>}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected day detail */}
          {calSelectedDate && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ margin: 0 }}>{new Date(calYear, calMonth - 1, calSelectedDate).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</h4>
                <button className="btn success" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }} onClick={() => openNew(`${calYear}-${String(calMonth).padStart(2, '0')}-${String(calSelectedDate).padStart(2, '0')}`)}>+ Agregar Actividad</button>
              </div>
              {getEventsForDay(calSelectedDate).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {getEventsForDay(calSelectedDate).map(ev => (
                    <div key={`${ev._type}-${ev.id}`} onClick={() => setCalDetailModal(ev)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', background: 'white', borderRadius: '6px', cursor: 'pointer', borderLeft: `3px solid ${ev._type === 'flight' ? '#8b5cf6' : (ev.type_color || '#64748b')}` }}>
                      <span style={{ fontSize: '1rem' }}>{ev._type === 'flight' ? '✈️' : (ev.type_icon || '📋')}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{ev._type === 'flight' ? `${ev.speaker_name || 'Conferencista'} — ${ev.origin || ''} → ${ev.destination || ''}` : ev.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{ev._type === 'flight' ? `${ev.departure_time || ''} ${ev.departure_date?.slice(0, 10) || ''}` : (ev.responsible_name || 'Sin asignar')}</div>
                      </div>
                      <span className={`status-badge ${ev._type === 'flight' ? flightStatusColor(ev.status) : statusColor(ev.status)}`} style={{ fontSize: '0.7rem' }}>{ev.status}</span>
                    </div>
                  ))}
                </div>
              ) : <p style={{ textAlign: 'center', color: '#94a3b8' }}>Sin eventos este dia</p>}
            </div>
          )}
        </div>
      )}

      {/* ════════════════ CALENDAR DETAIL MODAL ════════════════ */}
      {calDetailModal && (
        <div className="modal-overlay" onClick={() => setCalDetailModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>
                {calDetailModal._type === 'flight' ? '✈ Detalle de Vuelo' : '📋 Detalle de Actividad'}
              </h2>
              <button className="btn-sm" onClick={() => setCalDetailModal(null)}>Cerrar</button>
            </div>
            {calDetailModal._type === 'flight' ? (
              <div className="form-grid" style={{ gap: '0.75rem' }}>
                <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>CONFERENCISTA</label>{calDetailModal.speaker_name || '—'}</div>
                <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>ESTADO</label><span className={`status-badge ${flightStatusColor(calDetailModal.status)}`}>{calDetailModal.status}</span></div>
                <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>ORIGEN</label>{calDetailModal.origin || '—'}</div>
                <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>DESTINO</label>{calDetailModal.destination || '—'}</div>
                <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>SALIDA</label>{calDetailModal.departure_date?.slice(0, 10) || '—'} {calDetailModal.departure_time || ''}</div>
                <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>LLEGADA</label>{calDetailModal.arrival_date?.slice(0, 10) || '—'} {calDetailModal.arrival_time || ''}</div>
                <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>REGRESO</label>{calDetailModal.return_date?.slice(0, 10) || '—'} {calDetailModal.return_time || ''}</div>
                <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>HORA RECOGIDA</label>{calDetailModal.pickup_time || '—'}</div>
                <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>PRECIO</label>${calDetailModal.flight_price?.toLocaleString() || 0}</div>
                {calDetailModal.observations && <div style={{ gridColumn: 'span 2' }}><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>OBSERVACIONES</label>{calDetailModal.observations}</div>}
              </div>
            ) : (
              <div className="form-grid" style={{ gap: '0.75rem' }}>
                <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>TIPO</label>{calDetailModal.type_name || '—'}</div>
                <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>ESTADO</label><span className={`status-badge ${statusColor(calDetailModal.status)}`}>{calDetailModal.status}</span></div>
                <div style={{ gridColumn: 'span 2' }}><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>TITULO</label>{calDetailModal.title || '—'}</div>
                <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>RESPONSABLE</label>{calDetailModal.responsible_name || '—'}</div>
                <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>FECHA INICIO</label>{calDetailModal.start_date || '—'}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════ ACTIVITY FORM MODAL ════════════════ */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditing(null); setFormErrors([]); }}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? 'Editar Actividad' : 'Nueva Actividad'}</h2>
            {formErrors.length > 0 && <div className="form-errors">{formErrors.map((e, i) => <p key={i} style={{ color: '#dc2626', margin: '2px 0' }}>{e}</p>)}</div>}
            <div className="form-grid">
              <select value={form.type_id || ''} onChange={(e) => setFormVal('type_id', e.target.value || null)}>
                <option value="">Tipo de registro *</option>
                {types.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
              </select>
              <input placeholder="Titulo *" value={form.title || ''} onChange={(e) => setFormVal('title', e.target.value)} />
              <select value={form.responsible_id || ''} onChange={(e) => setFormVal('responsible_id', e.target.value || null)}>
                <option value="">Responsable</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <select value={form.status || 'Pendiente'} onChange={(e) => setFormVal('status', e.target.value)}>
                <option value="">Estado</option>
                {VALID_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div><label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>Fecha Inicio</label><input type="datetime-local" value={form.start_date || ''} onChange={(e) => setFormVal('start_date', e.target.value)} style={{ width: '100%' }} /></div>
              <div><label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>Fecha Fin</label><input type="datetime-local" value={form.end_date || ''} onChange={(e) => setFormVal('end_date', e.target.value)} style={{ width: '100%' }} /></div>
              <div style={{ gridColumn: 'span 2' }}><textarea className="full-width" placeholder="Descripcion" value={form.description || ''} onChange={(e) => setFormVal('description', e.target.value)} rows={3} /></div>
            </div>
            <button className="btn" onClick={handleSave} style={{ marginTop: '1rem' }}>Guardar</button>
          </div>
        </div>
      )}

      {/* ════════════════ FLIGHT FORM MODAL ════════════════ */}
      {showFlightForm && (
        <div className="modal-overlay" onClick={() => { setShowFlightForm(false); setEditingFlight(null); setFlightFormErrors([]); }}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <h2>{editingFlight ? 'Editar Vuelo' : 'Nuevo Vuelo'}</h2>
            {flightFormErrors.length > 0 && <div className="form-errors">{flightFormErrors.map((e, i) => <p key={i} style={{ color: '#dc2626', margin: '2px 0' }}>{e}</p>)}</div>}
            <div className="form-grid">
              <select value={flightForm.speaker_id || ''} onChange={(e) => setFlightVal('speaker_id', e.target.value || null)}>
                <option value="">Conferencista *</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <select value={flightForm.status || 'Programado'} onChange={(e) => setFlightVal('status', e.target.value)}>
                <option value="">Estado</option>
                {VALID_FLIGHT_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div><label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>Fecha Abordaje *</label><input type="date" value={flightForm.departure_date || ''} onChange={(e) => setFlightVal('departure_date', e.target.value)} style={{ width: '100%' }} /></div>
              <div><label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>Hora Abordaje *</label><input type="time" value={flightForm.departure_time || ''} onChange={(e) => setFlightVal('departure_time', e.target.value)} style={{ width: '100%' }} /></div>
              <input placeholder="Lugar de origen *" value={flightForm.origin || ''} onChange={(e) => setFlightVal('origin', e.target.value)} />
              <input placeholder="Lugar de destino *" value={flightForm.destination || ''} onChange={(e) => setFlightVal('destination', e.target.value)} />
              <div><label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>Fecha Llegada</label><input type="date" value={flightForm.arrival_date || ''} onChange={(e) => setFlightVal('arrival_date', e.target.value)} style={{ width: '100%' }} /></div>
              <div><label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>Hora Llegada</label><input type="time" value={flightForm.arrival_time || ''} onChange={(e) => setFlightVal('arrival_time', e.target.value)} style={{ width: '100%' }} /></div>
              <div><label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>Fecha Regreso</label><input type="date" value={flightForm.return_date || ''} onChange={(e) => setFlightVal('return_date', e.target.value)} style={{ width: '100%' }} /></div>
              <div><label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>Hora Regreso</label><input type="time" value={flightForm.return_time || ''} onChange={(e) => setFlightVal('return_time', e.target.value)} style={{ width: '100%' }} /></div>
              <div><label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>Hora Recoger Conferencista</label><input type="time" value={flightForm.pickup_time || ''} onChange={(e) => setFlightVal('pickup_time', e.target.value)} style={{ width: '100%' }} /></div>
              <div><label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>Precio del Vuelo</label><input type="number" step="0.01" min="0" placeholder="0.00" value={flightForm.flight_price || ''} onChange={(e) => setFlightVal('flight_price', e.target.value)} style={{ width: '100%' }} /></div>
              <div style={{ gridColumn: 'span 2' }}><textarea className="full-width" placeholder="Observaciones" value={flightForm.observations || ''} onChange={(e) => setFlightVal('observations', e.target.value)} rows={3} /></div>
            </div>
            <button className="btn" onClick={handleFlightSave} style={{ marginTop: '1rem' }}>Guardar</button>
          </div>
        </div>
      )}

      {/* ════════════════ ACTIVITY DETAIL PANEL ════════════════ */}
      {selected && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div className="modal modal-wide detail-panel" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            {detailLoading ? <p style={{ textAlign: 'center', padding: '2rem' }}>Cargando detalle...</p> : detail ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.3rem' }}>{detail.type_icon || '📋'}</span>
                    <h2 style={{ margin: 0 }}>{detail.title || 'Sin titulo'}</h2>
                  </div>
                  <button className="btn-sm" onClick={closeDetail}>Cerrar</button>
                </div>
                <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>TIPO</label>{detail.type_name || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>ESTADO</label><span className={`status-badge ${statusColor(detail.status)}`}>{detail.status || '—'}</span></div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>RESPONSABLE</label>{detail.responsible_name || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>FECHA INICIO</label>{detail.start_date || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>FECHA FIN</label>{detail.end_date || '—'}</div>
                  <div style={{ gridColumn: 'span 2' }}><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>DESCRIPCION</label>{detail.description || '—'}</div>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', padding: '0.5rem', background: '#f8fafc', borderRadius: '6px' }}>
                  <strong>Creado por:</strong> {detail.created_by_name || '—'} · <strong>Fecha:</strong> {detail.created_at || '—'}
                  {detail.updated_by_name && <> · <strong>Ultima modificacion:</strong> {detail.updated_by_name} ({detail.updated_at || '—'})</>}
                </div>
              </>
            ) : <p style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>Error al cargar detalle</p>}
          </div>
        </div>
      )}

      {/* ════════════════ FLIGHT DETAIL PANEL ════════════════ */}
      {selectedFlight && (
        <div className="modal-overlay" onClick={closeFlightDetail}>
          <div className="modal modal-wide detail-panel" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            {flightDetailLoading ? <p style={{ textAlign: 'center', padding: '2rem' }}>Cargando detalle...</p> : flightDetail ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.3rem' }}>✈️</span>
                    <h2 style={{ margin: 0 }}>{flightDetail.speaker_name || 'Sin conferencista'}</h2>
                  </div>
                  <button className="btn-sm" onClick={closeFlightDetail}>Cerrar</button>
                </div>
                <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>CONFERENCISTA</label>{flightDetail.speaker_name || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>ESTADO</label><span className={`status-badge ${flightStatusColor(flightDetail.status)}`}>{flightDetail.status || '—'}</span></div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>ORIGEN</label>{flightDetail.origin || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>DESTINO</label>{flightDetail.destination || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>FECHA/HORA SALIDA</label>{flightDetail.departure_date?.slice(0, 10) || '—'} {flightDetail.departure_time || ''}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>FECHA/HORA LLEGADA</label>{flightDetail.arrival_date?.slice(0, 10) || '—'} {flightDetail.arrival_time || ''}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>FECHA/HORA REGRESO</label>{flightDetail.return_date?.slice(0, 10) || '—'} {flightDetail.return_time || ''}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>HORA RECOGIDA</label>{flightDetail.pickup_time || '—'}</div>
                  <div><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>PRECIO</label>${flightDetail.flight_price?.toLocaleString() || 0}</div>
                  {flightDetail.observations && <div style={{ gridColumn: 'span 2' }}><label style={{ fontWeight: 600, display: 'block', color: '#64748b', fontSize: '0.75rem' }}>OBSERVACIONES</label>{flightDetail.observations}</div>}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', padding: '0.5rem', background: '#f8fafc', borderRadius: '6px' }}>
                  <strong>Creado por:</strong> {flightDetail.created_by_name || '—'} · <strong>Fecha:</strong> {flightDetail.created_at || '—'}
                  {flightDetail.updated_by_name && <> · <strong>Ultima modificacion:</strong> {flightDetail.updated_by_name} ({flightDetail.updated_at || '—'})</>}
                </div>
              </>
            ) : <p style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>Error al cargar detalle</p>}
          </div>
        </div>
      )}
    </div>
  );
}
