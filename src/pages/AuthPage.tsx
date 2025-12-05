import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LoginForm from '@/components/LoginForm';
import SignupForm from '@/components/SignupForm';
import ForgotPasswordForm from '@/components/ForgotPasswordForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const AuthPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const pageTitle = path === '/signup' ? 'Cadastre-se no TipoAgenda' : 'Bem-vindo ao AgendaFácil';

  const renderAuthForm = () => {
    if (path === '/signup') {
      return <SignupForm />;
    } else if (path === '/reset-password') {
      return <ForgotPasswordForm />;
    } else {
      return <LoginForm />;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <CardHeader className="relative flex flex-row items-center justify-center">
          {/* Envolvendo o botão e o título em um div para resolver o erro 'React.Children.only' */}
          <div className="flex flex-col items-center w-full">
            {(path === '/signup' || path === '/reset-password') && (
              <Button
                variant="ghost"
                className="absolute left-0 top-0 !rounded-button whitespace-nowrap"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            )}
            <CardTitle className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
              {pageTitle}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {renderAuthForm()}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;