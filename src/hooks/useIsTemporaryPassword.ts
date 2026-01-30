import { useState, useEffect } from 'react';
import { useSession } from '@/components/SessionContextProvider';

export function useIsTemporaryPassword() {
  const { session, loading: sessionLoading } = useSession();
  const [isTemporaryPassword, setIsTemporaryPassword] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTemporaryPassword = async () => {
      if (sessionLoading) {
        return;
      }

      if (!session?.user) {
        setIsTemporaryPassword(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Verificar se a flag is_temporary_password está no user_metadata
        const isTemporary = session.user.user_metadata?.is_temporary_password === true;
        setIsTemporaryPassword(isTemporary);
      } catch (error: any) {
        console.error('Error checking temporary password status:', error);
        setIsTemporaryPassword(false);
      } finally {
        setLoading(false);
      }
    };

    checkTemporaryPassword();
  }, [session, sessionLoading]);

  return { isTemporaryPassword, loading };
}

