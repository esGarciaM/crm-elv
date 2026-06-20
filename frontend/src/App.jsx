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
