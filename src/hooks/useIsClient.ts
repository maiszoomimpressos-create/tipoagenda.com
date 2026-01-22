import { useState, useEffect } from 'react';
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

export function useIsClient() {
  const { session, loading: sessionLoading } = useSession();
  const [isClient, setIsClient] = useState(false);
  const [loadingClientCheck, setLoadingClientCheck] = useState(true);
  // Usa apenas o user.id como dependência para evitar re-execuções desnecessárias
  const userId = session?.user?.id || null;

  useEffect(() => {
    const checkClientStatus = async () => {
      if (sessionLoading) {
        return; // Wait for session to load
      }

      if (!session?.user) {
        setIsClient(false);
        setLoadingClientCheck(false);
        return;
      }

      setLoadingClientCheck(true);
      try {
        // Fetch user's type from type_user table
        // Usar maybeSingle() para evitar erro 406
        const { data, error } = await supabase
          .from('type_user')
          .select('cod')
          .eq('user_id', session.user.id)
          .maybeSingle();

        // Tratar erro 406 (Not Acceptable) - pode ser RLS, mas não é crítico
        if (error && error.code !== 'PGRST116' && error.code !== 'PGRST301') {
          console.warn('useIsClient: Erro ao buscar type_user (não crítico):', error);
        }

        const userIsClient = data?.cod === 'CLIENTE';
        setIsClient(userIsClient);

      } catch (error: any) {
        console.error('Error checking client status:', error);
        showError('Erro ao verificar status de cliente: ' + error.message);
        setIsClient(false);
      } finally {
        setLoadingClientCheck(false);
      }
    };

    checkClientStatus();
  }, [userId, sessionLoading]); // Usa userId em vez de session inteiro

  return { isClient, loadingClientCheck };
}