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
  const [initialLoadComplete, setInitialLoadComplete] = useState(false); // Novo estado para rastrear o carregamento inicial
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('SessionContextProvider - Auth event:', event, 'Session:', currentSession);
        
        const previousSession = session; // Captura a sessão anterior antes de atualizar o estado

        setSession(currentSession);
        setLoading(false);

        if (event === 'SIGNED_IN' && currentSession) {
          // Só mostra o toast de sucesso se for um login fresco (não uma revalidação de token)
          if (!previousSession) {
            showSuccess('Login realizado com sucesso!');
          }
          
          const targetCompanyId = getTargetCompanyId();
          
          if (targetCompanyId) {
            // Se uma empresa alvo estiver definida, redireciona para a página de agendamento do cliente.
            navigate('/agendar', { replace: true });
            return;
          }
          
          // Se não houver empresa alvo, redireciona para a raiz.
          // O IndexPage cuidará do redirecionamento baseado no papel.
          navigate('/', { replace: true }); 

        } else if (event === 'SIGNED_OUT') {
          showSuccess('Logout realizado com sucesso!');
          clearTargetCompanyId(); // Limpa qualquer empresa alvo pendente no logout
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
      setInitialLoadComplete(true); // Marca o carregamento inicial como completo
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate, session]); // Adicionado 'session' como dependência para que 'previousSession' seja capturado corretamente

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