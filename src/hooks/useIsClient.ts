import { useState, useEffect } from 'react';
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

export function useIsClient() {
  const { session, loading: sessionLoading } = useSession();
  const [isClient, setIsClient] = useState(false);
  const [loadingClientCheck, setLoadingClientCheck] = useState(true);

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
        const { data, error } = await supabase
          .from('type_user')
          .select('cod')
          .eq('user_id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
          throw error;
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
  }, [session, sessionLoading]);

  return { isClient, loadingClientCheck };
}