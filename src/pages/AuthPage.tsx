import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();

  const handleAuthError = (error: Error) => {
    console.error('Auth error:', error);
    showError(error.message || 'Ocorreu um erro na autenticação.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">
          Bem-vindo ao AgendaFácil
        </h2>
        <Auth
          supabaseClient={supabase}
          providers={[]} // No third-party providers requested
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(var(--yellow-600))', // Using a custom yellow from your theme
                  brandAccent: 'hsl(var(--yellow-700))',
                },
              },
            },
          }}
          theme="light" // Or "dark" based on your preference
          redirectTo={window.location.origin + '/'}
          localization={{
            variables: {
              sign_in: {
                email_label: 'Seu e-mail',
                password_label: 'Sua senha',
                email_input_placeholder: 'Digite seu e-mail',
                password_input_placeholder: 'Digite sua senha',
                button_label: 'Entrar',
                social_provider_text: 'Entrar com {{provider}}',
                link_text: 'Já tem uma conta? Entrar',
              },
              sign_up: {
                email_label: 'Seu e-mail',
                password_label: 'Crie uma senha',
                email_input_placeholder: 'Digite seu e-mail',
                password_input_placeholder: 'Crie sua senha',
                button_label: 'Cadastrar',
                social_provider_text: 'Cadastrar com {{provider}}',
                link_text: 'Não tem uma conta? Cadastrar',
              },
              forgotten_password: {
                email_label: 'Seu e-mail',
                email_input_placeholder: 'Digite seu e-mail',
                button_label: 'Enviar instruções de recuperação',
                link_text: 'Esqueceu sua senha?',
              },
              update_password: {
                password_label: 'Nova senha',
                password_input_placeholder: 'Digite sua nova senha',
                button_label: 'Atualizar senha',
              },
            },
          }}
          onError={handleAuthError}
        />
      </div>
    </div>
  );
};

export default AuthPage;