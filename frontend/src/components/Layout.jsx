import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
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
              {user?.role === 'admin' && <li><Link to="/users" onClick={() => setMenuOpen(false)}>Usuarios</Link></li>}
            </>
          )}
        </ul>
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
