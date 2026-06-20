import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    api.get('/tasks').then((r) => setTasks(r.data));
    api.get('/users').then((r) => setUsers(r.data)).catch(() => {});
    api.get('/clients?limit=1000').then((r) => setClients(r.data.clients)).catch(() => {});
  }, []);

  const filtered = filter ? tasks.filter((t) => t.status === filter || t.priority === filter) : tasks;

  const handleSave = async () => {
    await api.post('/tasks', form);
    setShowForm(false);
    setForm({});
    const r = await api.get('/tasks');
    setTasks(r.data);
  };

  const handleStatus = async (id, status) => {
    await api.put(`/tasks/${id}`, { status });
    const r = await api.get('/tasks');
    setTasks(r.data);
  };

  const toggleComments = async (taskId) => {
    if (expanded === taskId) {
      setExpanded(null);
      return;
    }
    setExpanded(taskId);
    const r = await api.get(`/tasks/${taskId}/comments`);
    setComments((prev) => ({ ...prev, [taskId]: r.data }));
  };

  const addComment = async (taskId) => {
    if (!newComment.trim()) return;
    await api.post(`/tasks/${taskId}/comments`, { comment: newComment });
    setNewComment('');
    const r = await api.get(`/tasks/${taskId}/comments`);
    setComments((prev) => ({ ...prev, [taskId]: r.data }));
  };

  return (
    <div>
      <div className="page-header">
        <h1>Tareas</h1>
        <button className="btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nueva Tarea'}
        </button>
      </div>

      <div className="filter-bar">
        <button className={`filter-btn ${filter === '' ? 'active' : ''}`} onClick={() => setFilter('')}>Todas</button>
        <button className={`filter-btn ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>Pendientes</button>
        <button className={`filter-btn ${filter === 'in_progress' ? 'active' : ''}`} onClick={() => setFilter('in_progress')}>En Progreso</button>
        <button className={`filter-btn ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>Completadas</button>
        <button className={`filter-btn ${filter === 'urgent' ? 'active' : ''}`} onClick={() => setFilter('urgent')}>Urgentes</button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Nueva Tarea</h2>
            <div className="form-grid">
              <input className="full-width" placeholder="Título" value={form.title || ''} onChange={(e) => setForm({...form, title: e.target.value})} required />
              <textarea className="full-width" placeholder="Descripción" value={form.description || ''} onChange={(e) => setForm({...form, description: e.target.value})} />
              <select value={form.priority || 'medium'} onChange={(e) => setForm({...form, priority: e.target.value})}>
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
              <input type="date" value={form.due_date || ''} onChange={(e) => setForm({...form, due_date: e.target.value})} />
              <select value={form.assigned_to || ''} onChange={(e) => setForm({...form, assigned_to: e.target.value})}>
                <option value="">Asignar a...</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <select value={form.client_id || ''} onChange={(e) => setForm({...form, client_id: e.target.value})}>
                <option value="">Cliente relacionado...</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <button className="btn primary" onClick={handleSave}>Crear Tarea</button>
          </div>
        </div>
      )}

      <div className="task-list">
        {filtered.map((t) => (
          <div key={t.id} className={`task-card priority-${t.priority}`}>
            <div className="task-header">
              <div>
                <h3>{t.title}</h3>
                <p className="task-meta">
                  {t.client_name && <span>Cliente: {t.client_name}</span>}
                  {t.assigned_name && <span>Asignado: {t.assigned_name}</span>}
                  {t.due_date && <span>Vence: {t.due_date}</span>}
                </p>
              </div>
              <div className="task-actions">
                <span className={`priority-badge ${t.priority}`}>{t.priority}</span>
                <select value={t.status} onChange={(e) => handleStatus(t.id, e.target.value)} className="status-select">
                  <option value="pending">Pendiente</option>
                  <option value="in_progress">En Progreso</option>
                  <option value="completed">Completada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
                <button className="btn small" onClick={() => toggleComments(t.id)}>
                  {expanded === t.id ? 'Ocultar' : 'Comentarios'}
                </button>
              </div>
            </div>
            {t.description && <p className="task-desc">{t.description}</p>}
            {expanded === t.id && (
              <div className="comments-section">
                <div className="comments-list">
                  {(comments[t.id] || []).map((c) => (
                    <div key={c.id} className="comment">
                      <strong>{c.user_name}</strong>
                      <span>{c.comment}</span>
                      <small>{c.created_at}</small>
                    </div>
                  ))}
                </div>
                <div className="comment-input">
                  <input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Escribe un comentario..." />
                  <button className="btn small" onClick={() => addComment(t.id)}>Enviar</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
