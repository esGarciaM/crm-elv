import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function SeguimientoSolicitud({ solicitudId }) {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [comments, setComments] = useState([]);
  const [solicitud, setSolicitud] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newLink, setNewLink] = useState('');
  const [newFiles, setNewFiles] = useState([]);
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [commentsRes, solRes] = await Promise.all([
        api.get(`/finance/solicitudes/${solicitudId}/comments`),
        api.get(`/finance/solicitudes/${solicitudId}`)
      ]);
      setComments(commentsRes.data);
      setSolicitud(solRes.data);
    } catch {
      setError('Error al cargar seguimiento');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [solicitudId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (newFiles.length + selected.length > 5) {
      setError('Máximo 5 archivos por comentario');
      return;
    }
    for (const f of selected) {
      if (f.size > 10 * 1024 * 1024) {
        setError(`El archivo "${f.name}" excede 10 MB`);
        return;
      }
    }
    setNewFiles(prev => [...prev, ...selected]);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!newComment.trim() && newFiles.length === 0 && !newLink.trim()) return;
    setSending(true);
    try {
      const fd = new FormData();
      if (newComment.trim()) fd.append('comment', newComment.trim());
      if (newLink.trim()) fd.append('link', newLink.trim());
      for (const f of newFiles) fd.append('files', f);

      await api.post(`/finance/solicitudes/${solicitudId}/comments`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setNewComment('');
      setNewLink('');
      setNewFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      load();
    } catch {
      setError('Error al agregar comentario');
    }
    setSending(false);
  };

  const handleDelete = async (commentId) => {
    if (!confirm('¿Eliminar este comentario?')) return;
    try {
      await api.delete(`/finance/solicitudes/${solicitudId}/comments/${commentId}`);
      load();
    } catch {
      setError('Error al eliminar comentario');
    }
  };

  const handleDownload = async (commentId, fileId, fileName) => {
    try {
      const res = await api.get(`/finance/solicitudes/${solicitudId}/comments/${commentId}/download/${fileId}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Error al descargar archivo');
    }
  };

  const handleDownloadSolFile = async (fileId, fileName) => {
    try {
      const res = await api.get(`/finance/solicitudes/download/${fileId}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Error al descargar archivo');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  const formatTime = (dateStr) => {
    try {
      return new Date(dateStr + 'Z').toLocaleString('es-MX', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const formatDateSep = (dateStr) => {
    try {
      return new Date(dateStr + 'Z').toLocaleDateString('es-MX', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  const groupByDate = (items) => {
    const groups = [];
    let lastDate = '';
    for (const c of items) {
      const d = c.created_at?.split(' ')[0] || '';
      if (d !== lastDate) {
        groups.push({ type: 'date', date: c.created_at, key: `date-${d}` });
        lastDate = d;
      }
      groups.push({ type: 'comment', data: c, key: `comment-${c.id}` });
    }
    return groups;
  };

  const isAdmin = user?.role === 'admin';

  if (loading) return <div style={{ padding: '1rem', color: 'var(--text-muted)' }}>Cargando seguimiento...</div>;

  const grouped = groupByDate(comments);

  return (
    <div style={{ marginTop: '1rem' }}>
      <h4 style={{ margin: '0 0 0.75rem' }}>Seguimiento ({comments.length})</h4>

      {error && <div className="error-msg" style={{ marginBottom: '0.75rem' }}>{error}</div>}

      <div className="chat-container">
        <div className="chat-messages">
          {solicitud?.files && solicitud.files.length > 0 && (
            <div className="chat-sol-files">
              <div className="chat-sol-files-label">📋 Documentos adjuntos de la solicitud</div>
              <div className="chat-sol-files-list">
                {solicitud.files.map((f) => (
                  <button
                    key={f.id}
                    className="chat-file-btn other"
                    onClick={() => handleDownloadSolFile(f.id, f.original_name)}
                  >
                    📎 {f.original_name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {comments.length === 0 && (!solicitud?.files || solicitud.files.length === 0) ? (
            <div className="chat-empty">Sin mensajes aún</div>
          ) : (
            grouped.map((item) => {
              if (item.type === 'date') {
                return <div key={item.key} className="chat-date-sep">{formatDateSep(item.date)}</div>;
              }
              const c = item.data;
              const isMine = c.created_by === user?.id;
              return (
                <div key={item.key} className={`chat-bubble-row ${isMine ? 'mine' : 'other'}`}>
                  <div className={`chat-avatar ${isMine ? 'mine' : 'other'}`}>
                    {getInitials(c.created_by_name)}
                  </div>
                  <div className={`chat-bubble ${isMine ? 'mine' : 'other'}`}>
                    {!isMine && <div className="chat-bubble-name">{c.created_by_name || 'Usuario'}</div>}
                    {c.comment && <p className="chat-bubble-text">{c.comment}</p>}
                    {c.link && (
                      <a href={c.link} target="_blank" rel="noreferrer" className="chat-bubble-link">
                        {c.link}
                      </a>
                    )}
                    {c.files && c.files.length > 0 && (
                      <div className="chat-bubble-files">
                        {c.files.map((f) => (
                          <button
                            key={f.id}
                            className="chat-file-btn"
                            onClick={() => handleDownload(c.id, f.id, f.original_name)}
                          >
                            📎 {f.original_name}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="chat-bubble-time">{formatTime(c.created_at)}</div>
                    {isAdmin && (
                      <button className="chat-bubble-delete" onClick={() => handleDelete(c.id)} title="Eliminar">✕</button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input">
          {newFiles.length > 0 && (
            <div className="chat-files-preview">
              {newFiles.map((f, i) => (
                <span key={i} className="chat-file-tag">
                  {f.name}
                  <button onClick={() => removeFile(i)}>✕</button>
                </span>
              ))}
            </div>
          )}
          <input
            type="url"
            className="chat-link-input"
            placeholder="Agregar enlace (opcional)"
            value={newLink}
            onChange={(e) => setNewLink(e.target.value)}
          />
          <div className="chat-input-row">
            <textarea
              placeholder="Escribe un mensaje..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
          </div>
          <div className="chat-input-actions">
            <label className="file-picker">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <span className="btn" style={{ cursor: 'pointer' }}>
                Adjuntar ({newFiles.length}/5)
              </span>
            </label>
            <button
              className="btn primary"
              onClick={handleSubmit}
              disabled={(!newComment.trim() && newFiles.length === 0 && !newLink.trim()) || sending}
            >
              {sending ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
