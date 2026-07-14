import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ModuleRoute({ module: moduleKey, children }) {
  const { user } = useAuth();

  if (user?.role === 'admin') return children;

  const hasAccess = user?.modules?.some(m => m.module_key === moduleKey);
  if (!hasAccess) return <Navigate to="/" replace />;

  return children;
}
