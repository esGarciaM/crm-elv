import { useState, useEffect } from 'react';
import api from '../api';
import SeguimientoComunicado from './SeguimientoComunicado';

const STATUS_LABELS = { asignado: 'Asignado', en_redaccion: 'En Redacción', en_revision: 'En Revisión', aprobado: 'Aprobado', entregado: 'Entregado' };
const STATUS_COLORS = { asignado: 'var(--text-light)', en_redaccion: 'var(--warning)', en_revision: 'var(--info)', aprobado: 'var(--success)', entregado: 'var(--accent)' };
const PRIORITY_LABELS = { alta: 'Alta', media: 'Media', baja: 'Baja' };

export default function ComunicadoPatrocinio({ patrocinioId, audiovisualId }) {
  const moduleId = patrocinioId || audiovisualId;
  const moduleType = patrocinioId ? 'patrocinio' : audiovisualId ? 'audiovisual' : null;

  const [comunicados, setComunicados] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [seguimientoId, setSeguimientoId] = useState(null);
  const [form, setForm] = useState({
    employee_name: '', department_id: '', document_type_id: '',
    status: 'asignado', priority: 'media', notes: '', image_url: '', video_url: ''
  });

  const load = async () => {
    setLoading(true);
    try {
      let url;
      if (patrocinioId) url = `/communications/patrocinio/${patrocinioId}`;
      else if (audiovisualId) url = `/communications/audiovisual/${audiovisualId}`;
      else url = '/communications/mis-comunicados';
      const [comRes, depRes, empRes, dtRes] = await Promise.all([
        api.get(url),
        api.get('/departments'),
        api.get('/employees'),
        api.get('/document-types')
      ]);
      setComunicados(comRes.data);
      setDepartments(depRes.data);
      setEmployees(empRes.data);
      setDocTypes(dtRes.data);
    } catch {
      setError('Error al cargar comunicados');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [patrocinioId, audiovisualId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employee_name.trim()) return;
    const payload = {
      ...form,
      patrocinio_id: patrocinioId || null,
      audiovisual_id: audiovisualId || null
    };
    try {
      await api.post('/communications', payload);
      setForm({ employee_name: '', department_id: '', document_type_id: '', status: 'asignado', priority: 'media', notes: '', image_url: '', video_url: '' });
      setError('');
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear comunicado');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este comunicado?')) return;
    try {
      await api.delete(`/communications/${id}`);
      load();
    } catch {
      setError('Error al eliminar comunicado');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/communications/${id}`, { status: newStatus });
      load();
    } catch {
      setError('Error al actualizar estado');
    }
  };

  if (loading) return <div style={{ padding: '1rem', color: 'var(--text-muted)' }}>Cargando comunicados...</div>;

  return (
    <div style={{ padding: '0.5rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Mis Comunicados ({comunicados.length})</h3>
        <button className="btn primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nuevo Comunicado'}
        </button>
      </div>

      {error && <div className="error-msg" style={{ marginBottom: '1rem' }}>{error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h4>Nuevo Comunicado</h4>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>Empleado:
                <select value={form.employee_name} onChange={e => setForm({ ...form, employee_name: e.target.value })} required>
                  <option value="">Seleccionar empleado</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={`${emp.first_name} ${emp.last_name}`}>{emp.first_name} {emp.last_name}</option>
                  ))}
                </select>
              </label>
              <label>Departamento:
                <select value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
                  <option value="">Sin departamento</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </label>
              <label>Tipo de Documento:
                <select value={form.document_type_id} onChange={e => setForm({ ...form, document_type_id: e.target.value })}>
                  <option value="">Seleccionar tipo</option>
                  {docTypes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </label>
              <label>Prioridad:
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
              </label>
            </div>
            <label style={{ display: 'block', marginTop: '1rem' }}>Notas:
              <textarea rows="3" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ width: '100%', marginTop: '.25rem' }} />
            </label>
            <label style={{ display: 'block', marginTop: '1rem' }}>Enlace de Imagen:
              <input type="url" placeholder="https://ejemplo.com/imagen.jpg" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} style={{ display: 'block', marginTop: '.25rem', width: '100%' }} />
            </label>
            <label style={{ display: 'block', marginTop: '1rem' }}>Enlace de Video:
              <input type="url" placeholder="https://ejemplo.com/video.mp4" value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} style={{ display: 'block', marginTop: '.25rem', width: '100%' }} />
            </label>
            <button type="submit" className="btn primary" style={{ marginTop: '1rem' }}>Crear Comunicado</button>
          </form>
        </div>
      )}

      {comunicados.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          <p>Sin comunicados registrados.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Folio</th>
                <th>Empleado</th>
                <th>Depto.</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Prioridad</th>
                <th>Medios</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {comunicados.map(c => (
                <tr key={c.id}>
                  <td>{c.folio}</td>
                  <td>{c.employee_name}</td>
                  <td>{c.department_name || '-'}</td>
                  <td>{c.document_type_name || '-'}</td>
                  <td>
                    <select
                      value={c.status}
                      onChange={(e) => handleStatusChange(c.id, e.target.value)}
                      style={{ padding: '.25rem', borderRadius: '4px', border: `1px solid ${STATUS_COLORS[c.status] || '#ccc'}` }}
                    >
                      {Object.entries(STATUS_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td><span className={`badge ${c.priority}`}>{PRIORITY_LABELS[c.priority]}</span></td>
                  <td>
                    {c.image_url && <a href={c.image_url} target="_blank" rel="noreferrer" style={{ display: 'block' }}>Imagen</a>}
                    {c.video_url && <a href={c.video_url} target="_blank" rel="noreferrer" style={{ display: 'block' }}>Video</a>}
                    {!c.image_url && !c.video_url && '-'}
                  </td>
                  <td>
                    <button className="btn small" style={{ marginRight: '.25rem' }} onClick={() => setSeguimientoId(seguimientoId === c.id ? null : c.id)}>
                      Seguimiento
                    </button>
                    <button className="btn small danger" onClick={() => handleDelete(c.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {seguimientoId && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h4 style={{ margin: 0 }}>Seguimiento del comunicado #{seguimientoId}</h4>
            <button className="btn small" onClick={() => setSeguimientoId(null)}>Cerrar</button>
          </div>
          <SeguimientoComunicado communicationId={seguimientoId} />
        </div>
      )}
    </div>
  );
}
