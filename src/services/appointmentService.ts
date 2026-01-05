import { supabase } from '@/integrations/supabase/client';

interface GuestAppointmentData {
  company_id: string;
  client_id: string; // Virá do findOrCreateClient
  client_nickname: string; // Nome do convidado ficará aqui
  collaborator_id: string | null;
  appointment_date: string; // Formato YYYY-MM-DD
  appointment_time: string; // Formato HH:MM
  status: string;
  total_price: number;
  total_duration_minutes: number;
}

const DEFAULT_GUEST_CLIENT_ID = '229a877f-238d-4dee-8eca-f0efe4a24e59';

// Para agendamentos da página de convidado, sempre usamos o cliente padrão
// e colocamos o nome digitado no campo de apelido.
export async function findOrCreateClient(
  _companyId: string,
  name: string,
  _phone: string,
): Promise<{ clientId: string; clientNickname: string }> {
  return {
    clientId: DEFAULT_GUEST_CLIENT_ID,
    clientNickname: name,
  };
}

export async function createGuestAppointment(
  appointmentData: GuestAppointmentData,
  serviceId: string,
): Promise<string> {
  // 1. Cria o registro principal em `appointments` (sem coluna service_id)
  const { data: appointment, error: appointmentError } = await supabase
    .from('appointments')
    .insert([appointmentData])
    .select('id')
    .single();

  if (appointmentError) {
    console.error('Error creating guest appointment (appointments insert):', appointmentError);
    throw new Error('Erro ao criar agendamento de convidado.');
  }

  // 2. Vincula o serviço à tabela de junção `appointment_services`
  const { error: servicesLinkError } = await supabase
    .from('appointment_services')
    .insert({
      appointment_id: appointment.id,
      service_id: serviceId,
    });

  if (servicesLinkError) {
    console.error('Error linking service to guest appointment (appointment_services insert):', servicesLinkError);
    // Opcionalmente poderíamos remover o appointment criado para evitar órfãos,
    // mas por simplicidade apenas informamos o erro.
    throw new Error('Erro ao vincular serviço ao agendamento de convidado.');
  }

  return appointment.id;
}
