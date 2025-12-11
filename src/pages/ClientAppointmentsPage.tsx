import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getStatusColor } from '@/lib/dashboard-utils';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';
import { format, parse, addMinutes, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { getTargetCompanyId, clearTargetCompanyId } from '@/utils/storage'; // Import storage utils

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  total_price: number;
  total_duration_minutes: number;
  status: string;
  client_nickname: string | null;
  clients: { name: string } | null;
  collaborators: { first_name: string; last_name: string } | null;
  appointment_services: { services: { name: string } | null }[];
}

const ClientAppointmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);
  const [cancellingAppointment, setCancellingAppointment] = useState(false);
  const [clientCompanyId, setClientCompanyId] = useState<string | null>(null); // State to hold the company ID context

  const fetchAppointments = useCallback(async () => {
    if (sessionLoading || !session?.user) {
      return;
    }

    setLoadingAppointments(true);
    try {
      // 1. Determine the target company ID (if coming from Landing Page)
      const targetCompanyId = getTargetCompanyId();

      // 2. Get the client's profile data
      const { data: clientProfile, error: clientProfileError } = await supabase
        .from('clients')
        .select('id, company_id')
        .eq('client_auth_id', session.user.id)
        .single();

      if (clientProfileError) {
        // PGRST116: No rows found. This means the trigger failed or the user is not a client.
        if (clientProfileError.code === 'PGRST116') {
          throw new Error('Seu perfil de cliente não foi encontrado. Por favor, tente fazer login novamente ou entre em contato com o suporte.');
        }
        throw clientProfileError;
      }
      
      if (!clientProfile) {
        throw new Error('Seu perfil de cliente não foi encontrado.');
      }

      const clientId = clientProfile.id;
      // Use the targetCompanyId if set, otherwise use the client's default company_id
      const companyIdToUse = targetCompanyId || clientProfile.company_id;

      if (!companyIdToUse) {
        // If the client profile exists but has no associated company, we cannot fetch appointments.
        setClientCompanyId(null);
        setAppointments([]);
        setLoadingAppointments(false);
        clearTargetCompanyId();
        return;
      }
      
      setClientCompanyId(companyIdToUse);

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          total_price,
          total_duration_minutes,
          status,
          client_nickname,
          clients(name),
          collaborators(first_name, last_name),
          appointment_services(
            services(name)
          )
        `)
        .eq('client_id', clientId) // Filter by the client's ID
        .eq('company_id', companyIdToUse) // Filter by the determined company ID
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false });

      if (error) {
        throw error;
      }

      setAppointments(data as Appointment[]);
      
      // 3. Clear the target ID from storage once the context is established
      if (targetCompanyId) {
        clearTargetCompanyId();
      }

    } catch (error: any) {
      console.error('Erro ao carregar agendamentos do cliente:', error);
      showError('Erro ao carregar agendamentos: ' + error.message);
      setAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  }, [session, sessionLoading]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleCancelClick = (appointmentId: string) => {
    setAppointmentToCancel(appointmentId);
    setIsCancelModalOpen(true);
  };

  const confirmCancel = async () => {
    if (!appointmentToCancel || !session?.user) {
      showError('Erro: Agendamento ou sessão inválida para cancelar.');
      return;
    }

    setCancellingAppointment(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelado' })
        .eq('id', appointmentToCancel)
        .eq('created_by_user_id', session.user.id); // Ensure client can only cancel their own

      if (error) {
        throw error;
      }

      showSuccess('Agendamento cancelado com sucesso!');
      fetchAppointments(); // Re-fetch to update the list
      setIsCancelModalOpen(false);
      setAppointmentToCancel(null);
    } catch (error: any) {
      console.error('Erro ao cancelar agendamento:', error);
      showError('Erro ao cancelar agendamento: ' + error.message);
    } finally {
      setCancellingAppointment(false);
    }
  };

  if (sessionLoading || loadingAppointments) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">Carregando seus agendamentos...</p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Você precisa estar logado para ver seus agendamentos.</p>
      </div>
    );
  }
  
  if (clientCompanyId === null && appointments.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-700 text-center mb-4">
          Você ainda não está associado a uma empresa. Por favor, agende um serviço através da página inicial para se associar.
        </p>
        <Button
          className="!rounded-button whitespace-nowrap bg-yellow-600 hover:bg-yellow-700 text-black"
          onClick={() => navigate('/')}
        >
          <i className="fas fa-store mr-2"></i>
          Buscar Empresas
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Meus Agendamentos</h1>
        <Button
          className="!rounded-button whitespace-nowrap bg-yellow-600 hover:bg-yellow-700 text-black"
          onClick={() => navigate('/agendar')}
        >
          <i className="fas fa-plus mr-2"></i>
          Novo Agendamento
        </Button>
      </div>

      <div className="grid gap-4">
        {appointments.length === 0 ? (
          <p className="text-gray-600">Você não possui agendamentos. Clique em "Novo Agendamento" para começar!</p>
        ) : (
          appointments.map((agendamento) => {
            const clientName = agendamento.clients?.name || 'Cliente Desconhecido';
            const collaboratorName = agendamento.collaborators ? `${agendamento.collaborators.first_name} ${agendamento.collaborators.last_name}` : 'Colaborador Desconhecido';
            const serviceNames = agendamento.appointment_services
              .map(as => as.services?.name)
              .filter(Boolean)
              .join(' + ');

            const startTime = parse(agendamento.appointment_time, 'HH:mm:ss', new Date());
            const endTime = addMinutes(startTime, agendamento.total_duration_minutes);
            const formattedTimeRange = `${format(startTime, 'HH:mm')} às ${format(endTime, 'HH:mm')}`;
            const formattedDate = format(parseISO(agendamento.appointment_date), 'dd/MM/yyyy', { locale: ptBR });

            const isCancellable = agendamento.status !== 'cancelado' && agendamento.status !== 'concluido';

            return (
              <Card key={agendamento.id} className="border-gray-200 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 w-1/2">
                      <div className={`w-4 h-4 rounded-full ${getStatusColor(agendamento.status)}`}></div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {agendamento.client_nickname || clientName}
                        </h3>
                        <p className="text-sm text-gray-600">{serviceNames || 'Serviço(s) Desconhecido(s)'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end w-1/4">
                      <p className="font-semibold text-gray-900">{formattedDate}</p>
                      <p className="font-semibold text-gray-900">{formattedTimeRange}</p>
                      <p className="text-sm text-gray-600">{collaboratorName}</p>
                    </div>
                    <div className="text-right w-1/4 flex flex-col items-end gap-1">
                      <p className="font-bold text-yellow-600">R$ {agendamento.total_price.toFixed(2).replace('.', ',')}</p>
                      <Badge className={`${getStatusColor(agendamento.status)} text-white text-xs`}>
                        {agendamento.status}
                      </Badge>
                      {isCancellable && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="!rounded-button whitespace-nowrap mt-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelClick(agendamento.id);
                          }}
                        >
                          <i className="fas fa-times-circle mr-2"></i>
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Cancelamento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelModalOpen(false)} disabled={cancellingAppointment}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={confirmCancel} disabled={cancellingAppointment}>
              {cancellingAppointment ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientAppointmentsPage;