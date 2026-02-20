import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [loading, setLoading] = useState(false);

  const checkPeriod = useCallback(async (dateToCheck?: Date | string | null) => {
    const date = dateToCheck || transactionDate;
    
    if (!primaryCompanyId || !date) {
      setIsClosed(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const dateObj = typeof date === 'string' 
        ? new Date(date) 
        : date;
      
      const dateStr = format(dateObj, 'yyyy-MM-dd');

      // Sempre fazer query direta para garantir que está verificando o estado atual
      const { data: closureData, error: closureError } = await supabase
        .from('cash_register_closures')
        .select('id, start_date, end_date')
        .eq('company_id', primaryCompanyId)
        .lte('start_date', dateStr)
        .gte('end_date', dateStr)
        .limit(1)
        .maybeSingle();

      if (closureError && closureError.code !== 'PGRST116') {
        console.error('[useIsPeriodClosed] Erro:', closureError);
      }
      
      const isClosedResult = !!closureData;
      setIsClosed(isClosedResult);
    } catch (error: any) {
      console.error('[useIsPeriodClosed] Erro ao verificar período:', error);
      setIsClosed(false);
    } finally {
      setLoading(false);
    }
  }, [primaryCompanyId, transactionDate]);

  // Não executar verificação automática - apenas manual através do refetch

  return { isClosed, loading, refetch: (date?: Date | string | null) => checkPeriod(date || transactionDate) };
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
      // Verificar se existe um fechamento para este período exato
      // Usar uma query mais específica para garantir que encontramos apenas fechamentos válidos
      const { data, error, count } = await supabase
        .from('cash_register_closures')
        .select('id, start_date, end_date, created_at', { count: 'exact' })
        .eq('company_id', primaryCompanyId)
        .eq('start_date', period.startDateDb)
        .eq('end_date', period.endDateDb)
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[useCheckPeriodClosed] Erro na query:', error);
        // Em caso de erro, considerar como não fechado para não bloquear
        setIsClosed(false);
        setLoading(false);
        return;
      }

      // Verificar se realmente existe um registro
      const isClosedResult = !!data && data.id;
      
      console.log('[useCheckPeriodClosed] Verificação final:', {
        companyId: primaryCompanyId,
        startDate: period.startDateDb,
        endDate: period.endDateDb,
        isClosed: isClosedResult,
        foundClosureId: data?.id || null,
        timestamp: new Date().toISOString()
      });
      
      // Atualizar estado apenas se realmente encontrou um fechamento válido
      setIsClosed(isClosedResult);
    } catch (error: any) {
      console.error('[useCheckPeriodClosed] Erro:', error);
      setIsClosed(false);
    } finally {
      setLoading(false);
    }
  }, [primaryCompanyId, loadingPrimaryCompany, period]);

  useEffect(() => {
    if (loadingPrimaryCompany) {
      return;
    }

    if (!primaryCompanyId || !period) {
      setIsClosed(false);
      setLoading(false);
      return;
    }

    // Executar verificação inicial
    checkPeriod();

    // Listener para detectar mudanças na tabela cash_register_closures
    // Isso permite atualizar automaticamente quando o caixa é reaberto
    const channel = supabase
      .channel(`cash_closure_${primaryCompanyId}_${period.startDateDb}_${period.endDateDb}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Escuta INSERT, UPDATE e DELETE
          schema: 'public',
          table: 'cash_register_closures',
          filter: `company_id=eq.${primaryCompanyId}`,
        },
        (payload) => {
          // Verificar se a mudança afeta o período atual
          if (period && payload.new) {
            const newRecord = payload.new as any;
            if (newRecord.start_date === period.startDateDb && newRecord.end_date === period.endDateDb) {
              // Fechamento foi criado para este período
              setIsClosed(true);
            }
          } else if (payload.old && period) {
            const oldRecord = payload.old as any;
            if (oldRecord.start_date === period.startDateDb && oldRecord.end_date === period.endDateDb) {
              // Fechamento foi deletado (reaberto) para este período
              // Imediatamente marcar como não fechado
              setIsClosed(false);
              setLoading(false);
              // Recarregar após um delay para garantir sincronização
              setTimeout(() => {
                checkPeriod();
              }, 200);
            }
          } else if (payload.eventType === 'DELETE') {
            // Qualquer DELETE na tabela, verificar novamente após um delay
            setTimeout(() => {
              checkPeriod();
            }, 200);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryCompanyId, period, loadingPrimaryCompany]);

  return { isClosed, loading, refetch: checkPeriod };
}

