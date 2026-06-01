import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <p style={{ padding: '2rem' }}>טוען...</p>;
  if (!isAdmin) return <Navigate to="/manage/stations" replace />;
  return children;
}
