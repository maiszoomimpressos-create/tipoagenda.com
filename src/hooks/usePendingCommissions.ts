import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { usePrimaryCompany } from './usePrimaryCompany';
import { format, startOfDay, endOfDay } from 'date-fns';

export interface PendingCommission {
  id: string; // cash_movement_id
  cash_movement_id: string;
  collaborator_id: string;
  collaborator_name: string;
  appointment_id: string;
  appointment_date: string;
  service_names: string;
  total_commission: number; // Valor total da comissão
  paid_amount: number; // Valor já pago
  pending_amount: number; // Valor pendente (total - pago)
  transaction_date: string;
  observations: string | null;
}

export interface PendingCommissionsByCollaborator {
  collaborator_id: string;
  collaborator_name: string;
  total_pending: number;
  commissions: PendingCommission[];
}

export function usePendingCommissions(
  collaboratorId?: string | null,
  startDate?: Date | null,
  endDate?: Date | null
) {
  const { session } = useSession();
  const { primaryCompanyId } = usePrimaryCompany();
  const [pendingCommissions, setPendingCommissions] = useState<PendingCommissionsByCollaborator[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPendingCommissions = useCallback(async () => {
    if (!primaryCompanyId || !session?.user) {
      setPendingCommissions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Buscar todas as comissões (cash_movements com transaction_type='despesa' e appointment_id não null)
      // Primeiro, buscar os IDs dos agendamentos com filtro de colaborador se necessário
      let appointmentIdsQuery = supabase
        .from('appointments')
        .select('id')
        .eq('company_id', primaryCompanyId);

      if (collaboratorId) {
        appointmentIdsQuery = appointmentIdsQuery.eq('collaborator_id', collaboratorId);
      }

      const { data: appointmentIdsData, error: appointmentIdsError } = await appointmentIdsQuery;

      if (appointmentIdsError) {
        throw appointmentIdsError;
      }

      if (!appointmentIdsData || appointmentIdsData.length === 0) {
        setPendingCommissions([]);
        setLoading(false);
        return;
      }

      const appointmentIds = appointmentIdsData.map(a => a.id);

      // Agora buscar as comissões
      let query = supabase
        .from('cash_movements')
        .select(`
          id,
          appointment_id,
          total_amount,
          transaction_date,
          observations,
          appointments!inner(
            id,
            collaborator_id,
            appointment_date,
            collaborators!inner(
              id,
              first_name,
              last_name
            ),
            appointment_services(
              services(name)
            )
          )
        `)
        .eq('company_id', primaryCompanyId)
        .eq('transaction_type', 'despesa')
        .not('appointment_id', 'is', null)
        .in('appointment_id', appointmentIds);

      // Aplicar filtro de data se fornecido
      if (startDate) {
        const startDateTime = format(startOfDay(startDate), "yyyy-MM-dd'T'HH:mm:ss");
        query = query.gte('transaction_date', startDateTime);
      }
      if (endDate) {
        const endDateTime = format(endOfDay(endDate), "yyyy-MM-dd'T'HH:mm:ss");
        query = query.lte('transaction_date', endDateTime);
      }

      const { data: commissionMovements, error: commissionError } = await query;

      if (commissionError) {
        console.error('[usePendingCommissions] Erro ao buscar comissões:', commissionError);
        throw commissionError;
      }

      if (!commissionMovements || commissionMovements.length === 0) {
        setPendingCommissions([]);
        setLoading(false);
        return;
      }

      // 2. Buscar todos os pagamentos já feitos para essas comissões
      const cashMovementIds = commissionMovements.map((cm: any) => cm.id);
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('commission_payments')
        .select('cash_movement_id, amount_paid')
        .in('cash_movement_id', cashMovementIds)
        .eq('company_id', primaryCompanyId);

      if (paymentsError) {
        console.error('[usePendingCommissions] Erro ao buscar pagamentos:', paymentsError);
        throw paymentsError;
      }

      // 3. Calcular valores pagos por comissão
      const paymentsMap = new Map<string, number>();
      (paymentsData || []).forEach((payment: any) => {
        const currentPaid = paymentsMap.get(payment.cash_movement_id) || 0;
        paymentsMap.set(payment.cash_movement_id, currentPaid + parseFloat(payment.amount_paid));
      });

      // 4. Processar comissões e calcular pendentes
      const commissionsByCollaborator = new Map<string, {
        collaborator_id: string;
        collaborator_name: string;
        total_pending: number;
        commissions: PendingCommission[];
      }>();

      commissionMovements.forEach((cm: any) => {
        const appointment = cm.appointments;
        if (!appointment || !appointment.collaborator_id) {
          return;
        }

        const collaboratorId = appointment.collaborator_id;
        const collaboratorName = `${appointment.collaborators.first_name} ${appointment.collaborators.last_name}`;
        const totalCommission = parseFloat(cm.total_amount) || 0;
        const paidAmount = paymentsMap.get(cm.id) || 0;
        const pendingAmount = totalCommission - paidAmount;

        // Só incluir se houver valor pendente
        if (pendingAmount <= 0) {
          return;
        }

        // Obter nomes dos serviços
        const serviceNames = (appointment.appointment_services || [])
          .map((as: any) => as.services?.name)
          .filter(Boolean)
          .join(', ') || 'Serviço não especificado';

        const commission: PendingCommission = {
          id: cm.id,
          cash_movement_id: cm.id,
          collaborator_id: collaboratorId,
          collaborator_name: collaboratorName,
          appointment_id: appointment.id,
          appointment_date: appointment.appointment_date,
          service_names: serviceNames,
          total_commission: totalCommission,
          paid_amount: paidAmount,
          pending_amount: pendingAmount,
          transaction_date: cm.transaction_date,
          observations: cm.observations,
        };

        if (!commissionsByCollaborator.has(collaboratorId)) {
          commissionsByCollaborator.set(collaboratorId, {
            collaborator_id: collaboratorId,
            collaborator_name: collaboratorName,
            total_pending: 0,
            commissions: [],
          });
        }

        const collaboratorData = commissionsByCollaborator.get(collaboratorId)!;
        collaboratorData.commissions.push(commission);
        collaboratorData.total_pending += pendingAmount;
      });

      // 5. Converter para array e ordenar por total pendente (decrescente)
      const result = Array.from(commissionsByCollaborator.values())
        .sort((a, b) => b.total_pending - a.total_pending);

      setPendingCommissions(result);
    } catch (error: any) {
      console.error('[usePendingCommissions] Erro:', error);
      setPendingCommissions([]);
    } finally {
      setLoading(false);
    }
  }, [primaryCompanyId, session?.user, collaboratorId, startDate, endDate]);

  useEffect(() => {
    fetchPendingCommissions();
  }, [fetchPendingCommissions]);

  return { pendingCommissions, loading, refetch: fetchPendingCommissions };
}

