import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';
import { useIsProprietario } from '@/hooks/useIsProprietario';
import { useIsCompanyAdmin } from '@/hooks/useIsCompanyAdmin'; // Renamed hook
import { useIsGlobalAdmin } from '@/hooks/useIsGlobalAdmin'; // New hook
import { useIsClient } from '@/hooks/useIsClient';
import LandingPage from './LandingPage';

const IndexPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();
  const { isProprietario, loadingProprietarioCheck } = useIsProprietario();
  const { isCompanyAdmin, loadingCompanyAdminCheck } = useIsCompanyAdmin(); // Renamed hook
  const { isGlobalAdmin, loadingGlobalAdminCheck } = useIsGlobalAdmin(); // New hook
  const { isClient, loadingClientCheck } = useIsClient();

  const loadingRoles = loadingProprietarioCheck || loadingCompanyAdminCheck || loadingGlobalAdminCheck || loadingClientCheck;

  useEffect(() => {
    console.log('IndexPage useEffect - sessionLoading:', sessionLoading, 'loadingRoles:', loadingRoles);
    console.log('IndexPage useEffect - isGlobalAdmin:', isGlobalAdmin, 'isProprietario:', isProprietario, 'isCompanyAdmin:', isCompanyAdmin, 'isClient:', isClient);

    if (sessionLoading) {
      console.log('IndexPage: Session still loading, returning.');
      return;
    }

    if (!session) {
      console.log('IndexPage: No session, rendering LandingPage (public).');
      return; 
    }

    if (loadingRoles) {
      console.log('IndexPage: Roles still loading, returning.');
      return;
    }

    if (isGlobalAdmin) {
      console.log('IndexPage: User is GLOBAL_ADMIN, redirecting to /admin-dashboard');
      navigate('/admin-dashboard', { replace: true });
    } else if (isProprietario || isCompanyAdmin) {
      console.log('IndexPage: User is Proprietario or CompanyAdmin, redirecting to /dashboard');
      navigate('/dashboard', { replace: true });
    } else if (isClient) {
      console.log('IndexPage: User is a pure client, rendering LandingPage (for company selection or /agendar if target set).');
      // The LandingPage component handles the CompanySelectionModal logic.
      // If a target company was set before login, SessionContextProvider would have redirected to /agendar.
      // If not, LandingPage will show the company selection modal.
    } else {
      console.log('IndexPage: Logged in but no specific role, redirecting to /register-company');
      navigate('/register-company', { replace: true });
    }
  }, [session, sessionLoading, loadingRoles, isGlobalAdmin, isProprietario, isCompanyAdmin, isClient, navigate]);

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