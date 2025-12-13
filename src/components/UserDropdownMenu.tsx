import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useIsCompanyAdmin } from '@/hooks/useIsCompanyAdmin';
import { useIsProprietario } from '@/hooks/useIsProprietario';
import { useIsGlobalAdmin } from '@/hooks/useIsGlobalAdmin';
import { useIsClient } from '@/hooks/useIsClient';

interface UserDropdownMenuProps {
  session: Session | null;
}

const UserDropdownMenu: React.FC<UserDropdownMenuProps> = ({ session }) => {
  const navigate = useNavigate();
  const user = session?.user;
  const userEmail = user?.email || 'Usuário';
  const userName = user?.user_metadata?.first_name || userEmail;
  const { isCompanyAdmin, loadingCompanyAdminCheck } = useIsCompanyAdmin();
  const { isProprietario, loadingProprietarioCheck } = useIsProprietario();
  const { isGlobalAdmin, loadingGlobalAdminCheck } = useIsGlobalAdmin();
  const { isClient, loadingClientCheck } = useIsClient();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError('Erro ao fazer logout: ' + error.message);
    } else {
      // O redirecionamento para a Landing Page será tratado pelo SessionContextProvider
      // showSuccess('Logout realizado com sucesso!'); // O SessionContextProvider já exibe este toast
    }
  };

  const isProprietarioOrCompanyAdmin = isProprietario || isCompanyAdmin;
  const isAnyAdminRole = isGlobalAdmin || isProprietarioOrCompanyAdmin;
  
  // Novo cálculo: O usuário é um cliente puro (não Proprietário/Admin/GlobalAdmin)
  const isPureClient = isClient && !isAnyAdminRole;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex flex-col items-center gap-1 !rounded-button cursor-pointer px-3 py-2">
          <Menu className="h-5 w-5" />
          <span className="text-xs text-gray-700">{userName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span>{userName}</span>
            <span className="text-xs text-gray-500">{userEmail}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/profile')}>
          <i className="fas fa-user mr-2"></i>
          Meu Perfil
        </DropdownMenuItem>
        
        {/* Link para Dashboard Admin Global (Apenas Admin Global) */}
        {!loadingGlobalAdminCheck && isGlobalAdmin && (
          <DropdownMenuItem onClick={() => navigate('/admin-dashboard')}>
            <i className="fas fa-user-shield mr-2"></i> {/* Ícone para Admin Global */}
            Dashboard Admin Global
          </DropdownMenuItem>
        )}

        {/* Link para Dashboard (Proprietário/Admin da Empresa) */}
        {!loadingProprietarioCheck && !loadingCompanyAdminCheck && isProprietarioOrCompanyAdmin && (
          <DropdownMenuItem onClick={() => navigate('/dashboard')}>
            <i className="fas fa-chart-line mr-2"></i>
            Dashboard
          </DropdownMenuItem>
        )}

        {/* Link para Meus Agendamentos (Apenas Cliente Puro) */}
        {!loadingClientCheck && isPureClient && (
          <DropdownMenuItem onClick={() => navigate('/meus-agendamentos')}>
            <i className="fas fa-calendar-check mr-2"></i>
            Meus Agendamentos
          </DropdownMenuItem>
        )}

        {/* Link para Cadastro de Empresa (Visível se NÃO for Proprietário/Admin da Empresa E NÃO for Admin Global) */}
        {!loadingProprietarioCheck && !loadingCompanyAdminCheck && !loadingGlobalAdminCheck && !isAnyAdminRole && (
          <DropdownMenuItem onClick={() => navigate('/register-company')}>
            <i className="fas fa-building mr-2"></i>
            Cadast. Empresa
          </DropdownMenuItem>
        )}

        {/* Link para Configurações da Empresa (AGORA APENAS PARA ADMIN GLOBAL) */}
        {!loadingGlobalAdminCheck && isGlobalAdmin && (
          <DropdownMenuItem onClick={() => navigate('/admin-dashboard')}>
            <i className="fas fa-cog mr-2"></i>
            Configurações Globais
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <i className="fas fa-sign-out-alt mr-2"></i>
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserDropdownMenu;