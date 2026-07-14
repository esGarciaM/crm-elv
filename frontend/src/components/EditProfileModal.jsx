import { useState } from 'react';
import api from '../api';
import { User, Lock, Save, X } from 'lucide-react';

export default function EditProfileModal({ user, onClose, onSave }) {
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setError('');

    if (!name.trim()) {
      setError('El nombre es requerido');
      return;
    }

    if (newPassword) {
      if (!currentPassword) {
        setError('Debes ingresar tu contraseña actual para cambiarla');
        return;
      }
      if (newPassword.length < 6) {
        setError('La nueva contraseña debe tener al menos 6 caracteres');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('Las contraseñas nuevas no coinciden');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = { name: name.trim() };
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }
      const res = await api.put('/auth/profile', payload);
      onSave(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><User size={20} /> Mi Perfil</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <div className="profile-fields">
          <div className="profile-field">
            <label>Nombre de usuario</label>
            <input type="text" value={user?.username || ''} disabled className="disabled-field" />
          </div>

          <div className="profile-field">
            <label>Rol</label>
            <input type="text" value={user?.role || ''} disabled className="disabled-field" />
          </div>

          <div className="profile-field">
            <label htmlFor="profile-name">Nombre completo</label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
            />
          </div>
        </div>

        <div className="profile-divider" />

        <div className="profile-section-title">
          <Lock size={16} /> Cambiar contraseña
        </div>

        <div className="profile-fields">
          <div className="profile-field">
            <label htmlFor="profile-current-pw">Contraseña actual</label>
            <input
              id="profile-current-pw"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Requerida para cambiar contraseña"
              autoComplete="current-password"
            />
          </div>

          <div className="profile-field">
            <label htmlFor="profile-new-pw">Nueva contraseña</label>
            <input
              id="profile-new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
          </div>

          <div className="profile-field">
            <label htmlFor="profile-confirm-pw">Confirmar nueva contraseña</label>
            <input
              id="profile-confirm-pw"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la nueva contraseña"
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleSave} disabled={saving}>
            <Save size={16} /> {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
