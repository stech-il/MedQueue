import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Dashboard from '../pages/manage/Dashboard';

export default function ManageIndex() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/manage/stations" replace />;
  return <Dashboard />;
}
