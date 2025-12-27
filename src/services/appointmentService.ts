import { supabase } from '@/integrations/supabase/client';

interface GuestAppointmentData {
  company_id: string;
  client_id: string; // Virá do findOrCreateClient
  service_id: string;
  collaborator_id: string | null;
  appointment_date: string; // Formato YYYY-MM-DD
  appointment_time: string; // Formato HH:MM
  status: string;
  total_price: number;
  total_duration_minutes: number;
}

export async function findOrCreateClient(companyId: string, name: string, phone: string): Promise<{ clientId: string; clientNickname: string }> { // Retorna um objeto com clientId e clientNickname
  const response = await fetch(`${supabase.supabaseUrl}/functions/v1/get-default-guest-client`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabase.supabaseKey}`, // Use anon key for Edge Function call
    },
    body: JSON.stringify({ name }), // Apenas o nome é necessário
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Error calling get-default-guest-client Edge Function:', errorData);
    throw new Error('Failed to get default guest client: ' + errorData.error);
  }

  const { clientId, clientNickname } = await response.json();
  return { clientId, clientNickname };
}

export async function createGuestAppointment(appointmentData: GuestAppointmentData): Promise<string> {
  const { data, error } = await supabase
    .from('appointments')
    .insert([appointmentData])
    .select('id')
    .single();

  if (error) {
    console.error('Error creating guest appointment:', error);
    throw new Error('Erro ao criar agendamento de convidado.');
  }

  return data.id;
}
