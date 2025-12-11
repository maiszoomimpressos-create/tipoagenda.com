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
import { Calendar } from "@/components/ui/calendar";
import { format, addMinutes, startOfDay, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAvailableTimeSlots } from '@/utils/appointment-scheduling';
import { getTargetCompanyId, clearTargetCompanyId } from '@/utils/storage'; // Import storage utils

// Zod schema for new appointment registration
const clientAppointmentSchema = z.object({
  collaboratorId: z.string().min(1, "Colaborador é obrigatório."),
  serviceIds: z.array(z.string()).min(1, "Selecione pelo menos um serviço."),
  appointmentDate: z.string().min(1, "Data é obrigatória."),
  appointmentTime: z.string().min(1, "Horário é obrigatório."),
  observations: z.string().max(500, "Máximo de 500 caracteres.").optional(),
});

type ClientAppointmentFormValues = z.infer<typeof clientAppointmentSchema>;

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

const ClientAppointmentForm: React.FC = () => {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();
  const [loading, setLoading] = useState(false); // For form submission
  const [clientContext, setClientContext] = useState<{ clientId: string; companyId: string; clientName: string } | null>(null);
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
    formState: { errors },
  } = useForm<ClientAppointmentFormValues>({
    resolver: zodResolver(clientAppointmentSchema),
    defaultValues: {
      collaboratorId: '',
      serviceIds: [],
      appointmentDate: '',
      appointmentTime: '',
      observations: '',
    },
  });

  const selectedCollaboratorId = watch('collaboratorId');
  const selectedServiceIds = watch('serviceIds');
  const selectedAppointmentTime = watch('appointmentTime');

  const fetchInitialData = useCallback(async () => {
    if (sessionLoading || !session?.user) {
      return;
    }

    setLoadingData(true);
    try {
      // 1. Determine the target company ID
      const targetCompanyId = getTargetCompanyId();
      
      // 2. Fetch client's own data to get their client_id and associated company_id
      const { data: clientProfile, error: clientProfileError } = await supabase
        .from('clients')
        .select('id, company_id, name')
        .eq('client_auth_id', session.user.id)
        .single();

      if (clientProfileError) {
        if (clientProfileError.code === 'PGRST116') {
          throw new Error('Seu perfil de cliente não foi encontrado. Por favor, tente fazer login novamente ou entre em contato com o suporte.');
        }
        throw clientProfileError;
      }
      
      if (!clientProfile) {
        throw new Error('Seu perfil de cliente não foi encontrado.');
      }

      // Use the targetCompanyId if set, otherwise use the client's default company_id
      const companyIdToUse = targetCompanyId || clientProfile.company_id;

      if (!companyIdToUse) {
        // If the client profile exists but has no associated company, we cannot proceed with booking.
        throw new Error('Você não está associado a uma empresa. Por favor, selecione uma empresa na página inicial.');
      }

      setClientContext({ 
        clientId: clientProfile.id, 
        companyId: companyIdToUse, 
        clientName: clientProfile.name 
      });

      // 3. Fetch Collaborators for the selected company
      const { data: collaboratorsData, error: collaboratorsError } = await supabase
        .from('collaborators')
        .select('id, first_name, last_name')
        .eq('company_id', companyIdToUse)
        .eq('status', 'Ativo')
        .order('first_name', { ascending: true });

      if (collaboratorsError) throw collaboratorsError;
      setCollaborators(collaboratorsData);

      // 4. Fetch Services for the selected company
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('id, name, price, duration_minutes')
        .eq('company_id', companyIdToUse)
        .eq('status', 'Ativo')
        .order('name', { ascending: true });

      if (servicesError) throw servicesError;
      setServices(servicesData);

      // 5. Clear the target ID from storage once the context is established
      if (targetCompanyId) {
        clearTargetCompanyId();
      }

    } catch (error: any) {
      console.error('Erro ao carregar dados iniciais para agendamento do cliente:', error);
      showError('Erro ao carregar dados: ' + error.message);
      navigate('/meus-agendamentos'); // Redirect to list if setup fails
    } finally {
      setLoadingData(false);
    }
  }, [session, sessionLoading, navigate]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

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
      if (selectedCollaboratorId && selectedDate && totalDurationMinutes > 0 && clientContext?.companyId) {
        setLoading(true);
        setValue('appointmentTime', ''); // Clear selected time when inputs change
        try {
          const slots = await getAvailableTimeSlots(
            supabase,
            clientContext.companyId,
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
  }, [selectedCollaboratorId, selectedDate, totalDurationMinutes, clientContext?.companyId, setValue]);


  const handleServiceChange = (serviceId: string, checked: boolean) => {
    let currentServices = selectedServiceIds;
    if (checked) {
      currentServices = [...currentServices, serviceId];
    } else {
      currentServices = currentServices.filter((id) => id !== serviceId);
    }
    setValue('serviceIds', currentServices, { shouldValidate: true });
  };

  const onSubmit = async (data: ClientAppointmentFormValues) => {
    setLoading(true);
    if (!session?.user || !clientContext?.clientId || !clientContext?.companyId) {
      showError('Erro de autenticação ou dados do cliente/empresa faltando.');
      setLoading(false);
      return;
    }

    try {
      const startTimeForDb = data.appointmentTime.split(' ')[0];

      const response = await supabase.functions.invoke('book-appointment', {
        body: JSON.stringify({
          clientId: clientContext.clientId,
          clientNickname: clientContext.clientName, // Use client's name as nickname for now
          collaboratorId: data.collaboratorId,
          serviceIds: data.serviceIds,
          appointmentDate: data.appointmentDate,
          appointmentTime: startTimeForDb,
          totalDurationMinutes: totalDurationMinutes,
          totalPriceCalculated: totalPriceCalculated,
          observations: data.observations,
          companyId: clientContext.companyId, // Use the company ID determined in fetchInitialData
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        let edgeFunctionErrorMessage = 'Erro desconhecido da Edge Function.';
        if (response.error.context && response.error.context.data && response.error.context.data.error) {
          edgeFunctionErrorMessage = response.error.context.data.error;
        } else if (response.error.message) {
          edgeFunctionErrorMessage = response.error.message;
        }
        throw new Error(edgeFunctionErrorMessage);
      }

      showSuccess('Agendamento criado com sucesso!');
      navigate('/meus-agendamentos'); // Redirect to client's appointments list
    } catch (error: any) {
      console.error('Erro ao criar agendamento:', error);
      showError('Erro ao criar agendamento: ' + (error.message || 'Erro desconhecido.'));
    } finally {
      setLoading(false);
    }
  };

  if (sessionLoading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">Carregando dados para agendamento...</p>
      </div>
    );
  }

  if (!session?.user || !clientContext) {
    // If clientContext is null here, it means fetchInitialData failed to find the client profile or company association.
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-red-500 text-center mb-4">
          Não foi possível carregar seu perfil de cliente ou empresa associada. Por favor, tente novamente ou entre em contato com o suporte.
        </p>
        <Button
          className="!rounded-button whitespace-nowrap bg-yellow-600 hover:bg-yellow-700 text-black"
          onClick={() => navigate('/meus-agendamentos')}
        >
          <i className="fas fa-sign-in-alt mr-2"></i>
          Voltar para Meus Agendamentos
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
          onClick={() => navigate('/meus-agendamentos')}
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
                    disabled={(date) => isBefore(date, startOfDay(new Date()))} // Disable dates before today
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
                  onClick={() => navigate('/meus-agendamentos')} // Navigate back to client's list
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

export default ClientAppointmentForm;