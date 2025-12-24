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

export async function findOrCreateClient(companyId: string, name: string, phone: string): Promise<string> {
  // 1. Tentar encontrar um cliente existente com o mesmo nome e telefone para a empresa
  const { data: existingClient, error: fetchError } = await supabase
    .from('clients')
    .select('id')
    .eq('company_id', companyId)
    .eq('name', name)
    .eq('phone', phone)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = No rows found
    console.error('Error finding client:', fetchError);
    throw new Error('Erro ao buscar cliente existente.');
  }

  if (existingClient) {
    return existingClient.id;
  }

  // 2. Se não encontrou, criar um novo cliente
  const { data: newClient, error: insertError } = await supabase
    .from('clients')
    .insert([
      { company_id: companyId, name: name, phone: phone, created_at: new Date().toISOString() }
    ])
    .select('id')
    .single();

  if (insertError) {
    console.error('Error creating new client:', insertError);
    throw new Error('Erro ao criar novo cliente.');
  }

  return newClient.id;
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
