import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { getTargetCompanyId, clearTargetCompanyId } from '@/utils/storage'; // Import storage utils

interface SessionContextType {
  session: Session | null;
  loading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('SessionContextProvider - Auth event:', event, 'Session:', currentSession);
        setSession(currentSession);
        setLoading(false);

        if (event === 'SIGNED_IN' && currentSession) {
          showSuccess('Login realizado com sucesso!');
          
          const targetCompanyId = getTargetCompanyId();
          
          if (targetCompanyId) {
            // If a target company is set, assume the user is trying to book an appointment
            // and redirect them to the client appointment page.
            // The ClientAppointmentForm will handle clearing the targetCompanyId.
            navigate('/agendar', { replace: true });
            return;
          }
          
          // Default redirection if no target company ID is set (assumes admin/proprietario flow or general user)
          // The IndexPage will handle the final decision based on roles if they navigate to /.
          // For direct login, we push to dashboard.
          navigate('/dashboard', { replace: true }); 

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
  }, [navigate]);

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