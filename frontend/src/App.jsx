import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { PrivateRoute } from './components/PrivateRoute';
import ModuleRoute from './components/ModuleRoute';
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
import Disenos from './pages/Disenos';
import Redes from './pages/Redes';
import Logistica from './pages/Logistica';
import Audiovisual from './pages/Audiovisual';
import MisSolicitudes from './pages/MisSolicitudes';

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
        <Route path="/clients" element={<ModuleRoute module="clients"><Clients /></ModuleRoute>} />
        <Route path="/clients/:id" element={<ModuleRoute module="clients"><ClientDetail /></ModuleRoute>} />
        <Route path="/tasks" element={<ModuleRoute module="tasks"><Tasks /></ModuleRoute>} />
        <Route path="/users" element={<PrivateRoute roles={['admin']}><Users /></PrivateRoute>} />
        <Route path="/finance" element={<ModuleRoute module="finance"><Finance /></ModuleRoute>} />
        <Route path="/communications" element={<ModuleRoute module="communications"><Communications /></ModuleRoute>} />
        <Route path="/settings" element={<PrivateRoute roles={['admin']}><Settings /></PrivateRoute>} />
        <Route path="/patrocinios" element={<ModuleRoute module="patrocinios"><Patrocinios /></ModuleRoute>} />
        <Route path="/patrocinios/:id/seguimiento" element={<ModuleRoute module="patrocinios"><SeguimientoPatrocinio /></ModuleRoute>} />
        <Route path="/disenos" element={<ModuleRoute module="disenos"><Disenos /></ModuleRoute>} />
        <Route path="/redes" element={<ModuleRoute module="redes"><Redes /></ModuleRoute>} />
        <Route path="/logistica" element={<ModuleRoute module="logistica"><Logistica /></ModuleRoute>} />
        <Route path="/audiovisual" element={<ModuleRoute module="audiovisual"><Audiovisual /></ModuleRoute>} />
        <Route path="/mis-solicitudes" element={<MisSolicitudes />} />
        <Route path="/portal" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
