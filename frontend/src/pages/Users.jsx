import { useState, useEffect } from 'react';
import api from '../api';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'user' });
  const [error, setError] = useState('');

  const load = () => {
    api.get('/auth').then((r) => setUsers(r.data));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      await api.post('/auth', form);
      setShowForm(false);
      setForm({ username: '', password: '', name: '', role: 'user' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Error');
    }
  };

  const toggleActive = async (id, active) => {
    await api.put(`/auth/${id}`, { active: active ? 1 : 0 });
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1>Usuarios</h1>
        <button className="btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nuevo Usuario'}
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Nuevo Usuario</h2>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-grid">
              <input placeholder="Usuario" value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} required />
              <input placeholder="Nombre completo" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
              <input type="password" placeholder="Contraseña" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required />
              <select value={form.role} onChange={(e) => setForm({...form, role: e.target.value})}>
                <option value="user">Usuario</option>
                <option value="admin">Admin</option>
                <option value="viewer">Visor</option>
              </select>
            </div>
            <button className="btn primary" onClick={handleSave}>Crear</button>
          </div>
        </div>
      )}

      <table>
        <thead>
          <tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Activo</th><th>Creado</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td>{u.name}</td>
              <td><span className={`role-badge ${u.role}`}>{u.role}</span></td>
              <td>{u.active ? 'Sí' : 'No'}</td>
              <td>{u.created_at}</td>
              <td>
                <button className="btn small" onClick={() => toggleActive(u.id, !u.active)}>
                  {u.active ? 'Desactivar' : 'Activar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
