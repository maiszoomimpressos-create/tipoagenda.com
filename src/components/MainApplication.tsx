"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Link, Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useSession } from './SessionContextProvider';
import UserDropdownMenu from './UserDropdownMenu';
import { menuItems } from '@/lib/dashboard-utils';
import { useIsClient } from '@/hooks/useIsClient';
import { useIsProprietario } from '@/hooks/useIsProprietario';
import { useIsCompanyAdmin } from '@/hooks/useIsCompanyAdmin';
import { useIsGlobalAdmin } from '@/hooks/useIsGlobalAdmin';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { usePrimaryCompany } from '@/hooks/usePrimaryCompany';
import SubscriptionExpiredPage from '@/pages/SubscriptionExpiredPage';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Zap, Menu, Bell } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNotifications } from '@/hooks/useNotifications';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import NotificationList from './NotificationList'; // Importar novo componente

const MainApplication: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { session, loading: sessionLoading } = useSession();
  const { isProprietario, loadingProprietarioCheck } = useIsProprietario();
  const { isCompanyAdmin, loadingCompanyAdminCheck } = useIsCompanyAdmin();
  const { isGlobalAdmin, loadingGlobalAdminCheck } = useIsGlobalAdmin();
  const { isClient, loadingClientCheck } = useIsClient();
  const { primaryCompanyId, loadingPrimaryCompany } = usePrimaryCompany();
  
  // Novo: Status da Assinatura
  const { status: subscriptionStatus, endDate, loading: loadingSubscription } = useSubscriptionStatus();
  
  // Novo: Notificações (apenas para Proprietário/Admin)
  const { notifications, unreadCount, loading: loadingNotifications, markAllAsRead } = useNotifications();

  const location = useLocation();
  const navigate = useNavigate();

  const isProprietarioOrCompanyAdmin = isProprietario || isCompanyAdmin;
  
  // Rotas que não devem ter sidebar, mesmo para Proprietários/Admins
  const excludedPaths = ['/', '/login', '/signup', '/reset-password', '/profile', '/register-company', '/agendar', '/meus-agendamentos', '/admin-dashboard'];
  
  // Define se estamos em uma rota de aplicação que deve ter sidebar (para Proprietários/Admins)
  const isAppPath = isProprietarioOrCompanyAdmin && 
    !excludedPaths.some(path => location.pathname.startsWith(path) && location.pathname.length === path.length);

  const handleMenuItemClick = (path: string) => {
    navigate(path);
  };

  const finalMenuItems = menuItems
    .filter(item => {
      // Filtrar itens com restrição de roles
      if (item.roles && item.roles.length > 0) {
        // Se o item requer 'Proprietário', mostrar apenas para proprietários
        if (item.roles.includes('Proprietário')) {
          return isProprietario;
        }
      }
      // Item "Dados da Empresa" - mostrar apenas para gestores e proprietários
      if (item.id === 'empresa') {
        return isProprietarioOrCompanyAdmin;
      }
      // Outros itens sem restrição - mostrar para todos
      return true;
    })
    .map(item => {
      if (item.id === 'agendamentos' && primaryCompanyId) {
        return { ...item, path: `/agendamentos/${primaryCompanyId}` };
      }
      return item;
    });

  // Se o usuário é Proprietário/Admin e a assinatura expirou ou não existe, bloqueia o acesso a todas as rotas de gerenciamento
  if (isProprietarioOrCompanyAdmin && (subscriptionStatus === 'expired' || subscriptionStatus === 'no_subscription')) {
    // Permite apenas acesso a rotas públicas, perfil, e a página de planos
    if (!['/planos', '/profile'].includes(location.pathname)) {
      return <SubscriptionExpiredPage endDate={endDate} />;
    }
  }

  // Se o usuário está carregando a sessão ou os status, exibe loading
  if (sessionLoading || loadingProprietarioCheck || loadingCompanyAdminCheck || loadingGlobalAdminCheck || loadingClientCheck || loadingSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">Carregando aplicação...</p>
      </div>
    );
  }

  // Renderiza o componente principal
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

          {session ? (
            <div className="flex items-center gap-4">
              {/* Ícone de Notificações (Sininho) */}
              {isProprietarioOrCompanyAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="!rounded-button cursor-pointer relative">
                      <Bell className="h-5 w-5 text-gray-600" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <NotificationList 
                    notifications={notifications} 
                    unreadCount={unreadCount} 
                    loading={loadingNotifications} 
                    markAllAsRead={markAllAsRead} 
                  />
                </DropdownMenu>
              )}
              <UserDropdownMenu session={session} />
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="!rounded-button">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/login')}>
                  Login
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/register-professional')}>
                  Cadastro
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
          {/* Aviso de Expiração */}
          {isProprietarioOrCompanyAdmin && subscriptionStatus === 'expiring_soon' && endDate && (
            <Alert className="mb-6 border-yellow-500 bg-yellow-50 text-yellow-800">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800">Aviso de Expiração!</AlertTitle>
              <AlertDescription>
                Sua assinatura expira em breve, no dia {format(parseISO(endDate), 'dd/MM/yyyy', { locale: ptBR })}. 
                <Link to="/planos" className="font-semibold underline ml-1">Renove agora</Link> para evitar a interrupção dos serviços.
              </AlertDescription>
            </Alert>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainApplication;