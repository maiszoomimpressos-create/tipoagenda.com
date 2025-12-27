import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.0';
import { format } from 'https://esm.sh/date-fns@3.6.0';

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

    const date = new Date(rawDate);
    const formattedDate = format(date, 'yyyy-MM-dd');
    const selectedDayOfWeek = date.getDay(); // 0 for Sunday, 1 for Monday, etc.

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

    // Fetch working schedules
    const { data: workingSchedules, error: wsError } = await supabaseAdmin
      .from('working_schedules')
      .select('id, day_of_week, start_time, end_time')
      .eq('collaborator_id', collaboratorId)
      .eq('company_id', companyId)
      .eq('day_of_week', selectedDayOfWeek);

    if (wsError) {
      console.error('Edge Function Error (get-scheduling-data): Error fetching working schedules:', wsError);
      return new Response(JSON.stringify({ error: wsError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Fetch schedule exceptions
    const { data: exceptions, error: exError } = await supabaseAdmin
      .from('schedule_exceptions')
      .select('id, exception_date, is_day_off, start_time, end_time, reason')
      .eq('collaborator_id', collaboratorId)
      .eq('company_id', companyId)
      .eq('exception_date', formattedDate);

    if (exError) {
      console.error('Edge Function Error (get-scheduling-data): Error fetching schedule exceptions:', exError);
      return new Response(JSON.stringify({ error: exError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Fetch existing appointments
    let appointmentsQuery = supabaseAdmin
      .from('appointments')
      .select('id, appointment_time, total_duration_minutes')
      .eq('collaborator_id', collaboratorId)
      .eq('company_id', companyId)
      .eq('appointment_date', formattedDate)
      .neq('status', 'cancelado');

    if (excludeAppointmentId) {
      appointmentsQuery = appointmentsQuery.neq('id', excludeAppointmentId);
    }

    const { data: existingAppointments, error: appError } = await appointmentsQuery;

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

