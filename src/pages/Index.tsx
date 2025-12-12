import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';
import { useIsProprietario } from '@/hooks/useIsProprietario';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useIsClient } from '@/hooks/useIsClient';
import LandingPage from './LandingPage';

const IndexPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();
  const { isProprietario, loadingProprietarioCheck } = useIsProprietario();
  const { isAdmin, loadingAdminCheck } = useIsAdmin();
  const { isClient, loadingClientCheck } = useIsClient();

  const loadingRoles = loadingProprietarioCheck || loadingAdminCheck || loadingClientCheck;

  useEffect(() => {
    if (sessionLoading) {
      return;
    }

    if (!session) {
      // If not logged in, show the public landing page
      return; 
    }

    if (loadingRoles) {
      return;
    }

    const isProprietarioOrAdmin = isProprietario || isAdmin;

    if (isProprietarioOrAdmin) {
      // If user is Proprietario or Admin, redirect to the main dashboard
      navigate('/dashboard', { replace: true });
    } else if (isClient) {
      // If user is a pure client, they stay on the LandingPage to select a company for booking
      // The LandingPage component handles the CompanySelectionModal logic.
      // We do nothing here, allowing the LandingPage component to render below.
    } else {
      // If logged in but no specific role (e.g., new user who hasn't registered a company yet)
      // Redirect to the company registration page.
      navigate('/register-company', { replace: true });
    }
  }, [session, sessionLoading, loadingRoles, isProprietario, isAdmin, isClient, navigate]);

  if (sessionLoading || (session && loadingRoles)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">Verificando permissões...</p>
      </div>
    );
  }

  // If not logged in, or if logged in as a pure client, render the LandingPage
  return <LandingPage />;
};

export default IndexPage;