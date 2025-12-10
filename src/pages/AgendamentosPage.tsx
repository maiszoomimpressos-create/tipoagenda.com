import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStatusColor, createButton } from '@/lib/dashboard-utils';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';
import { usePrimaryCompany } from '@/hooks/usePrimaryCompany';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parse, addMinutes, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit } from 'lucide-react';
import AppointmentStatusModal from '@/components/AppointmentStatusModal'; // Importar o novo modal

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  total_price: number;
  total_duration_minutes: number;
  status: string;
  client_nickname: string | null; // Adicionado o novo campo
  clients: { name: string } | null;
  collaborators: { first_name: string; last_name: string } | null;
  appointment_services: { services: { name: string } | null }[];
}

interface CollaboratorFilter {
  id: string;
  first_name: string;
  last_name: string;
}

const AgendamentosPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();
  const { primaryCompanyId, loadingPrimaryCompany } = usePrimaryCompany();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [selectedTab, setSelectedTab] = useState('dia');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [collaboratorsList, setCollaboratorsList] = useState<CollaboratorFilter[]>([]);
  const [selectedCollaboratorFilter, setSelectedCollaboratorFilter] = useState('all');

  // Estados para o modal de status
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [appointmentToEditStatus, setAppointmentToEditStatus] = useState<{ id: string; status: string } | null>(null);

  const fetchAppointments = useCallback(async () => {
    if (sessionLoading || loadingPrimaryCompany || !primaryCompanyId) {
      return;
    }

    setLoadingAppointments(true);
    try {
      let query = supabase
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
        .eq('company_id', primaryCompanyId)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      let startDate: Date | null = null;
      let endDate: Date | null = null;

      if (selectedTab === 'dia') {
        startDate = startOfDay(selectedDate);
        endDate = endOfDay(selectedDate);
      } else if (selectedTab === 'semana') {
        startDate = startOfWeek(selectedDate, { locale: ptBR });
        endDate = endOfWeek(selectedDate, { locale: ptBR });
      } else if (selectedTab === 'mes') {
        startDate = startOfMonth(selectedDate);
        endDate = endOfMonth(selectedDate);
      }

      if (startDate && endDate) {
        query = query.gte('appointment_date', format(startDate, 'yyyy-MM-dd'));
        query = query.lte('appointment_date', format(endDate, 'yyyy-MM-dd'));
      }

      if (selectedCollaboratorFilter !== 'all') {
        query = query.eq('collaborator_id', selectedCollaboratorFilter);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setAppointments(data as Appointment[]);
    } catch (error: any) {
      console.error('Erro ao carregar agendamentos:', error);
      showError('Erro ao carregar agendamentos: ' + error.message);
      setAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  }, [sessionLoading, loadingPrimaryCompany, primaryCompanyId, selectedTab, selectedDate, selectedCollaboratorFilter]);

  const fetchCollaborators = useCallback(async () => {
    if (sessionLoading || loadingPrimaryCompany || !primaryCompanyId) {
      return;
    }
    const { data, error } = await supabase
      .from('collaborators')
      .select('id, first_name, last_name')
      .eq('company_id', primaryCompanyId)
      .order('first_name', { ascending: true });

    if (error) {
      console.error('Erro ao carregar colaboradores para filtro:', error);
    } else if (data) {
      setCollaboratorsList(data);
    }
  }, [sessionLoading, loadingPrimaryCompany, primaryCompanyId]);

  useEffect(() => {
    fetchCollaborators();
  }, [fetchCollaborators]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleOpenStatusModal = (id: string, status: string) => {
    setAppointmentToEditStatus({ id, status });
    setIsStatusModalOpen(true);
  };

  const handleStatusUpdated = () => {
    fetchAppointments(); // Re-fetch appointments to update the list
  };

  if (sessionLoading || loadingPrimaryCompany || loadingAppointments) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">Carregando agendamentos...</p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Você precisa estar logado para ver os agendamentos.</p>
      </div>
    );
  }

  if (!primaryCompanyId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-700 text-center mb-4">
          Você precisa ter uma empresa primária cadastrada para gerenciar agendamentos.
        </p>
        <Button
          className="!rounded-button whitespace-nowrap bg-yellow-600 hover:bg-yellow-700 text-black"
          onClick={() => navigate('/register-company')}
        >
          <i className="fas fa-building mr-2"></i>
          Cadastrar Empresa
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Agendamentos</h1>
        {createButton(() => navigate('/novo-agendamento'), 'fas fa-plus', 'Novo Agendamento')}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <Tabs defaultValue="dia" className="w-auto" onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dia">Dia</TabsTrigger>
            <TabsTrigger value="semana">Semana</TabsTrigger>
            <TabsTrigger value="mes">Mês</TabsTrigger>
          </TabsList>
        </Tabs>
        <select
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
          value={selectedCollaboratorFilter}
          onChange={(e) => setSelectedCollaboratorFilter(e.target.value)}
        >
          <option value="all">Todos os Colaboradores</option>
          {collaboratorsList.map(col => (
            <option key={col.id} value={col.id}>{col.first_name} {col.last_name}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4">
        {appointments.length === 0 ? (
          <p className="text-gray-600">Nenhum agendamento encontrado para {selectedTab === 'dia' ? 'o dia selecionado' : selectedTab === 'semana' ? 'a semana selecionada' : 'o mês selecionado'}.</p>
        ) : (
          appointments.map((agendamento) => {
            const clientName = agendamento.clients?.name || 'Cliente Desconhecido';
            const collaboratorName = agendamento.collaborators ? `${agendamento.collaborators.first_name} ${agendamento.collaborators.last_name}` : 'Colaborador Desconhecido';
            const serviceNames = agendamento.appointment_services
              .map(as => as.services?.name)
              .filter(Boolean)
              .join(' + ');

            // Calculate end time
            const startTime = parse(agendamento.appointment_time, 'HH:mm:ss', new Date());
            const endTime = addMinutes(startTime, agendamento.total_duration_minutes);
            const formattedTimeRange = `${format(startTime, 'HH:mm')} às ${format(endTime, 'HH:mm')}`;
            const formattedDate = format(parseISO(agendamento.appointment_date), 'dd/MM/yyyy', { locale: ptBR });


            const isFinalizedOrCanceled = agendamento.status === 'concluido' || agendamento.status === 'cancelado';

            return (
              <Card key={agendamento.id} className="border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 w-1/2">
                      <div className={`w-4 h-4 rounded-full ${getStatusColor(agendamento.status)}`}></div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {agendamento.client_nickname ? `${agendamento.client_nickname} (${clientName})` : clientName}
                        </h3>
                        <p className="text-sm text-gray-600">{serviceNames || 'Serviço(s) Desconhecido(s)'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end w-1/4">
                      <p className="font-semibold text-gray-900">{formattedDate}</p> {/* Display date here */}
                      <p className="font-semibold text-gray-900">{formattedTimeRange}</p>
                      <p className="text-sm text-gray-600">{collaboratorName}</p>
                    </div>
                    <div className="text-right w-1/4 flex flex-col items-end gap-1">
                      <p className="font-bold text-yellow-600">R$ {agendamento.total_price.toFixed(2).replace('.', ',')}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="!rounded-button whitespace-nowrap"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenStatusModal(agendamento.id, agendamento.status);
                        }}
                        disabled={isFinalizedOrCanceled}
                      >
                        <i className="fas fa-check-circle mr-2"></i>
                        Finalizar
                      </Button>
                      <Badge className={`${getStatusColor(agendamento.status)} text-white text-xs`}>
                        {agendamento.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="!rounded-button whitespace-nowrap"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/agendamentos/edit/${agendamento.id}`);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {appointmentToEditStatus && (
        <AppointmentStatusModal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          appointmentId={appointmentToEditStatus.id}
          currentStatus={appointmentToEditStatus.status}
          onStatusUpdated={handleStatusUpdated}
        />
      )}
    </div>
  );
};

export default AgendamentosPage;