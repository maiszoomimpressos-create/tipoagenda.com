import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  features: string[] | null;
  duration_months: number;
}

export function useActivePlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch only active plans
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, name, description, price, features, duration_months')
        .eq('status', 'active')
        .order('price', { ascending: true });

      if (error) throw error;
      
      // Filter out any nulls and ensure features is an array
      const activePlans = data.filter(p => p !== null).map(p => ({
        ...p,
        features: p.features || [],
      })) as Plan[];

      setPlans(activePlans);
    } catch (error: any) {
      console.error('Error fetching active plans:', error);
      showError('Erro ao carregar planos de assinatura: ' + error.message);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return { plans, loading };
}