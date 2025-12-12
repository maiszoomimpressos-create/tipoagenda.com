import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard de Administração da Plataforma</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">Visão Geral da Plataforma</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">
              Aqui você pode monitorar métricas globais, como número total de empresas, usuários e agendamentos.
            </p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">Gerenciamento de Empresas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
              Acesse a lista completa de empresas cadastradas para auditoria e gestão de status.
            </p>
            <Button 
              className="!rounded-button whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => navigate('/settings')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Ir para Configurações
            </Button>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">Logs e Suporte</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">
              Monitore logs de sistema e gerencie tickets de suporte de Proprietários.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardPage;