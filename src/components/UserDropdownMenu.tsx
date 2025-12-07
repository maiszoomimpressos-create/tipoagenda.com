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
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useIsProprietario } from '@/hooks/useIsProprietario'; // Import the new hook

interface UserDropdownMenuProps {
  session: Session | null;
}

const UserDropdownMenu: React.FC<UserDropdownMenuProps> = ({ session }) => {
  const navigate = useNavigate();
  const user = session?.user;
  const userEmail = user?.email || 'Usuário';
  const userName = user?.user_metadata?.first_name || userEmail;
  const { isAdmin, loadingAdminCheck } = useIsAdmin();
  const { isProprietario, loadingProprietarioCheck } = useIsProprietario(); // Use the new hook

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError('Erro ao fazer logout: ' + error.message);
    } else {
      // O redirecionamento para a Landing Page será tratado pelo SessionContextProvider
      // showSuccess('Logout realizado com sucesso!'); // O SessionContextProvider já exibe este toast
    }
  };

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
        <DropdownMenuItem onClick={() => navigate('/register-company')}>
          <i className="fas fa-building mr-2"></i>
          Cadast. Empresa
        </DropdownMenuItem>
        {!loadingProprietarioCheck && isProprietario && ( // Conditionally render if user is Proprietário
          <DropdownMenuItem onClick={() => navigate('/dashboard')}>
            <i className="fas fa-chart-line mr-2"></i>
            Dashboard
          </DropdownMenuItem>
        )}
        {!loadingAdminCheck && isAdmin && ( // Conditionally render if user is admin
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