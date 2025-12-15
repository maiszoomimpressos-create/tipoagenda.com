import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';
import { useIsGlobalAdmin } from '@/hooks/useIsGlobalAdmin';
import { Users, Building, DollarSign, FileText, Tags, LogOut, Key, MailCheck } from 'lucide-react'; // Importando Key e MailCheck
import RecentAuditLogs from '@/components/RecentAuditLogs'; // Importar novo componente

// Componente auxiliar para padronizar os cards de gerenciamento
interface ManagementCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  buttonText: string;
  buttonColor: string;
  onClick: () => void;
}

const ManagementCard: React.FC<ManagementCardProps> = ({ title, description, icon, buttonText, buttonColor, onClick }) => (
  <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800 flex flex-col justify-between">
    <CardHeader>
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <CardTitle className="text-gray-900 dark:text-white text-xl">{title}</CardTitle>
      </div>
      <p className="text-gray-700 dark:text-gray-300 text-sm">{description}</p>
    </CardHeader>
    <CardContent>
      <Button 
        className={`!rounded-button whitespace-nowrap w-full text-white font-semibold py-2.5 text-base ${buttonColor}`}
        onClick={onClick}
      >
        {buttonText}
      </Button>
    </CardContent>
  </Card>
);


const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();
  const { isGlobalAdmin, loadingGlobalAdminCheck } = useIsGlobalAdmin();

  useEffect(() => {
    if (!sessionLoading && !loadingGlobalAdminCheck) {
      if (!session || !isGlobalAdmin) {
        showError('Acesso negado. Você não é um administrador global.');
        navigate('/', { replace: true }); // Redirect to home if not global admin
      }
    }
  }, [session, sessionLoading, isGlobalAdmin, loadingGlobalAdminCheck, navigate]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError('Erro ao fazer logout: ' + error.message);
    } else {
      // Redirecionamento será tratado pelo SessionContextProvider
    }
  };

  if (sessionLoading || loadingGlobalAdminCheck) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-700 dark:text-gray-300">Carregando painel de administrador...</p>
      </div>
    );
  }

  if (!isGlobalAdmin) {
    return null; // Should be redirected by useEffect, but a safe fallback
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Dashboard do Administrador Global</h1>
          <Button
            onClick={handleLogout}
            className="!rounded-button whitespace-nowrap bg-red-600 hover:bg-red-700 text-white"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>

        <p className="text-lg text-gray-700 dark:text-gray-300">
          Bem-vindo, Administrador Global! Aqui você pode gerenciar as configurações de alto nível do sistema.
        </p>

        {/* Group Box: Gerenciamento Principal */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ManagementCard
            title="Gerenciar Usuários"
            description="Visualize e edite todos os usuários do sistema, incluindo seus papéis e status."
            icon={<Users className="h-6 w-6 text-blue-600" />}
            buttonText="Acessar Gerenciamento de Usuários"
            buttonColor="bg-blue-600 hover:bg-blue-700"
            onClick={() => navigate('/admin-dashboard/users')}
          />

          <ManagementCard
            title="Gerenciar Empresas"
            description="Revise, aprove e gerencie todas as empresas cadastradas na plataforma."
            icon={<Building className="h-6 w-6 text-green-600" />}
            buttonText="Acessar Gerenciamento de Empresas"
            buttonColor="bg-green-600 hover:bg-green-700"
            onClick={() => navigate('/admin-dashboard/companies')}
          />

          <ManagementCard
            title="Gerenciar Planos"
            description="Defina e edite os planos de assinatura disponíveis para as empresas."
            icon={<DollarSign className="h-6 w-6 text-yellow-600" />}
            buttonText="Gerenciar Planos"
            buttonColor="bg-yellow-600 hover:bg-yellow-700 text-black"
            onClick={() => navigate('/admin-dashboard/plans')}
          />
        </div>

        {/* Group Box: Configurações Globais */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white pt-4">Configurações Globais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ManagementCard
            title="Gerenciamento de Contratos"
            description="Crie e gerencie modelos de contratos que as empresas devem aceitar no cadastro."
            icon={<FileText className="h-6 w-6 text-purple-600" />}
            buttonText="Gerenciar Contratos"
            buttonColor="bg-purple-600 hover:bg-purple-700"
            onClick={() => navigate('/admin-dashboard/contracts')}
          />

          <ManagementCard
            title="Gerenciamento de Segmentos"
            description="Defina e organize os tipos de segmentos para as empresas cadastradas."
            icon={<Tags className="h-6 w-6 text-pink-600" />}
            buttonText="Gerenciar Segmentos"
            buttonColor="bg-pink-600 hover:bg-pink-700"
            onClick={() => navigate('/admin-dashboard/segments')}
          />
          
          <ManagementCard
            title="Solicitações de Contato"
            description="Visualize e gerencie as solicitações de contato enviadas por visitantes da Landing Page."
            icon={<MailCheck className="h-6 w-6 text-orange-600" />}
            buttonText="Ver Solicitações"
            buttonColor="bg-orange-600 hover:bg-orange-700"
            onClick={() => navigate('/admin-dashboard/contact-requests')}
          />
          
          <ManagementCard
            title="Gerenciamento de Chaves de Pagamento"
            description="Configure chaves de API de pagamento (Mercado Pago, etc.) de forma segura via Supabase Secrets."
            icon={<Key className="h-6 w-6 text-gray-600" />}
            buttonText="Configurar Chaves"
            buttonColor="bg-gray-600 hover:bg-gray-700"
            onClick={() => navigate('/admin-dashboard/api-keys')}
          />
        </div>
        
        {/* Logs de Auditoria Recentes */}
        <RecentAuditLogs />
      </div>
    </div>
  );
};

export default AdminDashboard;