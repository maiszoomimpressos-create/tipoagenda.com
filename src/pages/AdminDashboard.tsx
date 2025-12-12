import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';
import { useIsGlobalAdmin } from '@/hooks/useIsGlobalAdmin';
import ContractList from '@/components/ContractList'; // Import ContractList
import { PlusCircle, Edit, Trash2, ArrowLeft, Tags } from 'lucide-react'; // Import icons

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
            <i className="fas fa-sign-out-alt mr-2"></i>
            Sair
          </Button>
        </div>

        <p className="text-lg text-gray-700 dark:text-gray-300">
          Bem-vindo, Administrador Global! Aqui você pode gerenciar as configurações de alto nível do sistema.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Gerenciar Usuários</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                Visualize e edite todos os usuários do sistema, incluindo seus papéis e status.
              </p>
              <Button className="!rounded-button whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white w-full">
                <i className="fas fa-users mr-2"></i>
                Acessar Gerenciamento de Usuários
              </Button>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Gerenciar Empresas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                Revise, aprove e gerencie todas as empresas cadastradas na plataforma.
              </p>
              <Button className="!rounded-button whitespace-nowrap bg-green-600 hover:bg-green-700 text-white w-full">
                <i className="fas fa-building mr-2"></i>
                Acessar Gerenciamento de Empresas
              </Button>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Configurações do Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                Ajuste configurações globais, como termos de serviço, políticas e integrações.
              </p>
              <Button className="!rounded-button whitespace-nowrap bg-purple-600 hover:bg-purple-700 text-white w-full">
                <i className="fas fa-cogs mr-2"></i>
                Acessar Configurações Globais
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Moved sections from SettingsPage */}
        <div className="max-w-4xl space-y-6">
          <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-gray-900 dark:text-white">Gerenciamento de Contratos</CardTitle>
              <Button
                className="!rounded-button whitespace-nowrap bg-yellow-600 hover:bg-yellow-700 text-black"
                onClick={() => navigate('/admin-dashboard/new-contract')}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Novo Contrato
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                Crie e gerencie modelos de contratos para sua empresa.
              </p>
              <ContractList />
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-gray-900 dark:text-white">Gerenciamento de Segmentos</CardTitle>
              <Button
                className="!rounded-button whitespace-nowrap bg-green-600 hover:bg-green-700 text-white"
                onClick={() => navigate('/admin-dashboard/segments')}
              >
                <Tags className="h-4 w-4 mr-2" />
                Gerenciar Segmentos
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300">
                Defina e organize os tipos de segmentos para as empresas cadastradas.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;