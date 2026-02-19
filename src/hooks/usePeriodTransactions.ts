import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { usePrimaryCompany } from './usePrimaryCompany';
import { format, startOfDay, endOfDay } from 'date-fns';

export interface PeriodTransaction {
  id: string;
  total_amount: number | string;
  payment_method: string;
  transaction_type: 'recebimento' | 'despesa' | 'abertura' | 'fechamento' | 'venda_avulsa_produto';
  transaction_date: string;
  observations?: string | null;
  appointment_id?: string | null;
}

export interface PeriodSummary {
  totalReceipts: number;
  totalExpenses: number;
  totalBalance: number;
  totalCash: number;
  totalCardPix: number;
  transactions: PeriodTransaction[];
}

export function usePeriodTransactions(startDate: Date, endDate: Date) {
  const { session } = useSession();
  const { primaryCompanyId } = usePrimaryCompany();
  const [summary, setSummary] = useState<PeriodSummary>({
    totalReceipts: 0,
    totalExpenses: 0,
    totalBalance: 0,
    totalCash: 0,
    totalCardPix: 0,
    transactions: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchPeriodTransactions = useCallback(async () => {
    if (!primaryCompanyId || !session?.user || !startDate || !endDate) {
      setSummary({
        totalReceipts: 0,
        totalExpenses: 0,
        totalBalance: 0,
        totalCash: 0,
        totalCardPix: 0,
        transactions: [],
      });
      setLoading(false);
      return;
    }

    // Validar se as datas são válidas
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error('[usePeriodTransactions] Datas inválidas:', { startDate, endDate });
      setSummary({
        totalReceipts: 0,
        totalExpenses: 0,
        totalBalance: 0,
        totalCash: 0,
        totalCardPix: 0,
        transactions: [],
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const startDateTime = format(startOfDay(startDate), "yyyy-MM-dd'T'HH:mm:ss");
      const endDateTime = format(endOfDay(endDate), "yyyy-MM-dd'T'HH:mm:ss");

      const { data: transactionsData, error } = await supabase
        .from('cash_movements')
        .select('id, total_amount, payment_method, transaction_type, transaction_date, observations, appointment_id')
        .eq('company_id', primaryCompanyId)
        .gte('transaction_date', startDateTime)
        .lte('transaction_date', endDateTime)
        .order('transaction_date', { ascending: true });

      if (error) throw error;

      let totalReceipts = 0;
      let totalExpenses = 0;
      let totalCash = 0;
      let totalCardPix = 0;

      (transactionsData || []).forEach((t: PeriodTransaction) => {
        const amount = parseFloat(t.total_amount?.toString() || '0') || 0;
        if (t.transaction_type === 'recebimento' || t.transaction_type === 'abertura' || t.transaction_type === 'venda_avulsa_produto') {
          totalReceipts += amount;
          if (t.payment_method === 'dinheiro') {
            totalCash += amount;
          } else {
            totalCardPix += amount;
          }
        } else if (t.transaction_type === 'despesa') {
          totalExpenses += amount;
          // Subtrair despesas pagas em dinheiro do total de dinheiro esperado
          if (t.payment_method === 'dinheiro') {
            totalCash -= amount;
          }
        }
      });

      const totalBalance = totalReceipts - totalExpenses;

      setSummary({
        totalReceipts,
        totalExpenses,
        totalBalance,
        totalCash,
        totalCardPix,
        transactions: (transactionsData || []) as PeriodTransaction[],
      });
    } catch (error: any) {
      console.error('[usePeriodTransactions] Erro:', error);
      setSummary({
        totalReceipts: 0,
        totalExpenses: 0,
        totalBalance: 0,
        totalCash: 0,
        totalCardPix: 0,
        transactions: [],
      });
    } finally {
      setLoading(false);
    }
  }, [primaryCompanyId, session?.user, startDate?.getTime(), endDate?.getTime()]);

  useEffect(() => {
    fetchPeriodTransactions();
  }, [fetchPeriodTransactions]);

  return { summary, loading, refetch: fetchPeriodTransactions };
}


