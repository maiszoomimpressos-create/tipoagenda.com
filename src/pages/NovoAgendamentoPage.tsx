import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { usePrimaryCompany } from '@/hooks/usePrimaryCompany';
import { Calendar } from "@/components/ui/calendar"; // Importar Calendar
import { format, addMinutes, setHours, setMinutes, isBefore, isAfter, parseISO, parse } from 'date-fns'; // Importar funções de data
import { ptBR } from 'date-fns/locale'; // Importar locale para o calendário
import { getAvailableTimeSlots } from '@/utils/appointment-scheduling'; // Importar utilitário de agendamento

// Zod schema for new appointment registration
const newAppointmentSchema = z.object({
  clientId: z.string().min(1, "Cliente é obrigatório."),
  collaboratorId: z.string().min(1, "Colaborador é obrigatório."),
  serviceIds: z.array(z.string()).min(1, "Selecione pelo menos um serviço."),
  appointmentDate: z.string().min(1, "Data é obrigatória."),
  appointmentTime: z.string().min(1, "Horário é obrigatório."),
  paymentMethod: z.string().min(1, "Forma de pagamento é obrigatória."),
  observations: z.string().max(500, "Máximo de 500 caracteres.").optional(),
});

type NewAppointmentFormValues = z.infer<typeof newAppointmentSchema>;

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

const NovoAgendamentoPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();
  const { primaryCompanyId, loadingPrimaryCompany } = usePrimaryCompany();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [totalDurationMinutes, setTotalDurationMinutes] = useState(0);
  const [totalPriceCalculated, setTotalPriceCalculated] = useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NewAppointmentFormValues>({
    resolver: zodResolver(newAppointmentSchema),
    defaultValues: {
      clientId: '',
      collaboratorId: '',
      serviceIds: [],
      appointmentDate: '',
      appointmentTime: '',
      paymentMethod: 'dinheiro',
      observations: '',
    },
  });

  const selectedClientId = watch('clientId');
  const selectedCollaboratorId = watch('collaboratorId');
  const selectedServiceIds = watch('serviceIds');
  const selectedAppointmentTime = watch('appointmentTime');
  const selectedPaymentMethod = watch('paymentMethod');

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

    } catch (error: any) {
      console.error('Erro ao carregar dados iniciais:', error);
      showError('Erro ao carregar dados: ' + error.message);
    } finally {
      setLoadingData(false);
    }
  }, [sessionLoading, loadingPrimaryCompany, primaryCompanyId]);

  useEffect(() => {
    if (!session && !sessionLoading) {
      showError('Você precisa estar logado para criar agendamentos.');
      navigate('/login');
    }
    if (!primaryCompanyId && !loadingPrimaryCompany && session) {
      showError('Você precisa ter uma empresa primária cadastrada para criar agendamentos.');
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
        setValue('appointmentTime', ''); // Clear selected time when inputs change
        try {
          const slots = await getAvailableTimeSlots(
            supabase,
            primaryCompanyId,
            selectedCollaboratorId,
            selectedDate,
            totalDurationMinutes
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
        setValue('appointmentTime', '');
      }
    };
    fetchSlots();
  }, [selectedCollaboratorId, selectedDate, totalDurationMinutes, primaryCompanyId, setValue]);


  const handleServiceChange = (serviceId: string, checked: boolean) => {
    let currentServices = selectedServiceIds;
    if (checked) {
      currentServices = [...currentServices, serviceId];
    } else {
      currentServices = currentServices.filter((id) => id !== serviceId);
    }
    setValue('serviceIds', currentServices, { shouldValidate: true });
  };

  const onSubmit = async (data: NewAppointmentFormValues) => {
    setLoading(true);
    if (!session?.user || !primaryCompanyId) {
      showError('Erro de autenticação ou empresa primária não encontrada.');
      setLoading(false);
      return;
    }

    try {
      // 1. Create the main appointment entry
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          company_id: primaryCompanyId,
          client_id: data.clientId,
          collaborator_id: data.collaboratorId,
          appointment_date: data.appointmentDate,
          appointment_time: data.appointmentTime,
          total_duration_minutes: totalDurationMinutes,
          total_price: totalPriceCalculated,
          payment_method: data.paymentMethod,
          observations: data.observations,
          created_by_user_id: session.user.id,
          status: 'pendente', // Default status
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // 2. Link services to the appointment in appointment_services table
      const appointmentServicesToInsert = data.serviceIds.map(serviceId => ({
        appointment_id: appointmentData.id,
        service_id: serviceId,
      }));

      const { error: servicesLinkError } = await supabase
        .from('appointment_services')
        .insert(appointmentServicesToInsert);

      if (servicesLinkError) throw servicesLinkError;

      showSuccess('Agendamento criado com sucesso!');
      navigate('/agendamentos'); // Redirect to appointments list
    } catch (error: any) {
      console.error('Erro ao criar agendamento:', error);
      showError('Erro ao criar agendamento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (sessionLoading || loadingPrimaryCompany || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">Carregando dados para agendamento...</p>
      </div>
    );
  }

  if (!session?.user || !primaryCompanyId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-red-500 text-center mb-4">
          Você precisa estar logado e ter uma empresa primária para criar agendamentos.
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
        <h1 className="text-3xl font-bold text-gray-900">Novo Agendamento</h1>
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
                    disabled={(date) => isBefore(date, new Date())} // Disable past dates
                    className="rounded-md border shadow"
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
                <Label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-2">
                  Forma de Pagamento
                </Label>
                <Select onValueChange={(value) => setValue('paymentMethod', value, { shouldValidate: true })} value={selectedPaymentMethod}>
                  <SelectTrigger id="paymentMethod" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <SelectValue placeholder="Selecione a forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao-debito">Cartão de Débito</SelectItem>
                    <SelectItem value="cartao-credito">Cartão de Crédito</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                  </SelectContent>
                </Select>
                {errors.paymentMethod && <p className="text-red-500 text-xs mt-1">{errors.paymentMethod.message}</p>}
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
                  {loading ? 'Agendando...' : 'Agendar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NovoAgendamentoPage;