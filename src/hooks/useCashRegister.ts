import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';
import { usePrimaryCompany } from './usePrimaryCompany';
import { format, startOfDay, endOfDay } from 'date-fns';

interface DailyTransaction {
  id: string;
  total_amount: number;
  payment_method: string;
  transaction_type: 'recebimento' | 'despesa' | 'abertura';
}

interface CashRegisterData {
  totalCash: number;
  totalCardPix: number;
  totalDay: number;
  transactions: DailyTransaction[];
}

interface CashRegisterForm {
  notas_100: number;
  notas_50: number;
  notas_20: number;
  outras_moedas: number;
  despesa_produtos: number;
  outras_despesas: number;
  descricao_despesas: string;
  observacoes_fechamento: string;
}

const initialData: CashRegisterData = {
  totalCash: 0,
  totalCardPix: 0,
  totalDay: 0,
  transactions: [],
};

export function useCashRegister() {
  const { session } = useSession();
  const { primaryCompanyId, loadingPrimaryCompany } = usePrimaryCompany();
  const [data, setData] = useState<CashRegisterData>(initialData);
  const [loading, setLoading] = useState(true);
  const [isClosed, setIsClosed] = useState(false); // Check if cash register is already closed today

  const today = startOfDay(new Date());
  const todayStartDb = format(today, 'yyyy-MM-dd HH:mm:ss');
  const todayEndDb = format(endOfDay(today), 'yyyy-MM-dd HH:mm:ss');

  const fetchDailyTransactions = useCallback(async () => {
    if (!primaryCompanyId || !session?.user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch all cash movements for today
      const { data: transactionsData, error } = await supabase
        .from('cash_movements')
        .select('id, total_amount, payment_method, transaction_type')
        .eq('company_id', primaryCompanyId)
        .gte('transaction_date', todayStartDb)
        .lte('transaction_date', todayEndDb);

      if (error) throw error;

      // Check if a 'fechamento' transaction already exists
      const isAlreadyClosed = transactionsData.some(t => t.transaction_type === 'fechamento');
      setIsClosed(isAlreadyClosed);

      // Filter only 'recebimento' transactions for calculation
      const receipts = transactionsData.filter(t => t.transaction_type === 'recebimento');

      let totalCash = 0;
      let totalCardPix = 0;

      receipts.forEach(t => {
        if (t.payment_method === 'dinheiro') {
          totalCash += t.total_amount;
        } else {
          totalCardPix += t.total_amount;
        }
      });

      setData({
        totalCash,
        totalCardPix,
        totalDay: totalCash + totalCardPix,
        transactions: transactionsData,
      });

    } catch (error: any) {
      console.error('Error fetching daily transactions:', error);
      showError('Erro ao carregar dados do caixa: ' + error.message);
      setData(initialData);
    } finally {
      setLoading(false);
    }
  }, [primaryCompanyId, session?.user, todayStartDb, todayEndDb]);

  useEffect(() => {
    if (!loadingPrimaryCompany) {
      fetchDailyTransactions();
    }
  }, [loadingPrimaryCompany, fetchDailyTransactions]);

  const submitCashClose = async (formData: CashRegisterForm, totalContado: number, totalDespesas: number, lucroLiquido: number) => {
    if (!primaryCompanyId || !session?.user) {
      showError('Erro de autenticação ou empresa primária não encontrada.');
      return;
    }

    setLoading(true);
    try {
      // 1. Register the Cash Close transaction (Fechamento)
      const { error: closeError } = await supabase
        .from('cash_movements')
        .insert({
          company_id: primaryCompanyId,
          user_id: session.user.id,
          total_amount: totalContado, // Amount counted in cash
          payment_method: 'dinheiro', // Payment method is irrelevant for closing, but required by schema
          transaction_type: 'fechamento',
          observations: `Fechamento de Caixa. Saldo Bruto: R$ ${data.totalDay.toFixed(2)}. Despesas: R$ ${totalDespesas.toFixed(2)}. Lucro Líquido: R$ ${lucroLiquido.toFixed(2)}. Observações: ${formData.observacoes_fechamento}`,
        });

      if (closeError) throw closeError;

      // 2. Register Despesas (if any)
      if (totalDespesas > 0) {
        const despesasToInsert = [];
        
        if (formData.despesa_produtos > 0) {
          despesasToInsert.push({
            company_id: primaryCompanyId,
            user_id: session.user.id,
            total_amount: formData.despesa_produtos,
            payment_method: 'dinheiro', // Assuming expenses are paid in cash for simplicity
            transaction_type: 'despesa',
            observations: 'Compra de produtos (Despesa de Caixa)',
          });
        }

        if (formData.outras_despesas > 0) {
          despesasToInsert.push({
            company_id: primaryCompanyId,
            user_id: session.user.id,
            total_amount: formData.outras_despesas,
            payment_method: 'dinheiro',
            transaction_type: 'despesa',
            observations: `Outras despesas: ${formData.descricao_despesas}`,
          });
        }

        if (despesasToInsert.length > 0) {
          const { error: despesaError } = await supabase
            .from('cash_movements')
            .insert(despesasToInsert);
          
          if (despesaError) throw despesaError;
        }
      }

      showSuccess('Caixa fechado com sucesso!');
      setIsClosed(true);
      return true;

    } catch (error: any) {
      console.error('Error closing cash register:', error);
      showError('Erro ao fechar caixa: ' + error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    isClosed,
    submitCashClose,
    fetchDailyTransactions,
  };
}