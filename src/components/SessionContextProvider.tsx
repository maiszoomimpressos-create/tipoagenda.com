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
          // Redirecionar para a Landing Page (Home) após o login.
          // A opção de ir para o Dashboard será via menu suspenso para Proprietários.
          navigate('/'); 
        } else if (event === 'SIGNED_OUT') {
          showSuccess('Logout realizado com sucesso!');
          navigate('/'); // Redireciona para a Landing Page (Home)
        } else if (event === 'PASSWORD_RECOVERY') {
          showSuccess('Verifique seu e-mail para redefinir a senha.');
          navigate('/reset-password');
        } else if (event === 'USER_UPDATED') {
          showSuccess('Seu perfil foi atualizado!');
        } else if (event === 'INITIAL_SESSION') {
          // Handle initial session, no toast needed here to avoid repeated messages
          // No redirecionamento automático para o dashboard aqui.
          // O usuário permanecerá na página atual ou será redirecionado para a Landing Page se não houver sessão.
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      // No redirecionamento automático para o dashboard aqui.
      // O usuário permanecerá na página atual ou será redirecionado para a Landing Page se não houver sessão.
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