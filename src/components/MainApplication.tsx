"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSession } from './SessionContextProvider';
import UserDropdownMenu from './UserDropdownMenu';
import { menuItems } from '@/lib/dashboard-utils';
import { useIsClient } from '@/hooks/useIsClient';
import { useIsProprietario } from '@/hooks/useIsProprietario';
import { useIsCompanyAdmin } from '@/hooks/useIsCompanyAdmin'; // Updated import
import { useIsGlobalAdmin } from '@/hooks/useIsGlobalAdmin'; // New hook

const MainApplication: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { session, loading } = useSession();
  const { isClient, loadingClientCheck } = useIsClient();
  const { isProprietario, loadingProprietarioCheck } = useIsProprietario();
  const { isCompanyAdmin, loadingCompanyAdminCheck } = useIsCompanyAdmin(); // Updated hook
  const { isGlobalAdmin, loadingGlobalAdminCheck } = useIsGlobalAdmin(); // New hook
  const location = useLocation();
  const navigate = useNavigate();

  const isProprietarioOrCompanyAdmin = isProprietario || isCompanyAdmin;
  
  // Define se estamos em uma rota de aplicação que deve ter sidebar
  // A sidebar deve aparecer apenas para Proprietários ou Admins de Empresa
  const isAppPath = isProprietarioOrCompanyAdmin && location.pathname !== '/' && !['/login', '/signup', '/reset-password', '/profile', '/register-company', '/agendar', '/meus-agendamentos', '/admin-dashboard'].includes(location.pathname);

  const handleMenuItemClick = (path: string) => {
    navigate(path);
  };

  // Adiciona o item de Configurações ao final da lista de menus SE FOR ADMIN
  const finalMenuItems = [...menuItems];
  if (!loadingProprietarioCheck && isProprietarioOrCompanyAdmin) { // Configurações da Empresa para Proprietário/Admin da Empresa
    finalMenuItems.push({ id: 'settings', label: 'Configurações da Empresa', icon: 'fas fa-cog', path: '/settings' });
  }


  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {isAppPath && (
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

          {loading ? (
            <div className="w-24 h-8 bg-gray-200 rounded-button animate-pulse"></div>
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
                <Button className="!rounded-button whitespace-nowrap bg-yellow-600 hover:bg-yellow-700 text-black">
                  Login
                </Button>
              </Link>
              {/* Botão Cadastrar removido conforme solicitado */}
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 pt-16">
        {isAppPath && (
          <aside className={`bg-gray-900 text-white transition-all duration-300 ${
            sidebarCollapsed ? 'w-16' : 'w-64'
          } min-h-full`}>
            <nav className="p-4">
              <ul className="space-y-2">
                {finalMenuItems.map((item) => (
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
                {!loadingClientCheck && isClient && (
                  <li>
                    <Link
                      to="/meus-agendamentos"
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors cursor-pointer ${
                        location.pathname === '/meus-agendamentos'
                          ? 'bg-yellow-600 text-black'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <i className="fas fa-calendar-check text-lg"></i>
                      {!sidebarCollapsed && (
                        <span className="font-medium">Meus Agendamentos</span>
                      )}
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
          </aside>
        )}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainApplication;