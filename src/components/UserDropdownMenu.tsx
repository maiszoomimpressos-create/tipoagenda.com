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
import { useSession } from './SessionContextProvider'; // Use the unified session hook

interface UserDropdownMenuProps {
  session: Session | null;
}

const UserDropdownMenu: React.FC<UserDropdownMenuProps> = ({ session }) => {
  const navigate = useNavigate();
  const user = session?.user;
  const userEmail = user?.email || 'Usuário';
  const userName = user?.user_metadata?.first_name || userEmail;
  
  // Use the unified session hook to get roles
  const { isAdmin, isProprietario, isClient, loadingRoles } = useSession();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError('Erro ao fazer logout: ' + error.message);
    } else {
      // Redirection handled by SessionContextProvider
    }
  };

  const isProprietarioOrAdmin = isProprietario || isAdmin;
  
  // O usuário é um cliente puro (não Proprietário/Admin)
  const isPureClient = isClient && !isProprietarioOrAdmin;
  
  // O usuário não tem função de gestão (pode ser cliente, ou um usuário novo sem empresa)
  const hasManagementRole = isProprietarioOrAdmin;
  const isLoadingRoles = loadingRoles;

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
        
        {/* Link para Dashboard (Proprietário/Admin) */}
        {!isLoadingRoles && hasManagementRole && (
          <DropdownMenuItem onClick={() => navigate('/dashboard')}>
            <i className="fas fa-chart-line mr-2"></i>
            Dashboard
          </DropdownMenuItem>
        )}

        {/* Link para Meus Agendamentos (Apenas Cliente Puro) */}
        {!isLoadingRoles && isPureClient && (
          <DropdownMenuItem onClick={() => navigate('/meus-agendamentos')}>
            <i className="fas fa-calendar-check mr-2"></i>
            Meus Agendamentos
          </DropdownMenuItem>
        )}

        {/* Link para Cadastro de Empresa (Visível se NÃO tiver função de gestão) */}
        {!isLoadingRoles && !hasManagementRole && (
          <DropdownMenuItem onClick={() => navigate('/register-company')}>
            <i className="fas fa-building mr-2"></i>
            Cadast. Empresa
          </DropdownMenuItem>
        )}

        {/* Link para Configurações Admin (Apenas Admin) */}
        {!isLoadingRoles && isAdmin && (
          <DropdownMenuItem onClick={() => navigate('/settings')}>
            <i className="fas fa-cog mr-2"></i>
            Configurações Admin
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