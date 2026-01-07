import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, startOfDay, isBefore, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { findOrCreateClient, createGuestAppointment } from '@/services/appointmentService';
import { getAvailableTimeSlots } from '@/utils/appointment-scheduling'; // Importação adicionada
import { showError, showSuccess } from '@/utils/toast';
import { Loader2 } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
}

interface Collaborator {
  id: string;
  first_name: string;
  last_name: string;
}

interface TimeSlot {
  time: string;
  is_available: boolean;
}

const GuestAppointmentPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();

  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [allowedServiceIds, setAllowedServiceIds] = useState<string[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableTimes, setAvailableTimes] = useState<TimeSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchingTimes, setFetchingTimes] = useState(false);

  const fetchServicesAndCollaborators = useCallback(async () => {
    if (!companyId) {
      console.log('fetchServicesAndCollaborators: companyId is null or undefined. Returning.'); // ADDED LOG
      return;
    }

    setLoading(true);
    console.log('fetchServicesAndCollaborators: Starting fetch for companyId:', companyId); // ADDED LOG
    try {
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('id, name, duration_minutes, price')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (servicesError) {
        console.error('fetchServicesAndCollaborators: Error fetching services:', servicesError); // ADDED LOG
        throw servicesError;
      }
      console.log('fetchServicesAndCollaborators: Fetched servicesData:', servicesData); // ADDED LOG
      setServices(servicesData as Service[]);

      const { data: collaboratorsData, error: collaboratorsError } = await supabase
        .from('collaborators')
        .select('id, first_name, last_name')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (collaboratorsError) {
        console.error('fetchServicesAndCollaborators: Error fetching collaborators:', collaboratorsError); // ADDED LOG
        throw collaboratorsError;
      }
      console.log('fetchServicesAndCollaborators: Fetched collaboratorsData:', collaboratorsData); // ADDED LOG
      setCollaborators(collaboratorsData as Collaborator[]);

    } catch (error: any) {
      showError('Erro ao carregar serviços ou colaboradores: ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
      console.log('fetchServicesAndCollaborators: Finished loading. Services count:', services.length, 'Collaborators count:', collaborators.length); // ADDED LOG
    }
  }, [companyId, services.length, collaborators.length]); // Adicionado services.length e collaborators.length para re-executar se o array mudar.

  useEffect(() => {
    if (companyId) {
      fetchServicesAndCollaborators();
    } else {
      showError('ID da empresa não encontrado na URL.');
      setLoading(false);
    }
  }, [companyId, fetchServicesAndCollaborators]);

  const fetchAvailableTimes = useCallback(async () => {
    if (!companyId || !selectedServiceId || !selectedDate || !selectedCollaboratorId) {
      setAvailableTimes([]);
      return;
    }

    setFetchingTimes(true);
    setSelectedTime(null);
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const service = services.find(s => s.id === selectedServiceId);

      if (!service) {
        showError('Serviço selecionado inválido.');
        setFetchingTimes(false);
        return;
      }

      const slots = await getAvailableTimeSlots(
        supabase,
        companyId,
        selectedCollaboratorId === "any" ? null : selectedCollaboratorId!,
        selectedDate,
        service.duration_minutes,
      );

      const formattedSlots = slots.map((startTime) => {
        // Converte o horário inicial (HH:mm) em um objeto Date baseado na data selecionada
        const [hour, minute] = startTime.split(':').map(Number);
        const startDateTime = new Date(selectedDate);
        startDateTime.setHours(hour, minute, 0, 0);

        // Calcula o horário final com base na duração do serviço
        const endDateTime = addMinutes(startDateTime, service.duration_minutes);

        const label = `${format(startDateTime, 'HH:mm')} - ${format(endDateTime, 'HH:mm')}`;
        return { time: label, is_available: true };
      });

      setAvailableTimes(formattedSlots);
    } catch (error: any) {
      showError('Erro ao buscar horários disponíveis: ' + error.message);
      console.error(error);
    } finally {
      setFetchingTimes(false);
    }
  }, [companyId, selectedServiceId, selectedCollaboratorId, selectedDate, services]);

  useEffect(() => {
    if (selectedServiceId && selectedCollaboratorId && selectedDate) {
        fetchAvailableTimes();
    }
  }, [fetchAvailableTimes, selectedServiceId, selectedCollaboratorId, selectedDate]);

  const handleCollaboratorChange = (value: string) => {
    setSelectedCollaboratorId(value === "any" ? null : value);
    setSelectedServiceId(null); // Reset service when collaborator changes
    setSelectedTime(null);
    setAvailableTimes([]);
  };

  const handleServiceChange = (value: string) => {
    setSelectedServiceId(value);
    setSelectedTime(null);
    setAvailableTimes([]);
  };

  // Carrega serviços permitidos para o colaborador selecionado (ou todos se "any")
  useEffect(() => {
    const loadAllowed = async () => {
      if (!selectedCollaboratorId || selectedCollaboratorId === "any") {
        setAllowedServiceIds([]);
        return;
      }
      const { data, error } = await supabase
        .from('collaborator_services')
        .select('service_id')
        .eq('company_id', companyId)
        .eq('collaborator_id', selectedCollaboratorId)
        .eq('active', true);
      if (error) {
        console.error('Erro ao carregar serviços permitidos:', error);
        showError('Erro ao carregar serviços permitidos para o colaborador.');
        setAllowedServiceIds([]);
        return;
      }
      setAllowedServiceIds((data || []).map((d: any) => d.service_id));
    };
    loadAllowed();
  }, [selectedCollaboratorId, services, companyId]);

  const handleDateSelect = (date: Date | undefined) => {
    const today = startOfDay(new Date());
    if (date && isBefore(date, today)) {
        toast.error("Não é possível agendar em datas passadas.");
        setSelectedDate(undefined);
        setSelectedTime(null);
        setAvailableTimes([]);
        return;
    }
    setSelectedDate(date);
    setSelectedTime(null);
    setAvailableTimes([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!companyId || !guestName || !guestPhone || !selectedServiceId || !selectedDate || !selectedTime || !selectedCollaboratorId) {
      showError('Por favor, preencha todos os campos obrigatórios.');
      setIsSubmitting(false);
      return;
    }

    try {
      const service = services.find(s => s.id === selectedServiceId);
      if (!service) {
        showError('Serviço selecionado inválido.');
        setIsSubmitting(false);
        return;
      }

      const { clientId, clientNickname } = await findOrCreateClient(companyId, guestName, guestPhone);

      const appointmentDateFormatted = format(selectedDate, 'yyyy-MM-dd');
      const startTimeForDb = selectedTime.split(' ')[0]; // "HH:MM" do intervalo "HH:MM às HH:MM"

      const newAppointmentId = await createGuestAppointment(
        {
          company_id: companyId,
          client_id: clientId,
          client_nickname: clientNickname, // Grava o nome do convidado
          collaborator_id: selectedCollaboratorId === "any" ? null : selectedCollaboratorId,
          appointment_date: appointmentDateFormatted,
          appointment_time: startTimeForDb,
          status: 'pendente',
          total_price: service.price,
          total_duration_minutes: service.duration_minutes,
        },
        selectedServiceId,
      );

      showSuccess('Agendamento realizado com sucesso como convidado!');
      navigate('/agendamento-confirmado/' + newAppointmentId);

    } catch (error: any) {
      showError('Erro ao agendar serviço: ' + error.message);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
        <p className="ml-2 text-gray-600">Carregando dados da empresa...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl bg-white shadow-md rounded-lg mt-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">Agendamento para Convidado</h1>
      <p className="text-gray-700 mb-6 text-center">Por favor, preencha seus dados e escolha o serviço para agendar.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados do Convidado */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Seus Dados</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="guestName">Nome Completo</Label>
              <Input
                id="guestName"
                type="text"
                placeholder="Seu nome completo"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="guestPhone">Telefone</Label>
              <Input
                id="guestPhone"
                type="tel"
                placeholder="(XX) XXXXX-XXXX"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        {/* Seleção de Colaborador */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Escolha o Colaborador</h2>
          <Select onValueChange={handleCollaboratorChange} disabled={isSubmitting || collaborators.length === 0}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Qualquer colaborador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Qualquer Colaborador</SelectItem>
              {collaborators.map(collaborator => (
                <SelectItem key={collaborator.id} value={collaborator.id}>
                  {collaborator.first_name} {collaborator.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {collaborators.length === 0 && !loading && (
            <p className="text-sm text-gray-500 mt-2">Nenhum colaborador ativo encontrado para esta empresa.</p>
          )}
        </div>

        {/* Seleção de Serviço */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Escolha seu Serviço</h2>
          <Select onValueChange={handleServiceChange} disabled={isSubmitting || services.length === 0 || (selectedCollaboratorId !== null && allowedServiceIds.length === 0)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione um serviço" />
            </SelectTrigger>
            <SelectContent>
              {services
                .filter(service => allowedServiceIds.includes(service.id))
                .map(service => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} (R$ {service.price.toFixed(2)}) ({service.duration_minutes} min)
                  </SelectItem>
                ))}
              {services.length > 0 && allowedServiceIds.length === 0 && selectedCollaboratorId && (
                <SelectItem value="no-allowed" disabled>
                  Nenhum serviço permitido para este colaborador.
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {services.length === 0 && !loading && (
            <p className="text-sm text-red-500 mt-2">Nenhum serviço ativo encontrado para esta empresa.</p>
          )}
          {selectedCollaboratorId && !selectedServiceId && (
            <p className="text-sm text-gray-600 mt-2">Selecione um serviço para continuar.</p>
          )}
        </div>

        {/* Seleção de Data e Hora */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Data e Hora</h2>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                initialFocus
                locale={ptBR}
                disabled={isSubmitting || !selectedServiceId || !selectedCollaboratorId}
                fromDate={startOfDay(new Date())}
              />
            </div>
            <div className="flex-grow space-y-4">
              <Label>Horários Disponíveis</Label>
              <div className="grid grid-cols-3 gap-2">
                {fetchingTimes ? (
                  <div className="col-span-3 flex justify-center items-center">
                    <Loader2 className="h-5 w-5 animate-spin text-yellow-600" />
                    <span className="ml-2 text-gray-600">Buscando horários...</span>
                  </div>
                ) : availableTimes.length > 0 ? (
                  availableTimes.map((slot) => (
                    <Button
                      key={slot.time}
                      variant={selectedTime === slot.time ? "default" : "outline"}
                      onClick={() => setSelectedTime(slot.time)}
                      type="button"
                      disabled={isSubmitting || !slot.is_available}
                      className={!slot.is_available ? "opacity-50 cursor-not-allowed" : ""}
                    >
                      {slot.time}
                    </Button>
                  ))
                ) : selectedDate && selectedServiceId && selectedCollaboratorId ? (
                  <p className="text-gray-500 col-span-3">Nenhum horário disponível para a data, colaborador e serviço selecionados.</p>
                ) : (
                  <p className="text-gray-500 col-span-3">Selecione um colaborador, serviço e uma data para ver os horários.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full bg-yellow-600 hover:bg-yellow-700 text-black !rounded-button" disabled={isSubmitting || !selectedTime}>
          {isSubmitting ? 'Agendando...' : 'Agendar Serviço'}
        </Button>
      </form>
    </div>
  );
};

export default GuestAppointmentPage;
