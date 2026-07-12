import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Tasks from './pages/Tasks';
import Users from './pages/Users';
import Finance from './pages/Finance';
import Settings from './pages/Settings';
import Communications from './pages/Communications';
import Patrocinios from './pages/Patrocinios';
import SeguimientoPatrocinio from './pages/SeguimientoPatrocinio';
import ClientPortal from './pages/ClientPortal';

function AppContent() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Cargando...</div>;
  if (!user) return <Login />;

  if (user.role === 'client') {
    return (
      <Layout>
        <Routes>
          <Route path="/portal" element={<ClientPortal />} />
          <Route path="*" element={<Navigate to="/portal" />} />
        </Routes>
      </Layout>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/:id" element={<ClientDetail />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/users" element={<PrivateRoute roles={['admin']}><Users /></PrivateRoute>} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/communications" element={<Communications />} />
        <Route path="/settings" element={<PrivateRoute roles={['admin']}><Settings /></PrivateRoute>} />
        <Route path="/patrocinios" element={<Patrocinios />} />
        <Route path="/patrocinios/:id/seguimiento" element={<SeguimientoPatrocinio />} />
        <Route path="/portal" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
