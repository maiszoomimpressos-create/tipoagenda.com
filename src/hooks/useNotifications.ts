import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';
import { usePrimaryCompany } from './usePrimaryCompany';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Notification {
  id: string;
  type: 'PENDING_APPOINTMENT' | 'CANCELLED_APPOINTMENT';
  message: string;
  date: string;
  is_read: boolean;
  appointment_id: string;
}

export function useNotifications() {
  const { session } = useSession();
  const { primaryCompanyId, loadingPrimaryCompany } = usePrimaryCompany();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!primaryCompanyId || !session?.user || loadingPrimaryCompany) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch Pending Appointments (status = 'pendente')
      const { data: pendingApps, error: pendingError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          client_nickname,
          clients(name),
          collaborators(first_name)
        `)
        .eq('company_id', primaryCompanyId)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false })
        .limit(10);

      if (pendingError) throw pendingError;

      // Fetch Cancelled Appointments (status = 'cancelado')
      const { data: cancelledApps, error: cancelledError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          client_nickname,
          clients(name),
          collaborators(first_name)
        `)
        .eq('company_id', primaryCompanyId)
        .eq('status', 'cancelado')
        .order('created_at', { ascending: false })
        .limit(10);

      if (cancelledError) throw cancelledError;

      const allNotifications: Notification[] = [];

      // Process Pending Notifications
      pendingApps.forEach(app => {
        const clientName = app.client_nickname || app.clients?.name || 'Cliente';
        const collabName = app.collaborators?.first_name || 'Colaborador';
        const dateFormatted = format(parseISO(app.appointment_date), 'dd/MM/yyyy', { locale: ptBR });
        
        allNotifications.push({
          id: `pending-${app.id}`,
          type: 'PENDING_APPOINTMENT',
          message: `Novo agendamento de ${clientName} com ${collabName} em ${dateFormatted} às ${app.appointment_time.substring(0, 5)}.`,
          date: app.created_at,
          is_read: false, // Simplificação: consideramos novo se estiver na lista
          appointment_id: app.id,
        });
      });

      // Process Cancelled Notifications
      cancelledApps.forEach(app => {
        const clientName = app.client_nickname || app.clients?.name || 'Cliente';
        const collabName = app.collaborators?.first_name || 'Colaborador';
        const dateFormatted = format(parseISO(app.appointment_date), 'dd/MM/yyyy', { locale: ptBR });

        allNotifications.push({
          id: `cancelled-${app.id}`,
          type: 'CANCELLED_APPOINTMENT',
          message: `Agendamento de ${clientName} com ${collabName} em ${dateFormatted} foi CANCELADO.`,
          date: app.created_at,
          is_read: false,
          appointment_id: app.id,
        });
      });
      
      // Sort by date (most recent first)
      allNotifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setNotifications(allNotifications);
      setUnreadCount(allNotifications.length); // For simplicity, count all fetched as unread

    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      showError('Erro ao carregar notificações: ' + error.message);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [primaryCompanyId, session?.user, loadingPrimaryCompany]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Placeholder for marking as read (not fully implemented in DB yet, just clears the count locally)
  const markAllAsRead = () => {
    setUnreadCount(0);
    // In a real app, this would update a 'notifications' table in Supabase
  };

  return { notifications, unreadCount, loading, fetchNotifications, markAllAsRead };
}