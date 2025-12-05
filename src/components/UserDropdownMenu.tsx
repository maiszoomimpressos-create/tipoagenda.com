import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button"; // Importar Button
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react'; // Importar o ícone de hambúrguer

interface UserDropdownMenuProps {
  session: Session | null;
}

const UserDropdownMenu: React.FC<UserDropdownMenuProps> = ({ session }) => {
  const navigate = useNavigate();
  const user = session?.user;
  const userEmail = user?.email || 'Usuário';
  const userName = user?.user_metadata?.first_name || userEmail;

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError('Erro ao fazer logout: ' + error.message);
    } else {
      navigate('/login');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 !rounded-button cursor-pointer">
          <Menu className="h-5 w-5" /> {/* Ícone de hambúrguer */}
          <span className="hidden md:inline-block text-gray-700">{userName}</span> {/* Exibe o nome ou email */}
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