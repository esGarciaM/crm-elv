import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h2>CRM Patrocinios</h2>
          <p className="user-info">{user?.name} <span className="role-badge">{user?.role}</span></p>
        </div>
        <ul className="nav-links">
          <li><Link to="/">Dashboard</Link></li>
          <li><Link to="/clients">Clientes</Link></li>
          <li><Link to="/tasks">Tareas</Link></li>
          {user?.role === 'admin' && <li><Link to="/users">Usuarios</Link></li>}
        </ul>
        <button className="logout-btn" onClick={handleLogout}>Cerrar Sesión</button>
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
