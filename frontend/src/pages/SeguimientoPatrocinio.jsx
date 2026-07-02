import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function SeguimientoPatrocinio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newComment, setNewComment] = useState('');
  const [commentFile, setCommentFile] = useState(null);
  const [sendingComment, setSendingComment] = useState(false);
  const [togglingItem, setTogglingItem] = useState(null);

  const loadData = () => {
    setLoading(true);
    api.get(`/patrocinios/${id}/seguimiento`)
      .then(r => setData(r.data))
      .catch(() => setError('Error al cargar datos de seguimiento'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [id]);

  // ── Toggle checklist item ──
  const toggleItem = async (itemId, currentCompleted) => {
    setTogglingItem(itemId);
    try {
      await api.put(`/patrocinios/${id}/seguimiento/checklist`, {
        item_id: itemId,
        completed: !currentCompleted
      });
      loadData();
    } catch {
      setError('Error al actualizar checklist');
    }
    setTogglingItem(null);
  };

  // ── Add comment (with optional file) ──
  const handleAddComment = async () => {
    if (!newComment.trim() && !commentFile) return;
    setSendingComment(true);
    try {
      const fd = new FormData();
      fd.append('comment', newComment.trim());
      if (commentFile) fd.append('file', commentFile);
      await api.post(`/patrocinios/${id}/seguimiento/comments`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setNewComment('');
      setCommentFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadData();
    } catch {
      setError('Error al agregar comentario');
    }
    setSendingComment(false);
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('¿Eliminar este comentario?')) return;
    try {
      await api.delete(`/patrocinios/${id}/seguimiento/comments/${commentId}`);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar comentario');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const isAdmin = user?.role === 'admin';
  const canDelete = isAdmin;

  // ── Download attached file via axios (with auth) ──
  const handleDownload = async (c) => {
    if (!c.file_url) return;
    try {
      const res = await api.get(`/patrocinios/${id}/seguimiento/comments/${c.id}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = c.file_name || 'archivo';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Error al descargar el archivo');
    }
  };

  // ── Loading / Error ──
  if (loading) return <div className="loading-screen">Cargando seguimiento...</div>;
  if (error) return <div className="error-msg" style={{ margin: '2rem' }}>{error}</div>;
  if (!data) return null;

  const { patrocinio, items, comments } = data;
  const progress = items.length > 0
    ? Math.round((items.filter(i => i.completed).length / items.length) * 100)
    : 0;

  return (
    <div className="seguimiento-page">
      {/* ═══ Header ═══ */}
      <div className="page-header">
        <button className="btn" onClick={() => navigate('/patrocinios')}>
          ← Volver
        </button>
        <div style={{ flex: 1, marginLeft: '1rem' }}>
          <h1 style={{ margin: 0 }}>{patrocinio.company_name || 'Sin nombre'}</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            {patrocinio.package ? `Paquete: ${patrocinio.package}` : 'Sin paquete asignado'}
            {' · '}
            {patrocinio.sponsorship_type || 'Sin tipo'}
            {' · '}
            {patrocinio.contact_person || 'Sin contacto'}
          </p>
        </div>
      </div>

      {/* ═══ Main grid ═══ */}
      <div className="seguimiento-grid">
        {/* ─── Checklist column ─── */}
        <div className="seguimiento-checklist">
          <div className="seguimiento-section-header">
            <h2>Checklist de seguimiento</h2>
            {items.length > 0 && (
              <span className="seguimiento-progress">
                {items.filter(i => i.completed).length}/{items.length} · {progress}%
              </span>
            )}
          </div>

          {items.length === 0 ? (
            <div className="seguimiento-empty">
              <p>No hay componentes configurados para este paquete.</p>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Ve a Configuración &gt; Paquetes y asigna componentes al paquete.
              </p>
            </div>
          ) : (
            <>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>

              <div className="checklist-items">
                {items.map((item) => (
                  <label
                    key={item.id}
                    className={`checklist-item ${item.completed ? 'completed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      disabled={togglingItem === item.id}
                      onChange={() => toggleItem(item.id, item.completed)}
                    />
                    <span className="checklist-item-label">{item.label}</span>
                    {item.completed && item.completed_at && (
                      <span className="checklist-item-date">
                        {new Date(item.completed_at + 'Z').toLocaleDateString('es-MX', {
                          day: 'numeric', month: 'short'
                        })}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ─── Timeline column ─── */}
        <div className="seguimiento-timeline">
          <div className="seguimiento-section-header">
            <h2>Historial</h2>
            <span className="seguimiento-progress">{comments.length} comentarios</span>
          </div>

          {/* Add comment */}
          <div className="timeline-input">
            <textarea
              placeholder="Agregar comentario sobre el patrocinador..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
            />
            <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <label className="file-picker">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => setCommentFile(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
                <span className="btn" style={{ cursor: 'pointer', fontSize: '.8rem' }}>
                  {commentFile ? `📎 ${commentFile.name}` : '📎 Adjuntar archivo'}
                </span>
              </label>
              {commentFile && (
                <button
                  className="btn-sm btn-danger"
                  onClick={() => { setCommentFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  title="Quitar archivo"
                >
                  ✕
                </button>
              )}
              <button
                className="btn primary"
                onClick={handleAddComment}
                disabled={(!newComment.trim() && !commentFile) || sendingComment}
                style={{ marginLeft: 'auto' }}
              >
                {sendingComment ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>

          {/* Timeline entries */}
          {comments.length === 0 ? (
            <div className="seguimiento-empty">
              <p>Sin comentarios aún. Agrega el primero.</p>
            </div>
          ) : (
            <div className="timeline-entries">
              {comments.map((c) => (
                <div key={c.id} className="timeline-entry">
                  <div className="timeline-dot" />
                  <div className={`timeline-content ${c.deleted ? 'deleted' : ''}`}>
                    <div className="timeline-header">
                      <strong>
                        {c.deleted
                          ? <span style={{ color: '#94a3b8' }}>Mensaje eliminado</span>
                          : (c.created_by_name || 'Usuario')
                        }
                      </strong>
                      <span className="timeline-date">
                        {new Date(c.created_at + 'Z').toLocaleString('es-MX', {
                          day: 'numeric', month: 'long', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>

                    {c.deleted ? (
                      <p className="timeline-text deleted">
                        Este mensaje fue eliminado por {c.deleted_by_name || 'un administrador'}
                      </p>
                    ) : (
                      <>
                        <p className="timeline-text">{c.comment}</p>
                        {c.file_url && (
                          <div style={{ marginTop: '.5rem' }}>
                            <button
                              className="file-attachment"
                              onClick={() => handleDownload(c)}
                              style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}
                            >
                              📎 {c.file_name || 'Descargar archivo'}
                            </button>
                          </div>
                        )}
                        {canDelete && (
                          <button
                            className="btn-sm btn-danger"
                            onClick={() => handleDeleteComment(c.id)}
                            title="Eliminar"
                            style={{ marginTop: '0.35rem' }}
                          >
                            ✕
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
