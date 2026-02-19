import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

/**
 * Verifica se uma data está dentro de um período fechado para uma empresa
 * @param companyId ID da empresa
 * @param transactionDate Data da transação (Date ou string)
 * @returns Promise<boolean> true se o período está fechado, false caso contrário
 */
export async function isPeriodClosed(
  companyId: string,
  transactionDate: Date | string
): Promise<boolean> {
  try {
    const dateToCheck = typeof transactionDate === 'string' 
      ? new Date(transactionDate) 
      : transactionDate;
    
    const dateStr = format(dateToCheck, 'yyyy-MM-dd');

    // Verificar se existe um fechamento onde a data está dentro do período
    // start_date <= dateStr <= end_date
    const { data, error } = await supabase
      .from('cash_register_closures')
      .select('id')
      .eq('company_id', companyId)
      .lte('start_date', dateStr)  // start_date <= dateStr (data da transação está depois ou no início do período)
      .gte('end_date', dateStr)     // end_date >= dateStr (data da transação está antes ou no fim do período)
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('[isPeriodClosed] Erro ao verificar fechamento:', error);
      // Em caso de erro, retornar false para não bloquear operações
      return false;
    }

    return !!data;
  } catch (error: any) {
    console.error('[isPeriodClosed] Erro ao verificar período fechado:', error);
    // Em caso de erro, retornar false para não bloquear operações
    return false;
  }
}

