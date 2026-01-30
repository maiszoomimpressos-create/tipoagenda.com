/**
 * Página Index - Roteamento baseado em roles de usuário
 * 
 * ROTINA BLINDADA - NÃO ALTERAR SEM AUTORIZAÇÃO
 * 
 * Esta página é responsável por redirecionar usuários logados para suas respectivas dashboards
 * baseado em seus roles. A ordem de prioridade é:
 * 1. Proprietário -> /dashboard (MÁXIMA PRIORIDADE)
 * 2. Global Admin -> /admin-dashboard
 * 3. Company Admin -> /dashboard
 * 4. Colaborador -> /colaborador/agendamentos
 * 5. Cliente -> /meus-agendamentos
 * 
 * Usuários sem sessão ou sem role definido permanecem na LandingPage.
 */
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';
import { useIsProprietario } from '@/hooks/useIsProprietario';
import { useIsCompanyAdmin } from '@/hooks/useIsCompanyAdmin';
import { useIsGlobalAdmin } from '@/hooks/useIsGlobalAdmin';
import { useIsClient } from '@/hooks/useIsClient';
import { useIsCollaborator } from '@/hooks/useIsCollaborator';
import LandingPage from './LandingPage';

const IndexPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();
  const { isProprietario, loadingProprietarioCheck } = useIsProprietario();
  const { isCompanyAdmin, loadingCompanyAdminCheck } = useIsCompanyAdmin();
  const { isGlobalAdmin, loadingGlobalAdminCheck } = useIsGlobalAdmin();
  const { isClient, loadingClientCheck } = useIsClient();
  const { isCollaborator, loading: loadingCollaboratorCheck } = useIsCollaborator();
  const loadingRoles = loadingProprietarioCheck || loadingCompanyAdminCheck || loadingGlobalAdminCheck || loadingClientCheck || loadingCollaboratorCheck;
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    // VALIDAÇÃO 1: Aguardar sessão carregar
    if (sessionLoading) {
      return;
    }

    // VALIDAÇÃO 2: Se não tem sessão, renderizar LandingPage (público)
    if (!session) {
      hasRedirectedRef.current = false;
      return; 
    }

    // VALIDAÇÃO 3: Aguardar até que TODOS os roles terminem de carregar
    // CRÍTICO: Não redirecionar antes de ter certeza dos roles
    if (loadingRoles) {
      return;
    }

    // Proteção contra múltiplos redirecionamentos
    if (hasRedirectedRef.current) {
      return;
    }

    // PRIORIDADE 1: PROPRIETÁRIO (MÁXIMA PRIORIDADE - SEMPRE redirecionar para /dashboard)
    if (isProprietario === true) {
      console.log('[IndexPage] PROPRIETÁRIO detectado - redirecionando para /dashboard');
      hasRedirectedRef.current = true;
      navigate('/dashboard', { replace: true });
      return;
    }

    // PRIORIDADE 2: Global Admin
    if (isGlobalAdmin === true) {
      console.log('[IndexPage] GLOBAL_ADMIN detectado - redirecionando para /admin-dashboard');
      hasRedirectedRef.current = true;
      navigate('/admin-dashboard', { replace: true });
      return;
    }

    // PRIORIDADE 3: Company Admin
    if (isCompanyAdmin === true) {
      console.log('[IndexPage] CompanyAdmin detectado - redirecionando para /dashboard');
      hasRedirectedRef.current = true;
      navigate('/dashboard', { replace: true });
      return;
    }

    // PRIORIDADE 4: Colaborador
    if (isCollaborator === true) {
      console.log('[IndexPage] COLABORADOR detectado - redirecionando para /colaborador/agendamentos');
      hasRedirectedRef.current = true;
      navigate('/colaborador/agendamentos', { replace: true });
      return;
    }

    // PRIORIDADE 5: Cliente
    if (isClient === true) {
      console.log('[IndexPage] Cliente detectado - redirecionando para /meus-agendamentos');
      hasRedirectedRef.current = true;
      navigate('/meus-agendamentos', { replace: true });
      return;
    }

    // Se chegou aqui, usuário está logado mas não tem role definido
    // Não redirecionar automaticamente - deixar na LandingPage
    console.log('[IndexPage] Usuário logado mas sem role definido - permanecendo na LandingPage');
    hasRedirectedRef.current = false;
  }, [session, sessionLoading, loadingRoles, isGlobalAdmin, isProprietario, isCompanyAdmin, isClient, isCollaborator, navigate]);

  // Reset do flag quando a sessão mudar
  useEffect(() => {
    if (!session) {
      hasRedirectedRef.current = false;
    }
  }, [session]);

  // Se está carregando sessão ou roles, mostrar loading
  if (sessionLoading || (session && loadingRoles)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">Verificando permissões...</p>
      </div>
    );
  }

  // Se usuário está logado e é PROPRIETÁRIO, NUNCA renderizar LandingPage
  // Mostrar "Redirecionando..." enquanto o navigate executa
  if (session && !loadingRoles && isProprietario) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">Redirecionando para dashboard...</p>
      </div>
    );
  }

  // Se usuário está logado e tem outro papel definido, aguardar redirecionamento
  if (session && !loadingRoles && (isGlobalAdmin || isCompanyAdmin || isClient || isCollaborator)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">Redirecionando...</p>
      </div>
    );
  }

  // Se não tem sessão OU tem sessão mas não tem papel definido, renderizar LandingPage
  return <LandingPage />;
};

export default IndexPage;