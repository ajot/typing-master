import { Outlet, Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardLayout() {
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

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-theme min-h-screen bg-gray-50">
      <nav className="bg-black border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 items-center">
            <div className="flex items-center gap-6">
              <Link to="/dashboard" className="text-do-orange text-sm" style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '12px' }}>
                Type the Cloud
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">{organizer.email}</span>
              <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-white">
                Log out
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
