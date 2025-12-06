import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';

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
        setSession(currentSession);
        setLoading(false);

        if (event === 'SIGNED_IN') {
          showSuccess('Login realizado com sucesso!');
          
          if (currentSession?.user) {
            // Fetch user roles to check for Admin and Proprietário
            const { data: userContext, error } = await supabase
              .rpc('get_user_context', { p_user_id: currentSession.user.id });

            if (error) {
              console.error('Error fetching user context for redirection:', error);
              showError('Erro ao verificar permissões para redirecionamento.');
              navigate('/'); // Default to home on error
            } else if (userContext) {
              const isAdmin = userContext.some(role => role.role_type_description === 'Admin');
              const isProprietario = userContext.some(role => role.role_type_description === 'Proprietário');

              if (isAdmin && isProprietario) {
                navigate('/dashboard'); // Redirect to dashboard if both Admin and Proprietário
              } else {
                navigate('/'); // Default to home page
              }
            } else {
              navigate('/'); // Default to home page if no user context
            }
          } else {
            navigate('/'); // Default to home page if no user session
          }

        } else if (event === 'SIGNED_OUT') {
          showSuccess('Logout realizado com sucesso!');
          navigate('/'); // Redireciona para a Landing Page (Home)
        } else if (event === 'PASSWORD_RECOVERY') {
          showSuccess('Verifique seu e-mail para redefinir a senha.');
          navigate('/reset-password');
        } else if (event === 'USER_UPDATED') {
          showSuccess('Seu perfil foi atualizado!');
        } else if (event === 'INITIAL_SESSION') {
          // Handle initial session, no toast needed
          // If there's an initial session, check roles for potential redirection
          if (currentSession?.user) {
            const { data: userContext, error } = await supabase
              .rpc('get_user_context', { p_user_id: currentSession.user.id });

            if (!error && userContext) {
              const isAdmin = userContext.some(role => role.role_type_description === 'Admin');
              const isProprietario = userContext.some(role => role.role_type_description === 'Proprietário');

              if (isAdmin && isProprietario && location.pathname === '/') { // Only redirect if currently on landing page
                navigate('/dashboard');
              }
            }
          }
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      // Initial session check for redirection if already logged in
      if (session?.user && location.pathname === '/') {
        supabase.rpc('get_user_context', { p_user_id: session.user.id }).then(({ data: userContext, error }) => {
          if (!error && userContext) {
            const isAdmin = userContext.some(role => role.role_type_description === 'Admin');
            const isProprietario = userContext.some(role => role.role_type_description === 'Proprietário');
            if (isAdmin && isProprietario) {
              navigate('/dashboard');
            }
          }
        });
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

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