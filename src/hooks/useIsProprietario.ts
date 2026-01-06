import { useState, useEffect } from 'react';
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

export function useIsProprietario() {
  const { session, loading: sessionLoading } = useSession();
  const [isProprietario, setIsProprietario] = useState(false);
  const [loadingProprietarioCheck, setLoadingProprietarioCheck] = useState(true);

  useEffect(() => {
    const checkProprietarioStatus = async () => {
      if (sessionLoading) {
        return; // Wait for session to load
      }

      if (!session?.user) {
        setIsProprietario(false);
        setLoadingProprietarioCheck(false);
        return;
      }

      setLoadingProprietarioCheck(true);
      try {
        // Fetch user's roles from user_companies table using the get_user_context function
        const { data, error } = await supabase
          .rpc('get_user_context', { p_user_id: session.user.id });

        if (error) {
          throw error;
        }

        // Check if any of the user's roles is 'Proprietário'
        const userIsProprietario = data.some(role => role.role_type_description === 'Proprietário');
        setIsProprietario(userIsProprietario);

      } catch (error: any) {
        console.error('Error checking Proprietário status:', error);
        showError('Erro ao verificar status de proprietário: ' + error.message);
        setIsProprietario(false);
      } finally {
        setLoadingProprietarioCheck(false);
      }
    };

    checkProprietarioStatus();
  }, [session, sessionLoading]);

  return { isProprietario, loadingProprietarioCheck };
}