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

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function formatPhoneBR(value: string) {
  const digits = onlyDigits(value).slice(0, 13); // Permitir até 13 dígitos (55 + DDD + número)
  
  if (!digits) return '';
  
  // Se tiver DDI (55), formatar como +55 (XX) XXXXX-XXXX
  if (digits.startsWith('55') && digits.length >= 12) {
    const ddi = digits.slice(0, 2);
    const ddd = digits.slice(2, 4);
    const part1 = digits.slice(4, 9);
    const part2 = digits.slice(9, 13);
    return `+${ddi} (${ddd}) ${part1}-${part2}`;
  }
  
  // Formato brasileiro padrão (sem DDI)
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  
  if (digits.length < 3) return `(${digits}`;

  // 10 dígitos: (DD) XXXX-XXXX
  if (digits.length <= 10) {
    const part1 = rest.slice(0, 4);
    const part2 = rest.slice(4, 8);
    return `(${ddd})${part2 ? ` ${part1}-${part2}` : ` ${part1}`}`.trim();
  }

  // 11 dígitos: (DD) XXXXX-XXXX
  const part1 = rest.slice(0, 5);
  const part2 = rest.slice(5, 9);
  return `(${ddd}) ${part1}-${part2}`;
}

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
  const [allServices, setAllServices] = useState<Service[]>([]); // Todos os serviços da empresa
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string | null>(null);
  const [selectedCollaboratorValue, setSelectedCollaboratorValue] = useState<string>("any");
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
      setAllServices(servicesData as Service[]); // Guardar todos os serviços
      // Inicialmente mostrar todos os serviços (já que "any" é o padrão)
      setServices(servicesData as Service[]);

      const { data: collaboratorsData, error: collaboratorsError } = await supabase
        .from('collaborators')
        .select(`
          id,
          first_name,
          last_name,
          role_type_id,
          role_types(description)
        `)
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (collaboratorsError) {
        console.error('fetchServicesAndCollaborators: Error fetching collaborators:', collaboratorsError); // ADDED LOG
        throw collaboratorsError;
      }
      console.log('fetchServicesAndCollaborators: Fetched collaboratorsData (raw):', collaboratorsData); // ADDED LOG

      const professionalCollaborators = (collaboratorsData || []).filter((col: any) => {
        const roleDescription = (col.role_types as { description?: string } | null)?.description || '';
        return roleDescription.toLowerCase().includes('colaborador');
      });

      const mappedCollaborators: Collaborator[] = professionalCollaborators.map((col: any) => ({
        id: col.id,
        first_name: col.first_name,
        last_name: col.last_name,
      }));

      console.log('fetchServicesAndCollaborators: Fetched collaboratorsData (filtered by role=Colaborador):', mappedCollaborators); // ADDED LOG
      setCollaborators(mappedCollaborators);

    } catch (error: any) {
      showError('Erro ao carregar serviços ou colaboradores: ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
      console.log('fetchServicesAndCollaborators: Finished loading. Services count:', services.length, 'Collaborators count:', collaborators.length); // ADDED LOG
    }
  }, [companyId]); // Removido services.length e collaborators.length para evitar loop infinito

  useEffect(() => {
    if (companyId) {
      fetchServicesAndCollaborators();
    } else {
      showError('ID da empresa não encontrado na URL.');
      setLoading(false);
    }
  }, [companyId, fetchServicesAndCollaborators]);

  const fetchAvailableTimes = useCallback(async () => {
    // Permitir buscar horários mesmo quando "any" está selecionado
    const hasCollaborator = selectedCollaboratorId || selectedCollaboratorValue === "any";
    
    if (!companyId || !selectedServiceId || !selectedDate || !hasCollaborator) {
      console.log('GuestAppointmentPage.fetchAvailableTimes: pré-condições não atendidas', {
        companyId,
        selectedServiceId,
        selectedDate,
        selectedCollaboratorId,
        selectedCollaboratorValue,
      });
      setAvailableTimes([]);
      return;
    }

    setFetchingTimes(true);
    setSelectedTime(null);
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      console.log('GuestAppointmentPage.fetchAvailableTimes: buscando horários com parâmetros:', {
        companyId,
        selectedServiceId,
        selectedCollaboratorId,
        formattedDate,
      });
      const service = services.find(s => s.id === selectedServiceId);

      if (!service) {
        showError('Serviço selecionado inválido.');
        setFetchingTimes(false);
        return;
      }

      const slots = await getAvailableTimeSlots(
        supabase,
        companyId,
        selectedCollaboratorId === "any" ? null : selectedCollaboratorId! ,
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
    const hasCollaborator = selectedCollaboratorId || selectedCollaboratorValue === "any";
    if (selectedServiceId && hasCollaborator && selectedDate) {
        fetchAvailableTimes();
    }
  }, [fetchAvailableTimes, selectedServiceId, selectedCollaboratorId, selectedCollaboratorValue, selectedDate]);

  // Filtrar serviços baseado no colaborador selecionado
  useEffect(() => {
    const loadServicesForCollaborator = async () => {
      if (!companyId) {
        setServices([]);
        return;
      }

      // Se ainda não carregou os serviços, aguardar
      if (allServices.length === 0) {
        console.log('⏳ Aguardando carregamento de serviços...');
        return;
      }

      // Validar companyId
      if (!companyId) {
        console.error('❌ companyId não encontrado!');
        setServices([]);
        return;
      }

      // Se "Qualquer colaborador" foi selecionado, mostrar todos os serviços
      if (!selectedCollaboratorId || selectedCollaboratorValue === "any") {
        console.log('✅ Mostrando todos os serviços (qualquer colaborador selecionado)');
        setServices(allServices);
        return;
      }

      // Validar collaboratorId
      if (!selectedCollaboratorId) {
        console.error('❌ selectedCollaboratorId não encontrado!');
        setServices([]);
        return;
      }

      // Buscar serviços permitidos para o colaborador selecionado
      try {
        console.log('🔍 Buscando serviços para colaborador:', {
          companyId,
          collaboratorId: selectedCollaboratorId,
          allServicesCount: allServices.length
        });

        const { data: allowedServices, error } = await supabase
          .from('collaborator_services')
          .select('service_id')
          .eq('company_id', companyId)
          .eq('collaborator_id', selectedCollaboratorId)
          .eq('active', true);

        console.log('📊 Resultado da query collaborator_services:', {
          data: allowedServices,
          error: error,
          count: allowedServices?.length || 0
        });

        if (error) {
          console.error('❌ Erro ao buscar serviços do colaborador:', error);
          // Em caso de erro, não exibir serviços para evitar agendamento incorreto
          setServices([]);
          setSelectedServiceId(null);
          return;
        }

        const allowedServiceIds = (allowedServices || []).map((s: any) => s.service_id);
        
        console.log(`✅ Serviços permitidos para colaborador ${selectedCollaboratorId}:`, allowedServiceIds);
        console.log(`📋 Total de serviços permitidos: ${allowedServiceIds.length}`);

        // Se não houver serviços cadastrados na tabela collaborator_services para este colaborador,
        // não exibir nenhum serviço (evita agendamentos indevidos)
        if (allowedServiceIds.length === 0) {
          console.log('⚠️ Nenhum serviço cadastrado na tabela collaborator_services para este colaborador. Não exibindo serviços.');
          setServices([]);
          setSelectedServiceId(null);
          return;
        }
        
        // Filtrar serviços permitidos
        const filteredServices = allServices.filter(service => 
          allowedServiceIds.includes(service.id)
        );

        console.log(`🎯 Serviços filtrados: ${filteredServices.length} de ${allServices.length}`);
        console.log('📝 Serviços filtrados:', filteredServices.map(s => ({ id: s.id, name: s.name })));

        setServices(filteredServices);
        setSelectedServiceId(null); // Reset service selection
      } catch (error: any) {
        console.error('Erro ao carregar serviços do colaborador:', error);
        setServices([]);
      }
    };

    loadServicesForCollaborator();
  }, [selectedCollaboratorId, selectedCollaboratorValue, companyId, allServices]);

  const handleCollaboratorChange = (value: string) => {
    setSelectedCollaboratorValue(value);
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

    const guestPhoneDigits = onlyDigits(guestPhone);
    // Aceitar 10 dígitos (DDD + número), 11 dígitos (DDD + número com 9), ou 13 dígitos (55 + DDD + número)
    if (guestPhoneDigits.length !== 10 && guestPhoneDigits.length !== 11 && guestPhoneDigits.length !== 13) {
      showError('Telefone inválido. Informe DDD + número (10 ou 11 dígitos) ou com DDI (13 dígitos).');
      setIsSubmitting(false);
      return;
    }

    if (!companyId || !guestName || !guestPhone || !selectedServiceId || !selectedDate || (!selectedCollaboratorId && selectedCollaboratorValue !== "any") || !selectedTime) {
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
                onChange={(e) => setGuestPhone(formatPhoneBR(e.target.value))}
                required
                disabled={isSubmitting}
                inputMode="numeric"
                autoComplete="tel"
                maxLength={15}
              />
            </div>
          </div>
        </div>

        {/* Seleção de Colaborador */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Escolha o Colaborador</h2>
          <Select 
            onValueChange={handleCollaboratorChange} 
            value={selectedCollaboratorValue}
            disabled={isSubmitting || collaborators.length === 0}
          >
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
            <p className="text-sm text-gray-500 mt-2">Nenhum profissional disponível para esta empresa.</p>
          )}
        </div>

        {/* Seleção de Serviço */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Escolha seu Serviço</h2>
          <Select 
            onValueChange={handleServiceChange} 
            value={selectedServiceId || ""} 
            disabled={isSubmitting || services.length === 0 || (!selectedCollaboratorId && selectedCollaboratorValue !== "any")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione um serviço" />
            </SelectTrigger>
            <SelectContent>
              {services.map(service => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name} (R$ {service.price.toFixed(2)}) ({service.duration_minutes} min)
                </SelectItem>
              ))}
              {services.length === 0 && selectedCollaboratorValue !== "any" && (
                <SelectItem value="no-services" disabled>
                  Nenhum serviço disponível para este colaborador
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {services.length === 0 && !loading && selectedCollaboratorValue !== "any" && (
            <p className="text-sm text-red-500 mt-2">Nenhum serviço disponível para o colaborador selecionado.</p>
          )}
          {selectedCollaboratorValue === "any" && allServices.length === 0 && !loading && (
            <p className="text-sm text-red-500 mt-2">Nenhum serviço ativo encontrado para esta empresa.</p>
          )}
          {(selectedCollaboratorId || selectedCollaboratorValue === "any") && !selectedServiceId && services.length > 0 && (
            <p className="text-sm text-gray-600 mt-2">Selecione um serviço para continuar.</p>
          )}
          {selectedCollaboratorValue === "" && (
            <p className="text-sm text-gray-600 mt-2">Selecione um colaborador para ver os serviços disponíveis.</p>
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
                disabled={isSubmitting || !selectedServiceId || (!selectedCollaboratorId && selectedCollaboratorValue !== "any")}
                fromDate={startOfDay(new Date())}
              />
            </div>
            <div className="flex-grow space-y-4">
              <Label htmlFor="selectedTime" className="block text-sm font-medium text-gray-700 mb-2">Horário *</Label>
              <div className="grid grid-cols-3 gap-2">
                {fetchingTimes ? (
                  <p className="text-gray-500 col-span-3 text-center">Buscando horários...</p>
                ) : availableTimes.length > 0 ? (
                  availableTimes.map((slot) => (
                    <Button
                      key={slot.time}
                      type="button"
                      variant={selectedTime === slot.time ? "default" : "outline"}
                      className="text-sm"
                      onClick={() => setSelectedTime(slot.time)}
                      disabled={isSubmitting || !slot.is_available || services.find(s => s.id === selectedServiceId)?.duration_minutes === 0}
                    >
                      {slot.time}
                    </Button>
                  ))
                ) : selectedDate && selectedServiceId && (selectedCollaboratorId || selectedCollaboratorValue === "any") ? (
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
