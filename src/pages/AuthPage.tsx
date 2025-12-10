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
import { supabase } from '@/integrations/supabase/client'; // Importar supabase

const AuthPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  console.log('AuthPage - Render - window.location.href:', window.location.href);
  console.log('AuthPage - Render - window.location.hash:', window.location.hash);
  console.log('AuthPage - Render - window.location.search:', window.location.search);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('AuthPage - onAuthStateChange event:', event, 'session:', session);
      if (event === 'PASSWORD_RECOVERY') {
        setIsResettingPassword(true);
        console.log('AuthPage useEffect - Setting isResettingPassword to TRUE via PASSWORD_RECOVERY event');
      } else {
        // Se o evento não for PASSWORD_RECOVERY, e a URL não indicar reset, garantir que o estado seja falso
        const params = new URLSearchParams(location.hash.substring(1) || location.search);
        const type = params.get('type');
        if (type !== 'recovery') {
          setIsResettingPassword(false);
          console.log('AuthPage useEffect - Setting isResettingPassword to FALSE');
        }
      }
    });

    // Initial check for hash/query params in case onAuthStateChange doesn't fire immediately
    const params = new URLSearchParams(location.hash.substring(1) || location.search);
    const type = params.get('type');
    if (type === 'recovery') {
      setIsResettingPassword(true);
      console.log('AuthPage useEffect - Setting isResettingPassword to TRUE via URL params');
    }

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [location.hash, location.search]); // Depend on both hash and search

  const pageTitle = isResettingPassword
    ? 'Defina Sua Nova Senha'
    : location.pathname === '/signup'
      ? 'Cadastre-se no TipoAgenda'
      : 'Bem-vindo ao AgendaFácil';

  const renderAuthForm = () => {
    if (isResettingPassword) {
      return <ResetPasswordForm />;
    } else if (location.pathname === '/signup') {
      return <SignupForm />;
    } else if (location.pathname === '/reset-password') {
      return <ForgotPasswordForm />;
    } else {
      return <LoginForm />;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <CardHeader className="relative flex flex-row items-center justify-center">
          <div className="flex flex-col items-center w-full">
            {(location.pathname === '/signup' || location.pathname === '/reset-password') && !isResettingPassword && (
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