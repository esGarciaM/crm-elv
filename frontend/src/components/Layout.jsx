import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import EditProfileModal from './EditProfileModal';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Handshake,
  Palette,
  Share2,
  Truck,
  Video,
  Banknote,
  Send,
  UserCog,
  Settings,
  FileText,
  LogOut,
} from 'lucide-react';

export default function Layout({ children }) {
  const { user, logout, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleProfileSave = (updatedUser) => {
    updateUser(updatedUser);
    setShowProfile(false);
  };

  const isClient = user?.role === 'client';

  return (
    <div className="layout">
      <nav className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>{isClient ? 'Mi Portal' : 'CRM Patrocinios'}</h2>
          <p className="user-info">
            <button className="user-name-btn" onClick={() => setShowProfile(true)}>
              {user?.name}
            </button>
            {' '}<span className={`role-badge ${user?.role}`}>{user?.role}</span>
          </p>
        </div>
        <ul className="nav-links">
          {isClient ? (
            <li><Link to="/portal" onClick={() => setMenuOpen(false)}><FileText size={18} /> Mis Documentos</Link></li>
          ) : (
            <>
              <li><Link to="/" onClick={() => setMenuOpen(false)}><LayoutDashboard size={18} /> Dashboard</Link></li>
              <li><Link to="/clients" onClick={() => setMenuOpen(false)}><Users size={18} /> Clientes</Link></li>
              <li><Link to="/tasks" onClick={() => setMenuOpen(false)}><ClipboardList size={18} /> Tareas</Link></li>
              <li><Link to="/patrocinios" onClick={() => setMenuOpen(false)}><Handshake size={18} /> Patrocinios</Link></li>
              <li><Link to="/disenos" onClick={() => setMenuOpen(false)}><Palette size={18} /> Diseños</Link></li>
              <li><Link to="/redes" onClick={() => setMenuOpen(false)}><Share2 size={18} /> Redes</Link></li>
              <li><Link to="/logistica" onClick={() => setMenuOpen(false)}><Truck size={18} /> Logistica</Link></li>
              <li><Link to="/audiovisual" onClick={() => setMenuOpen(false)}><Video size={18} /> Audiovisual</Link></li>
              <li><Link to="/finance" onClick={() => setMenuOpen(false)}><Banknote size={18} /> Finanzas</Link></li>
              <li><Link to="/communications" onClick={() => setMenuOpen(false)}><Send size={18} /> Comunicaciones</Link></li>
              {user?.role === 'admin' && <li><Link to="/users" onClick={() => setMenuOpen(false)}><UserCog size={18} /> Usuarios</Link></li>}
              {user?.role === 'admin' && <li><Link to="/settings" onClick={() => setMenuOpen(false)}><Settings size={18} /> Configuración</Link></li>}
            </>
          )}
        </ul>
        <div className="theme-switcher" role="radiogroup" aria-label="Seleccionar tema">
          <button className={`theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')} role="radio" aria-checked={theme === 'light'}>Claro</button>
          <button className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')} role="radio" aria-checked={theme === 'dark'}>Oscuro</button>
          <button className={`theme-btn ${theme === 'neon' ? 'active' : ''}`} onClick={() => setTheme('neon')} role="radio" aria-checked={theme === 'neon'}>Neón</button>
        </div>
        <button className="logout-btn" onClick={handleLogout}><LogOut size={16} /> Cerrar Sesión</button>
      </nav>

      {menuOpen && <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />}

      <main className="main-content">
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? '✕' : '☰'} Menú
        </button>
        {children}
      </main>

      {showProfile && (
        <EditProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onSave={handleProfileSave}
        />
      )}
    </div>
  );
}
