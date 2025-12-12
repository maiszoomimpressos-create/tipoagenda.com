import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { getTargetCompanyId, clearTargetCompanyId } from '@/utils/storage';

interface SessionContextType {
  session: Session | null;
  loading: boolean;
  isClient: boolean;
  isProprietario: boolean;
  isAdmin: boolean;
  loadingRoles: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Role States managed internally
  const [isClient, setIsClient] = useState(false);
  const [isProprietario, setIsProprietario] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(true);

  const navigate = useNavigate();

  const fetchUserRoles = useCallback(async (userId: string) => {
    setLoadingRoles(true);
    let clientStatus = false;
    let proprietorStatus = false;
    let adminStatus = false;

    try {
      // 1. Fetch User Type (Client/Proprietario/Admin)
      const { data: typeData, error: typeError } = await supabase
        .from('type_user')
        .select('cod')
        .eq('user_id', userId)
        .single();

      if (typeError && typeError.code !== 'PGRST116') {
        throw typeError;
      }
      
      const userType = typeData?.cod;
      
      // Determine primary role based on type_user.cod
      clientStatus = userType === 'CLIENTE';
      proprietarioStatus = userType === 'PROPRIETARIO';
      adminStatus = userType === 'ADMIN';
      
    } catch (error: any) {
      console.error('Error fetching user roles:', error);
      // Roles remain false if error occurs
    } finally {
      setIsClient(clientStatus);
      setIsProprietario(proprietarioStatus);
      setIsAdmin(adminStatus);
      setLoadingRoles(false);
    }
  }, []);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('SessionContextProvider - Auth event:', event, 'Session:', currentSession);
        setSession(currentSession);
        setLoading(false);
        setLoadingRoles(true); // Reset roles loading state

        if (currentSession?.user) {
          fetchUserRoles(currentSession.user.id);
        } else {
          setIsClient(false);
          setIsProprietario(false);
          setIsAdmin(false);
          setLoadingRoles(false);
        }

        if (event === 'SIGNED_IN' && currentSession) {
          showSuccess('Login realizado com sucesso!');
          
          const targetCompanyId = getTargetCompanyId();
          
          if (targetCompanyId) {
            navigate('/agendar', { replace: true });
            return;
          }
          
          // Check roles immediately after sign in to decide redirection
          const { data: typeData } = await supabase
            .from('type_user')
            .select('cod')
            .eq('user_id', currentSession.user.id)
            .single();
            
          const userType = typeData?.cod;
          
          if (userType === 'ADMIN') {
            navigate('/admin-dashboard', { replace: true }); // Redireciona para o novo dashboard de admin
          } else if (userType === 'PROPRIETARIO') {
            navigate('/dashboard', { replace: true }); // Mantém o dashboard existente para Proprietário
          } else {
            navigate('/', { replace: true }); 
          }

        } else if (event === 'SIGNED_OUT') {
          showSuccess('Logout realizado com sucesso!');
          clearTargetCompanyId();
          navigate('/', { replace: true }); 
        } else if (event === 'PASSWORD_RECOVERY') {
          showSuccess('Verifique seu e-mail para redefinir a senha.');
        } else if (event === 'USER_UPDATED') {
          showSuccess('Seu perfil foi atualizado!');
          if (currentSession?.user) {
             fetchUserRoles(currentSession.user.id); // Re-fetch roles if user metadata changes
          }
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log('SessionContextProvider - Initial getSession:', initialSession);
      setSession(initialSession);
      setLoading(false);
      if (initialSession?.user) {
        fetchUserRoles(initialSession.user.id);
      } else {
        setLoadingRoles(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate, fetchUserRoles]);

  const contextValue = {
    session,
    loading,
    isClient,
    isProprietario,
    isAdmin,
    loadingRoles,
  };

  return (
    <SessionContext.Provider value={contextValue}>
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