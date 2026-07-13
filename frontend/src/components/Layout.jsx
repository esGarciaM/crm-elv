import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isClient = user?.role === 'client';

  return (
    <div className="layout">
      <nav className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>{isClient ? 'Mi Portal' : 'CRM Patrocinios'}</h2>
          <p className="user-info">{user?.name} <span className={`role-badge ${user?.role}`}>{user?.role}</span></p>
        </div>
        <ul className="nav-links">
          {isClient ? (
            <li><Link to="/portal" onClick={() => setMenuOpen(false)}>Mis Documentos</Link></li>
          ) : (
            <>
              <li><Link to="/" onClick={() => setMenuOpen(false)}>Dashboard</Link></li>
              <li><Link to="/clients" onClick={() => setMenuOpen(false)}>Clientes</Link></li>
              <li><Link to="/tasks" onClick={() => setMenuOpen(false)}>Tareas</Link></li>
              <li><Link to="/patrocinios" onClick={() => setMenuOpen(false)}>Patrocinios</Link></li>
              <li><Link to="/disenos" onClick={() => setMenuOpen(false)}>Diseños</Link></li>
              <li><Link to="/redes" onClick={() => setMenuOpen(false)}>Redes</Link></li>
              <li><Link to="/logistica" onClick={() => setMenuOpen(false)}>Logistica</Link></li>
              <li><Link to="/audiovisual" onClick={() => setMenuOpen(false)}>Audiovisual</Link></li>
              <li><Link to="/finance" onClick={() => setMenuOpen(false)}>Finanzas</Link></li>
              <li><Link to="/communications" onClick={() => setMenuOpen(false)}>Comunicaciones</Link></li>
              {user?.role === 'admin' && <li><Link to="/users" onClick={() => setMenuOpen(false)}>Usuarios</Link></li>}
              {user?.role === 'admin' && <li><Link to="/settings" onClick={() => setMenuOpen(false)}>Configuración</Link></li>}
            </>
          )}
        </ul>
        <div className="theme-switcher" role="radiogroup" aria-label="Seleccionar tema">
          <button className={`theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')} role="radio" aria-checked={theme === 'light'}>Claro</button>
          <button className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')} role="radio" aria-checked={theme === 'dark'}>Oscuro</button>
          <button className={`theme-btn ${theme === 'neon' ? 'active' : ''}`} onClick={() => setTheme('neon')} role="radio" aria-checked={theme === 'neon'}>Neón</button>
        </div>
        <button className="logout-btn" onClick={handleLogout}>Cerrar Sesión</button>
      </nav>

      {menuOpen && <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />}

      <main className="main-content">
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? '✕' : '☰'} Menú
        </button>
        {children}
      </main>
    </div>
  );
}
