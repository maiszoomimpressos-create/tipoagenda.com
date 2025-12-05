import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

interface UserDropdownMenuProps {
  session: Session | null;
}

const UserDropdownMenu: React.FC<UserDropdownMenuProps> = ({ session }) => {
  const navigate = useNavigate();
  const user = session?.user;
  const userEmail = user?.email || 'Usuário';
  const userInitials = userEmail.substring(0, 2).toUpperCase();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError('Erro ao fazer logout: ' + error.message);
    } else {
      // showSuccess('Logout realizado com sucesso!'); // Handled by SessionContextProvider
      navigate('/login');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="w-8 h-8 cursor-pointer">
          <AvatarImage src={user?.user_metadata?.avatar_url || ''} alt="User Avatar" />
          <AvatarFallback className="bg-gray-200 text-gray-700">{userInitials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span>{user?.user_metadata?.first_name || userEmail}</span>
            <span className="text-xs text-gray-500">{userEmail}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/profile')}>
          <i className="fas fa-user mr-2"></i>
          Meu Perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <i className="fas fa-cog mr-2"></i>
          Configurações
        </DropdownMenuItem>
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