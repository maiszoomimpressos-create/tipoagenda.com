import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { usePrimaryCompany } from './usePrimaryCompany';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type ClosureType = 'dia' | 'semana' | 'quinzena' | 'mes';

export interface ClosurePeriod {
  startDate: Date;
  endDate: Date;
  startDateDb: string; // YYYY-MM-DD
  endDateDb: string; // YYYY-MM-DD
}

export interface CashClosure {
  id: string;
  closure_type: ClosureType;
  start_date: string;
  end_date: string;
  total_receipts: number;
  total_expenses: number;
  total_balance: number;
  cash_counted: number;
  card_pix_total: number;
  observations: string | null;
  created_at: string;
  user_id: string;
}

// Função para calcular período baseado no tipo
export function calculatePeriod(closureType: ClosureType, referenceDate: Date = new Date()): ClosurePeriod {
  let startDate: Date;
  let endDate: Date;

  switch (closureType) {
    case 'dia':
      startDate = startOfDay(referenceDate);
      endDate = endOfDay(referenceDate);
      break;
    case 'semana':
      startDate = startOfWeek(referenceDate, { locale: ptBR });
      endDate = endOfWeek(referenceDate, { locale: ptBR });
      break;
    case 'quinzena':
      const day = referenceDate.getDate();
      if (day <= 15) {
        startDate = startOfMonth(referenceDate);
        endDate = endOfDay(new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 15));
      } else {
        startDate = startOfDay(new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 16));
        endDate = endOfMonth(referenceDate);
      }
      break;
    case 'mes':
      startDate = startOfMonth(referenceDate);
      endDate = endOfMonth(referenceDate);
      break;
    default:
      startDate = startOfDay(referenceDate);
      endDate = endOfDay(referenceDate);
  }

  return {
    startDate,
    endDate,
    startDateDb: format(startDate, 'yyyy-MM-dd'),
    endDateDb: format(endDate, 'yyyy-MM-dd'),
  };
}

// Hook para verificar se um período está fechado
export function useIsPeriodClosed(transactionDate?: Date | string | null) {
  const { primaryCompanyId } = usePrimaryCompany();
  const [isClosed, setIsClosed] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkPeriod = useCallback(async () => {
    if (!primaryCompanyId || !transactionDate) {
      setIsClosed(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const dateToCheck = typeof transactionDate === 'string' 
        ? new Date(transactionDate) 
        : transactionDate;
      
      const dateStr = format(dateToCheck, 'yyyy-MM-dd');

      const { data, error } = await supabase.rpc('is_period_closed', {
        p_company_id: primaryCompanyId,
        p_transaction_date: dateToCheck.toISOString(),
      });

      if (error) {
        // Se a função não existir ainda, fazer query direta
        const { data: closureData, error: closureError } = await supabase
          .from('cash_register_closures')
          .select('id')
          .eq('company_id', primaryCompanyId)
          .lte('start_date', dateStr)
          .gte('end_date', dateStr)
          .limit(1)
          .maybeSingle();

        if (closureError && closureError.code !== 'PGRST116') {
          console.error('[useIsPeriodClosed] Erro:', closureError);
        }
        
        setIsClosed(!!closureData);
      } else {
        setIsClosed(data || false);
      }
    } catch (error: any) {
      console.error('[useIsPeriodClosed] Erro ao verificar período:', error);
      setIsClosed(false);
    } finally {
      setLoading(false);
    }
  }, [primaryCompanyId, transactionDate]);

  useEffect(() => {
    checkPeriod();
  }, [checkPeriod]);

  return { isClosed, loading };
}

// Hook para buscar fechamentos
export function useCashClosures(closureType?: ClosureType | null) {
  const { primaryCompanyId } = usePrimaryCompany();
  const { session } = useSession();
  const [closures, setClosures] = useState<CashClosure[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClosures = useCallback(async () => {
    if (!primaryCompanyId || !session?.user) {
      setClosures([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('cash_register_closures')
        .select('*')
        .eq('company_id', primaryCompanyId)
        .order('created_at', { ascending: false });

      if (closureType) {
        query = query.eq('closure_type', closureType);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Converter valores numéricos do banco (que podem vir como string) para number
      const closuresData = (data || []).map((closure: any) => ({
        ...closure,
        total_receipts: parseFloat(closure.total_receipts) || 0,
        total_expenses: parseFloat(closure.total_expenses) || 0,
        total_balance: parseFloat(closure.total_balance) || 0,
        cash_counted: parseFloat(closure.cash_counted) || 0,
        card_pix_total: parseFloat(closure.card_pix_total) || 0,
      }));

      setClosures(closuresData as CashClosure[]);
    } catch (error: any) {
      console.error('[useCashClosures] Erro:', error);
      setClosures([]);
    } finally {
      setLoading(false);
    }
  }, [primaryCompanyId, session?.user, closureType]);

  useEffect(() => {
    fetchClosures();
  }, [fetchClosures]);

  return { closures, loading, refetch: fetchClosures };
}

// Hook para verificar se um período específico está fechado
export function useCheckPeriodClosed(period: ClosurePeriod | null) {
  const { primaryCompanyId, loadingPrimaryCompany } = usePrimaryCompany();
  const [isClosed, setIsClosed] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkPeriod = useCallback(async () => {
    if (loadingPrimaryCompany) {
      return; // Aguardar o carregamento da empresa primária
    }

    if (!primaryCompanyId || !period) {
      setIsClosed(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cash_register_closures')
        .select('id')
        .eq('company_id', primaryCompanyId)
        .eq('start_date', period.startDateDb)
        .eq('end_date', period.endDateDb)
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[useCheckPeriodClosed] Erro:', error);
      }

      setIsClosed(!!data);
    } catch (error: any) {
      console.error('[useCheckPeriodClosed] Erro:', error);
      setIsClosed(false);
    } finally {
      setLoading(false);
    }
  }, [primaryCompanyId, loadingPrimaryCompany, period]);

  useEffect(() => {
    checkPeriod();
  }, [checkPeriod]);

  return { isClosed, loading };
}

