import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function SeguimientoComunicado({ communicationId }) {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newLink, setNewLink] = useState('');
  const [newFiles, setNewFiles] = useState([]);
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/communications/${communicationId}/comments`);
      setComments(res.data);
    } catch {
      setError('Error al cargar seguimiento');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [communicationId]);

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

      await api.post(`/communications/${communicationId}/comments`, fd, {
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
      await api.delete(`/communications/${communicationId}/comments/${commentId}`);
      load();
    } catch {
      setError('Error al eliminar comentario');
    }
  };

  const handleDownload = async (commentId, fileId, fileName) => {
    try {
      const res = await api.get(`/communications/${communicationId}/comments/${commentId}/download/${fileId}`, {
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

  const isAdmin = user?.role === 'admin';

  if (loading) return <div style={{ padding: '1rem', color: 'var(--text-muted)' }}>Cargando seguimiento...</div>;

  return (
    <div style={{ marginTop: '1rem' }}>
      <h4 style={{ margin: '0 0 0.75rem' }}>Seguimiento ({comments.length})</h4>

      {error && <div className="error-msg" style={{ marginBottom: '0.75rem' }}>{error}</div>}

      {/* Formulario */}
      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <textarea
          placeholder="Agregar comentario de seguimiento..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          style={{ width: '100%', resize: 'vertical' }}
        />
        <input
          type="url"
          placeholder="https://ejemplo.com/enlace"
          value={newLink}
          onChange={(e) => setNewLink(e.target.value)}
          style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}
        />
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          <label className="file-picker">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <span className="btn" style={{ cursor: 'pointer', fontSize: '0.8rem' }}>
              Adjuntar archivos ({newFiles.length}/5)
            </span>
          </label>
          <button
            className="btn primary"
            onClick={handleSubmit}
            disabled={(!newComment.trim() && newFiles.length === 0 && !newLink.trim()) || sending}
            style={{ marginLeft: 'auto' }}
          >
            {sending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
        {newFiles.length > 0 && (
          <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {newFiles.map((f, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'var(--bg-secondary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                {f.name}
                <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontWeight: 'bold', padding: 0 }}>✕</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Lista de comentarios */}
      {comments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
          Sin seguimiento aún.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {comments.map((c) => (
            <div key={c.id} className="card" style={{ padding: '1rem', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '0.85rem' }}>{c.created_by_name || 'Usuario'}</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(c.created_at + 'Z').toLocaleString('es-MX', {
                    day: 'numeric', month: 'long', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
              {c.comment && <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>{c.comment}</p>}
              {c.link && (
                <a href={c.link} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>
                  {c.link}
                </a>
              )}
              {c.files && c.files.length > 0 && (
                <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {c.files.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => handleDownload(c.id, f.id, f.original_name)}
                      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.2rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      📎 {f.original_name}
                    </button>
                  ))}
                </div>
              )}
              {isAdmin && (
                <button
                  className="btn-sm btn-danger"
                  onClick={() => handleDelete(c.id)}
                  title="Eliminar"
                  style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
