import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSession } from './SessionContextProvider';
import UserDropdownMenu from './UserDropdownMenu';
import { menuItems } from '@/lib/dashboard-utils'; // Importar menuItems do arquivo de utilitários

const MainApplication: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { session, loading } = useSession();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine if the current path is an "app" path (i.e., not landing or auth)
  const isAppPath = location.pathname !== '/' && !['/login', '/signup', '/reset-password', '/profile', '/register-company'].includes(location.pathname);

  const handleMenuItemClick = (path: string) => {
    navigate(path);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header Section - Always present */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side of the header */}
          <div className="flex items-center gap-4">
            {isAppPath && ( // Show hamburger only on app paths
              <Button
                variant="ghost"
                className="lg:hidden !rounded-button cursor-pointer"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                <i className="fas fa-bars"></i>
              </Button>
            )}
            <Link to="/" className="flex items-center gap-3 cursor-pointer">
              <div className="w-10 h-10 bg-yellow-600 rounded-lg flex items-center justify-center">
                <i className="fas fa-calendar-alt text-white"></i>
              </div>
              <h1 className="text-xl font-bold text-gray-900">TipoAgenda</h1>
            </Link>
          </div>

          {/* Right side of the header */}
          {loading ? (
            <div className="w-24 h-8 bg-gray-200 rounded-button animate-pulse"></div> // Placeholder for loading state
          ) : session ? (
            <div className="flex items-center gap-4">
              <Button variant="ghost" className="!rounded-button cursor-pointer relative">
                <i className="fas fa-bell text-gray-600"></i>
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">3</span>
              </Button>
              <UserDropdownMenu session={session} />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost" className="!rounded-button whitespace-nowrap text-gray-700 hover:bg-gray-100">
                  Login
                </Button>
              </Link>
              <Link to="/signup">
                <Button className="!rounded-button whitespace-nowrap bg-yellow-600 hover:bg-yellow-700 text-black">
                  Cadastrar
                </Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main content area (sidebar + main content) */}
      <div className="flex flex-1 pt-16"> {/* Adicionado padding-top para compensar o header fixo */}
        {isAppPath && ( // Show sidebar only on app paths
          <aside className={`bg-gray-900 text-white transition-all duration-300 ${
            sidebarCollapsed ? 'w-16' : 'w-64'
          } min-h-full`}>
            <nav className="p-4">
              <ul className="space-y-2">
                {menuItems.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={item.path}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors cursor-pointer ${
                        location.pathname === item.path
                          ? 'bg-yellow-600 text-black'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <i className={`${item.icon} text-lg`}></i>
                      {!sidebarCollapsed && (
                        <span className="font-medium">{item.label}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        )}
        <main className="flex-1 p-6">
          <Outlet /> {/* Render nested routes here */}
        </main>
      </div>
    </div>
  );
};

export default MainApplication;