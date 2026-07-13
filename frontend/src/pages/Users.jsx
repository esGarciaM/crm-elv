import { useState, useEffect } from 'react';
import api from '../api';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'user' });
  const [error, setError] = useState('');

  const load = () => {
    api.get('/auth').then((r) => setUsers(r.data));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ username: '', password: '', name: '', role: 'user' });
    setEditingUser(null);
    setError('');
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({ username: user.username, password: '', name: user.name, role: user.role });
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      if (editingUser) {
        const payload = { name: form.name, role: form.role };
        if (form.password) payload.password = form.password;
        await api.put(`/auth/${editingUser.id}`, payload);
      } else {
        await api.post('/auth', form);
      }
      setShowForm(false);
      resetForm();
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
        <button className="btn" onClick={openCreate}>
          {showForm ? 'Cancelar' : '+ Nuevo Usuario'}
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); resetForm(); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-grid">
              {!editingUser && (
                <input placeholder="Usuario" value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} required />
              )}
              <input placeholder="Nombre completo" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
              <input type="password" placeholder={editingUser ? 'Nueva contraseña (dejar vacío para mantener)' : 'Contraseña'} value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} {...(!editingUser && { required: true })} />
              <select value={form.role} onChange={(e) => setForm({...form, role: e.target.value})}>
                <option value="user">Usuario (Equipo)</option>
                <option value="admin">Admin</option>
                <option value="viewer">Visor</option>
                <option value="client">Cliente (Portal)</option>
              </select>
            </div>
            <button className="btn primary" onClick={handleSave}>
              {editingUser ? 'Guardar Cambios' : 'Crear'}
            </button>
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
              <td className="actions-cell">
                <button className="btn small" onClick={() => openEdit(u)}>
                  Editar
                </button>
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
