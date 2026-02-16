"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Link, Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useSession } from './SessionContextProvider';
import UserDropdownMenu from './UserDropdownMenu';
import { menuItems as staticMenuItems } from '@/lib/dashboard-utils';
import { useMenuItems } from '@/hooks/useMenuItems';
import { useIsClient } from '@/hooks/useIsClient';
import { useIsProprietario } from '@/hooks/useIsProprietario';
import { useIsCompanyAdmin } from '@/hooks/useIsCompanyAdmin';
import { useIsGlobalAdmin } from '@/hooks/useIsGlobalAdmin';
import { useIsCollaborator } from '@/hooks/useIsCollaborator';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { usePrimaryCompany } from '@/hooks/usePrimaryCompany';
import { useCompanyDetails } from '@/hooks/useCompanyDetails'; // Importar o novo hook
import SubscriptionExpiredPage from '@/pages/SubscriptionExpiredPage';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Zap, Menu, Bell } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNotifications } from '@/hooks/useNotifications';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import NotificationList from './NotificationList'; // Importar novo componente
import { useIsMobile } from '@/hooks/use-mobile';

const MainApplication: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { session, loading: sessionLoading } = useSession();
  const { isProprietario, loadingProprietarioCheck } = useIsProprietario();
  const { isCompanyAdmin, loadingCompanyAdminCheck } = useIsCompanyAdmin();
  const { isGlobalAdmin, loadingGlobalAdminCheck } = useIsGlobalAdmin();
  const { isClient, loadingClientCheck } = useIsClient();
  const { isCollaborator, loading: loadingCollaboratorCheck } = useIsCollaborator();
  const { primaryCompanyId, loadingPrimaryCompany } = usePrimaryCompany();
  const { companyDetails, loading: loadingCompanyDetails } = useCompanyDetails(primaryCompanyId); // Usar o novo hook
  const isMobile = useIsMobile();
  
  // Novo: Status da Assinatura
  const { status: subscriptionStatus, endDate, loading: loadingSubscription } = useSubscriptionStatus();
  
  // Novo: Notificações (apenas para Proprietário/Admin)
  const { notifications, unreadCount, loading: loadingNotifications, markAllAsRead } = useNotifications();

  const location = useLocation();
  const navigate = useNavigate();

  const isProprietarioOrCompanyAdmin = isProprietario || isCompanyAdmin;
  
  // Rotas que não devem ter sidebar, mesmo para Proprietários/Admins
  const excludedPaths = ['/', '/login', '/signup', '/reset-password', '/profile', '/register-company', '/agendar', '/meus-agendamentos', '/admin-dashboard'];
  
  // Buscar menus dinamicamente baseado no plano e permissões
  const { menuItems: dynamicMenuItems, loading: loadingMenus } = useMenuItems();
  
  // Define se estamos em uma rota de aplicação que deve ter sidebar
  // Sidebar aparece para: 
  // - Proprietários/Admins (sempre)
  // - Colaboradores (se tiver menus dinâmicos OU ainda está carregando menus)
  const hasMenusForCollaborator = isCollaborator && (dynamicMenuItems.length > 0 || loadingMenus);
  const isAppPath = (isProprietarioOrCompanyAdmin || hasMenusForCollaborator) && 
    !excludedPaths.some(path => location.pathname.startsWith(path) && location.pathname.length === path.length);
  
  console.log('[MainApplication] Sidebar visibility:', {
    isProprietarioOrCompanyAdmin,
    isCollaborator,
    dynamicMenuItemsCount: dynamicMenuItems.length,
    loadingMenus,
    hasMenusForCollaborator,
    isAppPath,
    currentPath: location.pathname
  });

  // Em telas móveis, mantemos a sidebar recolhida por padrão
  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  }, [isMobile]);

  const handleMenuItemClick = (path: string) => {
    navigate(path);
  };

  // Usar menus dinâmicos se disponíveis, caso contrário usar estáticos (fallback)
  const menuItemsToUse = dynamicMenuItems.length > 0 
    ? dynamicMenuItems.map(menu => ({
        id: menu.menu_key,
        label: menu.label,
        icon: menu.icon,
        path: menu.path,
      }))
    : staticMenuItems;

  console.log('[MainApplication] Menus para renderizar:', {
    dynamicMenuItemsCount: dynamicMenuItems.length,
    menuItemsToUseCount: menuItemsToUse.length,
    menuKeys: menuItemsToUse.map(m => m.id),
    dynamicMenuItems: dynamicMenuItems.map(m => ({ key: m.menu_key, label: m.label, path: m.path }))
  });

  const finalMenuItems = menuItemsToUse
    .filter(item => {
      // Se estamos usando menus dinâmicos, já foram filtrados pelo hook
      if (dynamicMenuItems.length > 0) {
        // Apenas aplicar transformações de path se necessário
        return true;
      }
      
      // Filtrar itens estáticos com restrição de roles (comportamento antigo)
      if (item.roles && item.roles.length > 0) {
        // Se o item for 'Mensagens WhatsApp', filtrar com a nova condição
        if (item.id === 'mensagens-whatsapp') {
          return isProprietario && companyDetails?.whatsapp_messaging_enabled;
        }
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
      // Aplicar transformações de path (ex: adicionar companyId)
      // Verificar se é o menu de agendamentos (por id ou path)
      const isAgendamentosMenu = item.id === 'agendamentos' || 
                                 item.path?.includes('/agendamentos');
      
      if (isAgendamentosMenu && primaryCompanyId) {
        // Se o path já contém :companyId, substituir pelo ID real
        if (item.path?.includes(':companyId')) {
          return { ...item, path: item.path.replace(':companyId', primaryCompanyId) };
        }
        // Se o path é apenas /agendamentos, adicionar o companyId
        if (item.path === '/agendamentos' || item.path === '/agendamentos/') {
          return { ...item, path: `/agendamentos/${primaryCompanyId}` };
        }
        // Se o path já tem um ID mas não é o companyId correto, substituir
        const pathMatch = item.path?.match(/^\/agendamentos\/([^/]+)/);
        if (pathMatch) {
        return { ...item, path: `/agendamentos/${primaryCompanyId}` };
        }
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
  if (sessionLoading || loadingProprietarioCheck || loadingCompanyAdminCheck || loadingGlobalAdminCheck || loadingClientCheck || loadingCollaboratorCheck || loadingSubscription || loadingCompanyDetails || loadingMenus) {
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
          <aside
            className={`bg-gray-900 text-white transition-all duration-300 ${
              isMobile
                ? sidebarCollapsed
                  ? 'hidden'
                  : 'fixed inset-y-16 left-0 w-64 z-40'
                : sidebarCollapsed
                  ? 'w-16'
                  : 'w-64'
            } min-h-full`}
          >
            <nav className="p-4">
              <ul className="space-y-2">
                {(() => {
                  console.log('[MainApplication] Renderizando sidebar com', finalMenuItems.length, 'menus:', finalMenuItems.map(m => ({ id: m.id, label: m.label, path: m.path })));
                  return null;
                })()}
                {finalMenuItems.length === 0 && !loadingMenus && (
                  <li className="text-gray-400 text-sm p-3">
                    Nenhum menu disponível
                  </li>
                )}
                {finalMenuItems.map((item) => {
                  // Verificar se o pathname corresponde ao item (considerando sub-rotas)
                  const isActive = location.pathname === item.path || 
                                   location.pathname.startsWith(item.path + '/');
                  
                  return (
                  <li key={item.id}>
                    <Link
                      to={item.path}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors cursor-pointer ${
                          isActive
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
                  );
                })}
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