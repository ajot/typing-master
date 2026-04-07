import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

type AppLayoutProps = {
  children: ReactNode;
  rightContent?: ReactNode;
};

export default function AppLayout({ children, rightContent }: AppLayoutProps) {
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
            {rightContent && (
              <div className="flex items-center gap-4">
                {rightContent}
              </div>
            )}
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
