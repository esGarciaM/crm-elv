import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

const API = '';

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [users, setUsers] = useState([]);
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    api.get(`/clients/${id}`).then((r) => {
      setClient(r.data);
      setForm(r.data);
    });
    loadDocs();
    api.get('/auth').then((r) => setUsers(r.data)).catch(() => {});
  }, [id]);

  const loadDocs = () => {
    api.get(`/documents/client/${id}`).then((r) => setDocuments(r.data));
  };

  if (!client) return <div className="loading">Cargando...</div>;

  const handleSave = async () => {
    await api.put(`/clients/${id}`, form);
    setEditing(false);
    setClient({ ...client, ...form });
  };

  const handleDelete = async () => {
    if (confirm('¿Eliminar este cliente?')) {
      await api.delete(`/clients/${id}`);
      navigate('/clients');
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('visibility', 'private');
    try {
      await api.post(`/documents/upload/${id}`, fd);
      loadDocs();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al subir archivo');
    }
    setUploading(false);
    e.target.value = '';
  };

  const toggleVisibility = async (docId, current) => {
    const next = current === 'public' ? 'private' : 'public';
    await api.patch(`/documents/${docId}/visibility`, { visibility: next });
    loadDocs();
  };

  const handleDeleteDoc = async (docId) => {
    if (!confirm('¿Eliminar este documento?')) return;
    await api.delete(`/documents/${docId}`);
    loadDocs();
  };

  const toggleComments = async (docId) => {
    if (expandedDoc === docId) { setExpandedDoc(null); return; }
    setExpandedDoc(docId);
    const r = await api.get(`/documents/${docId}/comments`);
    setComments((prev) => ({ ...prev, [docId]: r.data }));
  };

  const addComment = async (docId) => {
    if (!newComment.trim()) return;
    await api.post(`/documents/${docId}/comments`, { comment: newComment });
    setNewComment('');
    const r = await api.get(`/documents/${docId}/comments`);
    setComments((prev) => ({ ...prev, [docId]: r.data }));
  };

  const Field = ({ label, field, type = 'text' }) => (
    <div className="field">
      <label>{label}</label>
      {editing ? (
        type === 'textarea' ? (
          <textarea value={form[field] || ''} onChange={(e) => setForm({...form, [field]: e.target.value})} />
        ) : (
          <input type={type} value={form[field] || ''} onChange={(e) => setForm({...form, [field]: e.target.value})} />
        )
      ) : (
        <span>{client[field] || '-'}</span>
      )}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1>{client.company_name || 'Cliente'}</h1>
        <div className="page-actions">
          <button className="btn" onClick={() => setEditing(!editing)}>{editing ? 'Cancelar' : 'Editar'}</button>
          {editing && <button className="btn primary" onClick={handleSave}>Guardar</button>}
          <button className="btn danger" onClick={handleDelete}>Eliminar</button>
        </div>
      </div>

      <div className="client-detail-grid">
        <div className="card">
          <h2>Información General</h2>
          <Field label="Empresa" field="company_name" />
          <Field label="Persona Contacto" field="contact_person" />
          <Field label="Teléfono" field="phone" />
          <Field label="Tipo Patrocinio" field="sponsorship_type" />
          <Field label="Paquete" field="package" />
        </div>
        <div className="card">
          <h2>Estado</h2>
          <Field label="Estado Visita" field="visit_status" />
          <Field label="Estado Pago" field="payment_status" />
          <Field label="Redes Sociales" field="social_media_fulfilled" />
          <Field label="Boletos Entregados" field="tickets_delivered" />
          <Field label="Logo Solicitado" field="logo_requested" />
        </div>
        <div className="card">
          <h2>Alumnos</h2>
          <Field label="Alumno que consiguió" field="student_obtained" />
          <Field label="Alumno que se comunicó" field="student_contacted" />
        </div>
        <div className="card full-width">
          <h2>Detalles</h2>
          <Field label="Detalle en Especie" field="in_kind_detail" type="textarea" />
          <Field label="Detalle Pago" field="payment_detail" type="textarea" />
          <Field label="Notas" field="notes" type="textarea" />
          <div className="field">
            <label>Usuario Cliente (Portal)</label>
            {editing ? (
              <select value={form.client_user_id || ''} onChange={(e) => setForm({...form, client_user_id: e.target.value ? Number(e.target.value) : null})}>
                <option value="">— Sin usuario —</option>
                {users.filter((u) => u.role === 'client').map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.username})</option>
                ))}
              </select>
            ) : (
              <span>{client.client_user_id ? users.find((u) => u.id === client.client_user_id)?.name || 'Vinculado' : '—'}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Documentos ── */}
      <div className="card">
        <div className="docs-header">
          <h2>Expediente / Documentos</h2>
          <label className={`btn ${uploading ? 'disabled' : ''}`}>
            {uploading ? 'Subiendo...' : '+ Subir'}
            <input type="file" className="hidden-input" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
        <p className="docs-hint">Marca como <strong>público</strong> para que el cliente lo vea en su portal.</p>

        {documents.length === 0 ? (
          <p className="empty-state">No hay documentos subidos</p>
        ) : (
          <div className="docs-list">
            {documents.map((d) => (
              <div key={d.id}>
                <div className="doc-item">
                  <span className="doc-icon">{iconFor(d.mime_type)}</span>
                  <div className="doc-info">
                    <a href={`/api/documents/download/${d.id}`} target="_blank" rel="noopener noreferrer" className="doc-name">{d.original_name}</a>
                    <span className="doc-meta">{fmtSize(d.size)} · {d.category} · {d.uploaded_by_name || '—'} · {d.created_at}</span>
                  </div>
                  <div className="doc-actions">
                    <label className={`vis-toggle ${d.visibility}`}>
                      <input type="checkbox" checked={d.visibility === 'public'} onChange={() => toggleVisibility(d.id, d.visibility)} />
                      {d.visibility === 'public' ? 'Público' : 'Privado'}
                    </label>
                    <button className="btn small" onClick={() => toggleComments(d.id)}>
                      {expandedDoc === d.id ? '▲' : '💬'}
                    </button>
                    <button className="btn small danger" onClick={() => handleDeleteDoc(d.id)} title="Eliminar">🗑</button>
                  </div>
                </div>
                {expandedDoc === d.id && (
                  <div className="comments-section" style={{ marginLeft: '2.5rem' }}>
                    <div className="comments-list">
                      {(comments[d.id] || []).map((c) => (
                        <div key={c.id} className="comment">
                          <strong>{c.user_name}</strong>
                          <span>{c.comment}</span>
                          <small>{c.created_at}</small>
                        </div>
                      ))}
                    </div>
                    <div className="comment-input">
                      <input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Escribe un comentario..." />
                      <button className="btn small" onClick={() => addComment(d.id)}>Enviar</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Tareas Relacionadas</h2>
        <table>
          <thead><tr><th>Título</th><th>Estado</th><th>Prioridad</th><th>Asignado</th><th>Fecha</th></tr></thead>
          <tbody>
            {client.tasks?.length === 0 && <tr><td colSpan="5">Sin tareas</td></tr>}
            {client.tasks?.map((t) => (
              <tr key={t.id}>
                <td>{t.title}</td>
                <td><span className={`status-badge ${t.status}`}>{t.status}</span></td>
                <td><span className={`priority-badge ${t.priority}`}>{t.priority}</span></td>
                <td>{t.assigned_name || '-'}</td>
                <td>{t.due_date || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
