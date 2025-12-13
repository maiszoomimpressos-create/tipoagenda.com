import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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
  // Usamos useRef para rastrear se o usuário já estava logado, evitando toasts repetidos em revalidações.
  const isUserLoggedInRef = useRef(false); 
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('SessionContextProvider - Auth event:', event, 'Session:', currentSession);
        
        const wasLoggedIn = isUserLoggedInRef.current;
        
        setSession(currentSession);
        setLoading(false);

        if (currentSession) {
          isUserLoggedInRef.current = true;
        } else {
          isUserLoggedInRef.current = false;
        }

        if (event === 'SIGNED_IN' && currentSession) {
          // Só mostra o toast de sucesso se for um login fresco (não uma revalidação de token)
          if (!wasLoggedIn) {
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
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log('SessionContextProvider - Initial getSession:', initialSession);
      setSession(initialSession);
      setLoading(false);
      if (initialSession) {
        isUserLoggedInRef.current = true;
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]); // Dependências corrigidas: apenas 'navigate'

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