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
            // Check if the user is a client (by checking type_user table)
            const { data: typeData, error: typeError } = await supabase
              .from('type_user')
              .select('cod')
              .eq('user_id', currentSession.user.id)
              .single();

            if (typeError && typeError.code !== 'PGRST116') {
              console.error('Error checking user type for redirection:', typeError);
              showError('Erro ao verificar seu tipo de usuário.');
              navigate('/', { replace: true });
              return;
            }

            if (typeData?.cod === 'CLIENTE') {
              // If they are a client AND they clicked a company card, redirect to the client appointment page
              // The ClientAppointmentForm will pick up the targetCompanyId from localStorage
              navigate('/agendar', { replace: true });
              // Note: We clear the ID inside the ClientAppointmentForm/Page logic 
              // once the company context is established, to handle cases where the client might navigate away.
              return;
            } else {
              // If they are signed in but are not a client (e.g., Proprietario/Admin), clear the target ID
              // and redirect to the default dashboard.
              clearTargetCompanyId();
              navigate('/dashboard', { replace: true });
              return;
            }
          }
          
          // Default redirection if no target company ID is set
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