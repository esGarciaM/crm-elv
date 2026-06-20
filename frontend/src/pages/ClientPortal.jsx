import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

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

export default function ClientPortal() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    api.get('/client-portal/profile').then((r) => setProfile(r.data)).catch(() => {});
  }, []);

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

  if (!profile) return <div className="loading">Cargando tu portal...</div>;

  return (
    <div className="client-portal">
      <div className="portal-header">
        <h1>Mi Portal</h1>
        <p className="portal-welcome">Bienvenido, {user?.name}</p>
      </div>

      <div className="card portal-company">
        <h2>{profile.company_name || 'Tu empresa'}</h2>
        <div className="portal-info-grid">
          <div><strong>Contacto:</strong> {profile.contact_person || '—'}</div>
          <div><strong>Teléfono:</strong> {profile.phone || '—'}</div>
          <div><strong>Tipo Patrocinio:</strong> {profile.sponsorship_type || '—'}</div>
          <div><strong>Paquete:</strong> {profile.package || '—'}</div>
        </div>
      </div>

      <div className="card">
        <h2>Documentos Compartidos</h2>
        {profile.documents?.length === 0 ? (
          <p className="empty-state">Aún no hay documentos compartidos contigo</p>
        ) : (
          <div className="docs-list">
            {profile.documents?.map((d) => (
              <div key={d.id}>
                <div className="doc-item">
                  <span className="doc-icon">{iconFor(d.mime_type)}</span>
                  <div className="doc-info">
                    <a href={`http://localhost:3001/api/documents/download/${d.id}`} target="_blank" rel="noopener noreferrer" className="doc-name">{d.original_name}</a>
                    <span className="doc-meta">{fmtSize(d.size)} · {d.category} · subido por {d.uploaded_by_name || '—'} · {d.created_at}</span>
                  </div>
                  <button className="btn small" onClick={() => toggleComments(d.id)}>
                    {expandedDoc === d.id ? 'Ocultar' : 'Comentar'}
                  </button>
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
    </div>
  );
}
