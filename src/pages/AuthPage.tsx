import React from 'react';
import { useLocation } from 'react-router-dom';
import LoginForm from '@/components/LoginForm';
import SignupForm from '@/components/SignupForm';
import ForgotPasswordForm from '@/components/ForgotPasswordForm';

const AuthPage: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

  const renderAuthForm = () => {
    if (path === '/signup') {
      return <SignupForm />;
    } else if (path === '/reset-password') {
      return <ForgotPasswordForm />;
    } else {
      return <LoginForm />;
    }
  };

  const pageTitle = path === '/signup' ? 'Se cadastre no TipoAgenda' : 'Bem-vindo ao AgendaFácil';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">
          {pageTitle}
        </h2>
        {renderAuthForm()}
      </div>
    </div>
  );
};

export default AuthPage;