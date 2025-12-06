import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          className="!rounded-button cursor-pointer"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Configurações do Administrador</h1>
      </div>
      <div className="max-w-4xl">
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">Gerenciamento de Usuários e Empresas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              Esta seção é dedicada a configurações avançadas e gerenciamento de usuários e empresas.
              Apenas administradores têm acesso a estas funcionalidades.
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Gerenciar permissões de usuários</li>
              <li>Adicionar ou remover empresas</li>
              <li>Visualizar logs de auditoria</li>
              <li>Configurações globais da plataforma</li>
            </ul>
            <Button className="!rounded-button whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white">
              <i className="fas fa-users-cog mr-2"></i>
              Ir para Gerenciamento
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;