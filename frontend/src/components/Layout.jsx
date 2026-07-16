import { useState, useRef, useEffect } from 'react';
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
  User,
  ChevronDown,
  Menu,
  FileCheck,
} from 'lucide-react';

const MODULE_ICONS = {
  dashboard: LayoutDashboard,
  clients: Users,
  tasks: ClipboardList,
  patrocinios: Handshake,
  disenos: Palette,
  redes: Share2,
  logistica: Truck,
  audiovisual: Video,
  finance: Banknote,
  communications: Send,
  users: UserCog,
  settings: Settings,
};

const MODULE_ROUTES = {
  dashboard: '/',
  clients: '/clients',
  tasks: '/tasks',
  patrocinios: '/patrocinios',
  disenos: '/disenos',
  redes: '/redes',
  logistica: '/logistica',
  audiovisual: '/audiovisual',
  finance: '/finance',
  communications: '/communications',
  users: '/users',
  settings: '/settings',
};

const MODULE_LABELS = {
  dashboard: 'Dashboard',
  clients: 'Clientes',
  tasks: 'Tareas',
  patrocinios: 'Patrocinios',
  disenos: 'Diseños',
  redes: 'Redes',
  logistica: 'Logística',
  audiovisual: 'Audiovisual',
  finance: 'Finanzas',
  communications: 'Comunicaciones',
  users: 'Usuarios',
  settings: 'Configuración',
};

export default function Layout({ children }) {
  const { user, logout, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleProfileSave = (updatedUser) => {
    updateUser(updatedUser);
    setShowProfile(false);
  };

  const isClient = user?.role === 'client';
  const isAdmin = user?.role === 'admin';
  const hasModules = user?.modules && user.modules.length > 0;

  const canAccess = (key) => {
    if (isAdmin) return true;
    if (!hasModules) return true;
    return user.modules.some(m => m.module_key === key);
  };

  const visibleModules = Object.keys(MODULE_ROUTES).filter(canAccess);

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
            visibleModules.map(key => {
              const Icon = MODULE_ICONS[key];
              return (
                <li key={key}>
                  <Link to={MODULE_ROUTES[key]} onClick={() => setMenuOpen(false)}>
                    <Icon size={18} /> {MODULE_LABELS[key]}
                  </Link>
                </li>
              );
            })
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

      <div className="main-area">
        <header className="top-navbar">
          <div className="navbar-left">
            <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
              <Menu size={20} />
            </button>
            <span className="navbar-brand">{isClient ? 'Mi Portal' : 'CRM Patrocinios'}</span>
          </div>
          <div className="navbar-right" ref={userMenuRef}>
            <div className="navbar-user-menu">
              <button className="navbar-user-btn" onClick={() => setUserMenuOpen(!userMenuOpen)}>
                <span className="navbar-user-icon">
                  <User size={18} />
                </span>
                <span className="navbar-user-name">{user?.name}</span>
                <span className={`role-badge ${user?.role}`}>{user?.role}</span>
                <ChevronDown size={14} className={`navbar-chevron ${userMenuOpen ? 'open' : ''}`} />
              </button>
              {userMenuOpen && (
                <div className="navbar-dropdown">
                  <button className="navbar-dropdown-item" onClick={() => { navigate('/mis-solicitudes'); setUserMenuOpen(false); }}>
                    <FileCheck size={16} /> Mis Solicitudes
                  </button>
                  <button className="navbar-dropdown-item" onClick={() => { setShowProfile(true); setUserMenuOpen(false); }}>
                    <UserCog size={16} /> Editar Perfil
                  </button>
                  <button className="navbar-dropdown-item danger" onClick={handleLogout}>
                    <LogOut size={16} /> Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="main-content">
          {children}
        </main>
      </div>

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
