import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { usePrimaryCompany } from '@/hooks/usePrimaryCompany';
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, addMinutes, parse } from 'date-fns'; // Adicionado addMinutes e parse
import { ptBR } from 'date-fns/locale';
import { getAvailableTimeSlots } from '@/utils/appointment-scheduling';

// Zod schema for appointment editing
const editAppointmentSchema = z.object({
  clientId: z.string().min(1, "Cliente é obrigatório."),
  clientNickname: z.string().optional(), // Novo campo de apelido
  collaboratorId: z.string().min(1, "Colaborador é obrigatório."),
  serviceIds: z.array(z.string()).min(1, "Selecione pelo menos um serviço."),
  appointmentDate: z.string().min(1, "Data é obrigatória."),
  appointmentTime: z.string().min(1, "Horário é obrigatório."),
  observations: z.string().max(500, "Máximo de 500 caracteres.").optional(),
  status: z.enum(['pendente', 'confirmado', 'cancelado', 'concluido'], {
    errorMap: () => ({ message: "O status é obrigatório." })
  }),
});

type EditAppointmentFormValues = z.infer<typeof editAppointmentSchema>;

interface Client {
  id: string;
  name: string;
}

interface Collaborator {
  id: string;
  first_name: string;
  last_name: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

const EditAgendamentoPage: React.FC = () => {
  const navigate = useNavigate();
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { session, loading: sessionLoading } = useSession();
  const { primaryCompanyId, loadingPrimaryCompany } = usePrimaryCompany();
  const [loading, setLoading] = useState(false); // For form submission
  const [clients, setClients] = useState<Client[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingData, setLoadingData] = useState(true); // For initial data fetch
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [totalDurationMinutes, setTotalDurationMinutes] = useState(0);
  const [totalPriceCalculated, setTotalPriceCalculated] = useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditAppointmentFormValues>({
    resolver: zodResolver(editAppointmentSchema),
    defaultValues: {
      clientId: '',
      clientNickname: '', // Default value for new field
      collaboratorId: '',
      serviceIds: [],
      appointmentDate: '',
      appointmentTime: '',
      observations: '',
      status: 'pendente',
    },
  });

  const selectedClientId = watch('clientId');
  const selectedClientNickname = watch('clientNickname'); // Watch new field
  const selectedCollaboratorId = watch('collaboratorId');
  const selectedServiceIds = watch('serviceIds');
  const selectedAppointmentTime = watch('appointmentTime');
  const selectedStatus = watch('status');

  const fetchInitialData = useCallback(async () => {
    if (sessionLoading || loadingPrimaryCompany || !primaryCompanyId) {
      return;
    }

    setLoadingData(true);
    try {
      // Fetch Clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name')
        .eq('company_id', primaryCompanyId)
        .order('name', { ascending: true });

      if (clientsError) throw clientsError;
      setClients(clientsData);

      // Fetch Collaborators
      const { data: collaboratorsData, error: collaboratorsError } = await supabase
        .from('collaborators')
        .select('id, first_name, last_name')
        .eq('company_id', primaryCompanyId)
        .order('first_name', { ascending: true });

      if (collaboratorsError) throw collaboratorsError;
      setCollaborators(collaboratorsData);

      // Fetch Services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('id, name, price, duration_minutes')
        .eq('company_id', primaryCompanyId)
        .eq('status', 'Ativo') // Only active services
        .order('name', { ascending: true });

      if (servicesError) throw servicesError;
      setServices(servicesData);

      // Fetch existing appointment data if editing
      if (appointmentId) {
        const { data: appointmentData, error: appointmentError } = await supabase
          .from('appointments')
          .select(`
            id,
            client_id,
            client_nickname,
            collaborator_id,
            appointment_date,
            appointment_time,
            total_duration_minutes,
            total_price,
            observations,
            status,
            appointment_services(service_id)
          `)
          .eq('id', appointmentId)
          .eq('company_id', primaryCompanyId)
          .single();

        if (appointmentError) throw appointmentError;

        const parsedDate = parseISO(appointmentData.appointment_date);
        setSelectedDate(parsedDate);

        const currentServiceIds = appointmentData.appointment_services.map((as: any) => as.service_id);

        reset({
          clientId: appointmentData.client_id,
          clientNickname: appointmentData.client_nickname || '', // Load the new nickname field
          collaboratorId: appointmentData.collaborator_id,
          serviceIds: currentServiceIds,
          appointmentDate: appointmentData.appointment_date,
          appointmentTime: `${appointmentData.appointment_time.substring(0, 5)} às ${format(addMinutes(parse(appointmentData.appointment_time.substring(0,5), 'HH:mm', parsedDate), appointmentData.total_duration_minutes), 'HH:mm')}`,
          observations: appointmentData.observations || '',
          status: appointmentData.status as 'pendente' | 'confirmado' | 'cancelado' | 'concluido',
        });
        setTotalDurationMinutes(appointmentData.total_duration_minutes);
        setTotalPriceCalculated(appointmentData.total_price);
      }

    } catch (error: any) {
      console.error('Erro ao carregar dados iniciais ou agendamento:', error);
      showError('Erro ao carregar dados: ' + error.message);
    } finally {
      setLoadingData(false);
    }
  }, [sessionLoading, loadingPrimaryCompany, primaryCompanyId, appointmentId, reset]);

  useEffect(() => {
    if (!session && !sessionLoading) {
      showError('Você precisa estar logado para gerenciar agendamentos.');
      navigate('/login');
    }
    if (!primaryCompanyId && !loadingPrimaryCompany && session) {
      showError('Você precisa ter uma empresa primária cadastrada para gerenciar agendamentos.');
      navigate('/register-company');
    }
    fetchInitialData();
  }, [session, sessionLoading, primaryCompanyId, loadingPrimaryCompany, navigate, fetchInitialData]);

  // Effect to calculate total duration and price when services change
  useEffect(() => {
    const selected = services.filter(s => selectedServiceIds.includes(s.id));
    const duration = selected.reduce((sum, service) => sum + service.duration_minutes, 0);
    const price = selected.reduce((sum, service) => sum + service.price, 0);
    setTotalDurationMinutes(duration);
    setTotalPriceCalculated(price);
  }, [selectedServiceIds, services]);

  // Effect to fetch available time slots
  useEffect(() => {
    const fetchSlots = async () => {
      if (selectedCollaboratorId && selectedDate && totalDurationMinutes > 0 && primaryCompanyId) {
        setLoading(true);
        // setValue('appointmentTime', ''); // Clear selected time when inputs change, but not if it's the current one
        try {
          const slots = await getAvailableTimeSlots(
            supabase,
            primaryCompanyId,
            selectedCollaboratorId,
            selectedDate,
            totalDurationMinutes,
            30, // slotIntervalMinutes
            appointmentId // Pass the current appointment ID to exclude it from busy slots
          );
          setAvailableTimeSlots(slots);
        } catch (error: any) {
          console.error('Erro ao buscar horários disponíveis:', error);
          showError('Erro ao buscar horários disponíveis: ' + error.message);
          setAvailableTimeSlots([]);
        } finally {
          setLoading(false);
        }
      } else {
        setAvailableTimeSlots([]);
        // setValue('appointmentTime', '');
      }
    };
    fetchSlots();
  }, [selectedCollaboratorId, selectedDate, totalDurationMinutes, primaryCompanyId, setValue, appointmentId]);


  const handleServiceChange = (serviceId: string, checked: boolean) => {
    let currentServices = selectedServiceIds;
    if (checked) {
      currentServices = [...currentServices, serviceId];
    } else {
      currentServices = currentServices.filter((id) => id !== serviceId);
    }
    setValue('serviceIds', currentServices, { shouldValidate: true });
  };

  const onSubmit = async (data: EditAppointmentFormValues) => {
    setLoading(true);
    if (!session?.user || !primaryCompanyId || !appointmentId) {
      showError('Erro de autenticação ou dados da empresa/agendamento faltando.');
      setLoading(false);
      return;
    }

    try {
      const startTimeForDb = data.appointmentTime.split(' ')[0];

      // 1. Update the main appointment entry
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({
          client_id: data.clientId,
          client_nickname: data.clientNickname, // Save the new nickname field
          collaborator_id: data.collaboratorId,
          appointment_date: data.appointmentDate,
          appointment_time: startTimeForDb,
          total_duration_minutes: totalDurationMinutes,
          total_price: totalPriceCalculated,
          observations: data.observations,
          status: data.status,
        })
        .eq('id', appointmentId)
        .eq('company_id', primaryCompanyId);

      if (appointmentError) throw appointmentError;

      // 2. Update linked services in appointment_services table
      // First, delete all existing services for this appointment
      const { error: deleteServicesError } = await supabase
        .from('appointment_services')
        .delete()
        .eq('appointment_id', appointmentId);

      if (deleteServicesError) throw deleteServicesError;

      // Then, insert the newly selected services
      const appointmentServicesToInsert = data.serviceIds.map(serviceId => ({
        appointment_id: appointmentId,
        service_id: serviceId,
      }));

      const { error: insertServicesError } = await supabase
        .from('appointment_services')
        .insert(appointmentServicesToInsert);

      if (insertServicesError) throw insertServicesError;

      showSuccess('Agendamento atualizado com sucesso!');
      navigate('/agendamentos');
    } catch (error: any) {
      console.error('Erro ao atualizar agendamento:', error);
      showError('Erro ao atualizar agendamento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (sessionLoading || loadingPrimaryCompany || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">Carregando dados do agendamento...</p>
      </div>
    );
  }

  if (!session?.user || !primaryCompanyId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-red-500 text-center mb-4">
          Você precisa estar logado e ter uma empresa primária para gerenciar agendamentos.
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
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          className="!rounded-button cursor-pointer"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Editar Agendamento</h1>
      </div>
      <div className="max-w-2xl">
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-2">
                    Cliente *
                  </Label>
                  <Select onValueChange={(value) => setValue('clientId', value, { shouldValidate: true })} value={selectedClientId}>
                    <SelectTrigger id="clientId" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.length === 0 ? (
                        <SelectItem value="no-clients" disabled>Nenhum cliente disponível.</SelectItem>
                      ) : (
                        clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.clientId && <p className="text-red-500 text-xs mt-1">{errors.clientId.message}</p>}
                </div>
                <div>
                  <Label htmlFor="clientNickname" className="block text-sm font-medium text-gray-700 mb-2">
                    Apelido (Opcional)
                  </Label>
                  <Input
                    id="clientNickname"
                    type="text"
                    placeholder="Apelido do cliente"
                    {...register('clientNickname')}
                    className="mt-1 border-gray-300 text-sm"
                  />
                  {errors.clientNickname && <p className="text-red-500 text-xs mt-1">{errors.clientNickname.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="collaboratorId" className="block text-sm font-medium text-gray-700 mb-2">
                    Colaborador *
                  </Label>
                  <Select onValueChange={(value) => setValue('collaboratorId', value, { shouldValidate: true })} value={selectedCollaboratorId}>
                    <SelectTrigger id="collaboratorId" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <SelectValue placeholder="Selecione o colaborador" />
                    </SelectTrigger>
                    <SelectContent>
                      {collaborators.length === 0 ? (
                        <SelectItem value="no-collaborators" disabled>Nenhum colaborador disponível.</SelectItem>
                      ) : (
                        collaborators.map((collab) => (
                          <SelectItem key={collab.id} value={collab.id}>
                            {collab.first_name} {collab.last_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.collaboratorId && <p className="text-red-500 text-xs mt-1">{errors.collaboratorId.message}</p>}
                </div>
              </div>
              
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  Serviços *
                </Label>
                <div className="space-y-2">
                  {services.length === 0 ? (
                    <p className="text-gray-600 text-sm">Nenhum serviço ativo disponível.</p>
                  ) : (
                    services.map((service) => (
                      <div key={service.id} className="flex items-center">
                        <Checkbox
                          id={`service-${service.id}`}
                          checked={selectedServiceIds.includes(service.id)}
                          onCheckedChange={(checked) => handleServiceChange(service.id, !!checked)}
                          className="mr-2"
                        />
                        <Label htmlFor={`service-${service.id}`} className="text-sm">
                          {service.name} - R$ {service.price.toFixed(2).replace('.', ',')} ({service.duration_minutes} min)
                        </Label>
                      </div>
                    ))
                  )}
                </div>
                {errors.serviceIds && <p className="text-red-500 text-xs mt-1">{errors.serviceIds.message}</p>}
                {totalDurationMinutes > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    Duração total: {totalDurationMinutes} min | Preço total: R$ {totalPriceCalculated.toFixed(2).replace('.', ',')}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="appointmentDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Data *
                  </Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setValue('appointmentDate', date ? format(date, 'yyyy-MM-dd') : '', { shouldValidate: true });
                    }}
                    initialFocus
                    locale={ptBR}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} // Disable past dates
                    className="rounded-md border shadow w-full"
                  />
                  {errors.appointmentDate && <p className="text-red-500 text-xs mt-1">{errors.appointmentDate.message}</p>}
                </div>
                <div>
                  <Label htmlFor="appointmentTime" className="block text-sm font-medium text-gray-700 mb-2">
                    Horário *
                  </Label>
                  <Select onValueChange={(value) => setValue('appointmentTime', value, { shouldValidate: true })} value={selectedAppointmentTime}>
                    <SelectTrigger id="appointmentTime" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" disabled={!selectedCollaboratorId || !selectedDate || totalDurationMinutes === 0 || loading}>
                      <SelectValue placeholder={loading ? "Buscando horários..." : "Selecione o horário"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTimeSlots.length === 0 ? (
                        <SelectItem value="no-slots" disabled>Nenhum horário disponível.</SelectItem>
                      ) : (
                        availableTimeSlots.map((timeSlot) => (
                          <SelectItem key={timeSlot} value={timeSlot}>
                            {timeSlot}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.appointmentTime && <p className="text-red-500 text-xs mt-1">{errors.appointmentTime.message}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  Status do Agendamento *
                </Label>
                <Select onValueChange={(value) => setValue('status', value as 'pendente' | 'confirmado' | 'cancelado' | 'concluido', { shouldValidate: true })} value={selectedStatus}>
                  <SelectTrigger id="status" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="confirmado">Confirmado</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status.message}</p>}
              </div>
              
              <div>
                <Label htmlFor="observations" className="block text-sm font-medium text-gray-700 mb-2">
                  Observações
                </Label>
                <Textarea
                  id="observations"
                  maxLength={500}
                  {...register('observations')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-24 resize-none"
                  placeholder="Observações sobre o agendamento..."
                ></Textarea>
                {errors.observations && <p className="text-red-500 text-xs mt-1">{errors.observations.message}</p>}
              </div>
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="!rounded-button whitespace-nowrap cursor-pointer flex-1"
                  onClick={() => navigate(-1)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="!rounded-button whitespace-nowrap cursor-pointer bg-yellow-600 hover:bg-yellow-700 text-black flex-1"
                  disabled={loading || !selectedCollaboratorId || !selectedDate || totalDurationMinutes === 0 || availableTimeSlots.length === 0}
                >
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditAgendamentoPage;