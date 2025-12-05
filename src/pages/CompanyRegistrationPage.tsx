import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const CompanyRegistrationPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <CardHeader className="relative flex flex-row items-center justify-center">
          <div className="flex flex-col items-center w-full">
            <Button
              variant="ghost"
              className="absolute left-0 top-0 !rounded-button whitespace-nowrap"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Cadastro de Empresa
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-gray-700 dark:text-gray-300">
            Esta é a página de cadastro da sua empresa. Em breve, você poderá adicionar todos os detalhes do seu negócio aqui!
          </p>
          <Button asChild className="w-full !rounded-button whitespace-nowrap bg-yellow-600 hover:bg-yellow-700 text-black">
            <Link to="/">Ir para a Página Inicial</Link>
          </Button>
          <Button className="w-full !rounded-button whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white">
            <i className="fas fa-building mr-2"></i> {/* Ícone de empresa */}
            Iniciar Cadastro
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyRegistrationPage;