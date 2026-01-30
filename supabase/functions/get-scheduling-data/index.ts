import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.0';
import { format, parse, getDay } from 'https://esm.sh/date-fns@3.6.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyId, collaboratorId, date: rawDate, excludeAppointmentId } = await req.json();

    if (!companyId || !collaboratorId || !rawDate) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Parse date from YYYY-MM-DD string to avoid timezone issues
    // Se vier como ISO string, parse como ISO. Se vier como YYYY-MM-DD, parse como YYYY-MM-DD
    let date: Date;
    if (typeof rawDate === 'string' && rawDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // É formato YYYY-MM-DD, parse diretamente
      date = parse(rawDate, 'yyyy-MM-dd', new Date());
    } else {
      // É ISO string ou outro formato, converter
      date = new Date(rawDate);
    }
    
    const formattedDate = format(date, 'yyyy-MM-dd');
    const selectedDayOfWeek = getDay(date); // 0 for Sunday, 1 for Monday, etc.
    
    console.log('get-scheduling-data: Received date:', rawDate, 'parsed:', formattedDate, 'dayOfWeek:', selectedDayOfWeek);

    // Create a Supabase client with the service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Fetch working schedules (sempre buscar dados atualizados)
    console.log('get-scheduling-data: Buscando working schedules em:', new Date().toISOString());
    const { data: workingSchedules, error: wsError } = await supabaseAdmin
      .from('working_schedules')
      .select('id, day_of_week, start_time, end_time')
      .eq('collaborator_id', collaboratorId)
      .eq('company_id', companyId)
      .eq('day_of_week', selectedDayOfWeek)
      .order('start_time', { ascending: true });

    if (wsError) {
      console.error('Edge Function Error (get-scheduling-data): Error fetching working schedules:', wsError);
      return new Response(JSON.stringify({ error: wsError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }
    console.log('get-scheduling-data: workingSchedules encontrados:', workingSchedules?.length || 0);

    // Fetch schedule exceptions (sempre buscar dados atualizados)
    console.log('get-scheduling-data: Buscando schedule exceptions em:', new Date().toISOString());
    const { data: exceptions, error: exError } = await supabaseAdmin
      .from('schedule_exceptions')
      .select('id, exception_date, is_day_off, start_time, end_time, reason')
      .eq('collaborator_id', collaboratorId)
      .eq('company_id', companyId)
      .eq('exception_date', formattedDate)
      .order('start_time', { ascending: true });

    if (exError) {
      console.error('Edge Function Error (get-scheduling-data): Error fetching schedule exceptions:', exError);
      return new Response(JSON.stringify({ error: exError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }
    console.log('get-scheduling-data: exceptions encontradas:', exceptions?.length || 0);

    // Fetch existing appointments (SEMPRE buscar dados atualizados)
    console.log('get-scheduling-data: Buscando appointments em:', new Date().toISOString());
    let appointmentsQuery = supabaseAdmin
      .from('appointments')
      .select('id, appointment_time, total_duration_minutes, status, created_at, updated_at')
      .eq('collaborator_id', collaboratorId)
      .eq('company_id', companyId)
      .eq('appointment_date', formattedDate)
      .neq('status', 'cancelado')
      .order('appointment_time', { ascending: true });

    if (excludeAppointmentId) {
      appointmentsQuery = appointmentsQuery.neq('id', excludeAppointmentId);
      console.log('get-scheduling-data: Excluindo appointment ID:', excludeAppointmentId);
    }

    const { data: existingAppointments, error: appError } = await appointmentsQuery;
    console.log('get-scheduling-data: appointments encontrados:', existingAppointments?.length || 0);

    if (appError) {
      console.error('Edge Function Error (get-scheduling-data): Error fetching existing appointments:', appError);
      return new Response(JSON.stringify({ error: appError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({
      workingSchedules,
      exceptions,
      existingAppointments,
    }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (error: any) {
    console.error('Edge Function Error (get-scheduling-data): Uncaught exception -', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

