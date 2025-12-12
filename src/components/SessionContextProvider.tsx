import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { getTargetCompanyId, clearTargetCompanyId } from '@/utils/storage'; // Import storage utils
import { useIsClient } from '@/hooks/useIsClient'; // Import useIsClient
import { useIsProprietario } from '@/hooks/useIsProprietario'; // Import useIsProprietario
import { useIsAdmin } from '@/hooks/useIsAdmin'; // Import useIsAdmin

interface SessionContextType {
  session: Session | null;
  loading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Use hooks inside the provider to check roles
  const { isClient, loadingClientCheck } = useIsClient();
  const { isProprietario, loadingProprietarioCheck } = useIsProprietario();
  const { isAdmin, loadingAdminCheck } = useIsAdmin();

  const isLoadingRoles = loadingClientCheck || loadingProprietarioCheck || loadingAdminCheck;
  const hasManagementRole = isProprietario || isAdmin;

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('SessionContextProvider - Auth event:', event, 'Session:', currentSession);
        setSession(currentSession);
        setLoading(false);

        if (event === 'SIGNED_IN' && currentSession) {
          showSuccess('Login realizado com sucesso!');
          
          // Wait for roles to load before deciding redirection
          // Note: The actual redirection logic based on roles is complex to handle perfectly inside onAuthStateChange
          // because the hooks might not have finished fetching the RPC data yet.
          // We rely on the subsequent render cycle (where the hooks finish loading) 
          // or manual navigation if a target company is set.
          
          const targetCompanyId = getTargetCompanyId();
          
          if (targetCompanyId) {
            // If a target company was selected (usually by a client on the landing page)
            // We rely on the ClientProtectedRoute or the next render cycle to handle the final destination.
            // For now, we redirect to /agendar, and the ClientAppointmentForm handles the client context check.
            navigate('/agendar', { replace: true });
            return;
          }
          
          // Default redirection: if no target company, go to the root. 
          // The root page (LandingPage) will handle the next step (show modal or redirect to dashboard).
          navigate('/', { replace: true }); 

        } else if (event === 'SIGNED_OUT') {
          showSuccess('Logout realizado com sucesso!');
          clearTargetCompanyId(); // Clear any pending target company on logout
          navigate('/', { replace: true }); 
        } else if (event === 'PASSWORD_RECOVERY') {
          showSuccess('Verifique seu e-mail para redefinir a senha.');
        } else if (event === 'USER_UPDATED') {
          showSuccess('Seu perfil foi atualizado!');
        } else if (event === 'INITIAL_SESSION') {
          // No toast or navigation needed for initial session
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log('SessionContextProvider - Initial getSession:', initialSession);
      setSession(initialSession);
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]); // Removed role hooks from dependency array to prevent infinite loops

  return (
    <SessionContext.Provider value={{ session, loading }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};