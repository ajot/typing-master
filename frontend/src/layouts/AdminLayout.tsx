import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from './AppLayout';
import { AdminPage } from '../pages/AdminPage';

export default function AdminLayout() {
  const { organizer, loading, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="dashboard-theme min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!organizer) {
    return <Navigate to="/login" replace />;
  }

  if (!organizer.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <AppLayout
      rightContent={
        <>
          <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">Admin</span>
          <span className="text-sm text-gray-500">{organizer.email}</span>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-white">
            Log out
          </button>
        </>
      }
    >
      <AdminPage />
    </AppLayout>
  );
}
