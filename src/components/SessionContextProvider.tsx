import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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
  const initialSessionRef = useRef<Session | null>(null); // Para armazenar a sessão no carregamento inicial

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setLoading(false);

        if (event === 'INITIAL_SESSION') {
          // Este evento é disparado no carregamento inicial da página.
          // Armazenamos a sessão inicial para comparar depois.
          initialSessionRef.current = currentSession;
        } else if (event === 'SIGNED_IN') {
          // A mensagem de sucesso de login só deve aparecer se não havia uma sessão inicial
          // (indicando um novo login) ou se a sessão atual é diferente da inicial (após um logout e novo login).
          if (!initialSessionRef.current || (currentSession && initialSessionRef.current && currentSession.user.id !== initialSessionRef.current.user.id)) {
            showSuccess('Login realizado com sucesso!');
          }
          navigate('/'); 
        } else if (event === 'SIGNED_OUT') {
          showSuccess('Logout realizado com sucesso!');
          navigate('/'); // Redireciona para a Landing Page (Home)
          initialSessionRef.current = null; // Reseta a sessão inicial no logout
        } else if (event === 'PASSWORD_RECOVERY') {
          showSuccess('Verifique seu e-mail para redefinir a senha.');
          navigate('/reset-password');
        } else if (event === 'USER_UPDATED') {
          showSuccess('Seu perfil foi atualizado!');
        }
      }
    );

    // Busca a sessão inicial imediatamente para definir o estado o mais rápido possível
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setLoading(false);
      // Garante que initialSessionRef.current seja definido mesmo que INITIAL_SESSION seja atrasado
      if (initialSessionRef.current === null) {
        initialSessionRef.current = initialSession;
      }
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