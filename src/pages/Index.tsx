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

    if (sessionLoading || loadingRoles) {
      console.log('IndexPage: Session or Roles still loading, returning.');
      return;
    }

    if (!session) {
      console.log('IndexPage: No session, rendering LandingPage (public).');
      return; 
    }

    // Se chegou aqui, o usuário está logado e os papéis foram carregados.
    if (isGlobalAdmin) {
      console.log('IndexPage: User is GLOBAL_ADMIN, redirecting to /admin-dashboard');
      navigate('/admin-dashboard', { replace: true });
    } else if (isProprietario || isCompanyAdmin) {
      console.log('IndexPage: User is Proprietario or CompanyAdmin, redirecting to /dashboard');
      navigate('/dashboard', { replace: true });
    } else if (isClient) {
      console.log('IndexPage: User is a pure client, rendering LandingPage (for company selection or /agendar if target set).');
      // If client, we let the component render the LandingPage, which handles the CompanySelectionModal.
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

  // Se não estiver logado, ou se estiver logado como cliente puro, renderiza a LandingPage.
  if (!session || isClient) {
    return <LandingPage />;
  }
  
  // Fallback para o caso de o useEffect ter terminado, mas o redirecionamento ainda não ter ocorrido
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-700">Redirecionando...</p>
    </div>
  );
};

export default IndexPage;