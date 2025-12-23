"use client";

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LoginForm from '@/components/LoginForm';
import SignupForm from '@/components/SignupForm';
import ForgotPasswordForm from '@/components/ForgotPasswordForm';
import ResetPasswordForm from '@/components/ResetPasswordForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
// Não precisamos mais do supabase aqui para o estado isResettingPassword

const AuthPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Removendo o estado isResettingPassword daqui, será gerenciado pelo ResetPasswordForm

  console.log('AuthPage - Render - window.location.href:', window.location.href);
  console.log('AuthPage - Render - window.location.hash:', window.location.hash);
  console.log('AuthPage - Render - window.location.search:', window.location.search);

  // O título da página agora depende apenas do pathname
  const pageTitle = location.pathname === '/signup'
    ? 'Cadastre-se no TipoAgenda'
    : location.pathname === '/reset-password'
      ? 'Redefinir Senha' // Título genérico, o ResetPasswordForm vai ajustar se for o caso
      : 'Bem-vindo ao TipoAgenda';

  const renderAuthForm = () => {
    if (location.pathname === '/signup') {
      return <SignupForm />;
    } else if (location.pathname === '/reset-password') {
      return <ResetPasswordForm />; // Sempre renderiza ResetPasswordForm nesta rota
    } else {
      return <LoginForm />;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <CardHeader className="relative flex flex-row items-center justify-center">
          <div className="flex flex-col items-center w-full">
            {(location.pathname === '/signup' ||
              location.pathname === '/reset-password' ||
              location.pathname === '/'
            ) && (
              <Button
                variant="ghost"
                className="absolute left-0 top-0 !rounded-button whitespace-nowrap"
                onClick={() => navigate((location.pathname === '/signup' || location.pathname === '/') ? '/' : -1)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            )}
            <CardTitle
              className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4 cursor-pointer"
              onClick={() => navigate('/')}
            >
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