import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.0';
import { format, addMinutes, parse, getDay, startOfDay, isBefore, isAfter, setHours, setMinutes } from 'https://esm.sh/date-fns@3.6.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to get available time slots (replicated from frontend utility for backend re-validation)
async function getAvailableTimeSlotsBackend(
  supabase: SupabaseClient,
  companyId: string,
  collaboratorId: string,
  date: Date,
  requiredDuration: number,
  slotIntervalMinutes: number = 30,
  excludeAppointmentId?: string
): Promise<string[]> {
  console.log('getAvailableTimeSlotsBackend Start:', { companyId, collaboratorId, date: date.toISOString(), requiredDuration });
  const availableSlots: string[] = [];
  const selectedDayOfWeek = getDay(date);
  const today = startOfDay(new Date());
  const selectedDateStart = startOfDay(date);

  // 1. Fetch working schedules for the selected day
  const { data: workingSchedules, error: wsError } = await supabase
    .from('working_schedules')
    .select('id, day_of_week, start_time, end_time')
    .eq('collaborator_id', collaboratorId)
    .eq('company_id', companyId)
    .eq('day_of_week', selectedDayOfWeek);
    
  console.log('getAvailableTimeSlotsBackend: workingSchedules fetched:', workingSchedules, 'error:', wsError);

  if (wsError) throw wsError;

  // 2. Fetch schedule exceptions for the selected date
  const { data: exceptions, error: exError } = await supabase
    .from('schedule_exceptions')
    .select('id, exception_date, is_day_off, start_time, end_time, reason')
    .eq('collaborator_id', collaboratorId)
    .eq('company_id', companyId)
    .eq('exception_date', format(date, 'yyyy-MM-dd'));

  console.log('getAvailableTimeSlotsBackend: exceptions fetched:', exceptions, 'error:', exError);

  if (exError) throw exError;

  let effectiveWorkingIntervals: Array<{ start: Date; end: Date }> = [];
  let busyIntervals: Array<{ start: Date; end: Date }> = [];

  if (workingSchedules && workingSchedules.length > 0) {
    effectiveWorkingIntervals = workingSchedules.map(schedule => {
      if (!schedule || typeof schedule.start_time !== 'string' || typeof schedule.end_time !== 'string') {
        console.warn('getAvailableTimeSlotsBackend: Invalid schedule entry:', schedule);
        return null;
      }
      const startTimeStr = schedule.start_time.substring(0, 5);
      const endTimeStr = schedule.end_time.substring(0, 5);
      const start = parse(startTimeStr, 'HH:mm', date);
      const end = parse(endTimeStr, 'HH:mm', date);
      return { start, end };
    }).filter(Boolean) as Array<{ start: Date; end: Date }>;
  }
  console.log('getAvailableTimeSlotsBackend: effectiveWorkingIntervals:', effectiveWorkingIntervals.map(i => ({ start: i.start.toISOString(), end: i.end.toISOString() })));

  let isFullDayOff = false;
  if (exceptions && exceptions.length > 0) {
    for (const exception of exceptions) {
      if (exception.is_day_off) {
        isFullDayOff = true;
        console.log('getAvailableTimeSlotsBackend: Full day off exception found.');
        break; // If any exception is a full day off, no need to check others
      } else if (exception.start_time && exception.end_time) {
        if (typeof exception.start_time !== 'string' || typeof exception.end_time !== 'string') {
          console.warn('getAvailableTimeSlotsBackend: Invalid exception times, skipping:', exception);
          // Invalid exception times, skip
        } else {
          const exceptionStart = parse(exception.start_time.substring(0, 5), 'HH:mm', date);
          const exceptionEnd = parse(exception.end_time.substring(0, 5), 'HH:mm', date);
          busyIntervals.push({ start: exceptionStart, end: exceptionEnd });
          console.log('getAvailableTimeSlotsBackend: Added exception busy interval:', { start: exceptionStart.toISOString(), end: exceptionEnd.toISOString() });
        }
      }
    }
  }

  if (isFullDayOff) {
    effectiveWorkingIntervals = [];
    console.log('getAvailableTimeSlotsBackend: effectiveWorkingIntervals cleared due to full day off.');
  }

  if (effectiveWorkingIntervals.length === 0) {
    console.log('getAvailableTimeSlotsBackend: No effective working intervals, returning empty slots.');
    return [];
  }

  // 3. Fetch existing appointments for the selected date and collaborator
  let appointmentsQuery = supabase
    .from('appointments')
    .select('id, appointment_time, total_duration_minutes')
    .eq('collaborator_id', collaboratorId)
    .eq('company_id', companyId)
    .eq('appointment_date', format(date, 'yyyy-MM-dd'))
    .neq('status', 'cancelado');

  if (excludeAppointmentId) {
    appointmentsQuery = appointmentsQuery.neq('id', excludeAppointmentId);
    console.log('getAvailableTimeSlotsBackend: Excluding appointment ID:', excludeAppointmentId);
  }

  const { data: existingAppointments, error: appError } = await appointmentsQuery;
  console.log('getAvailableTimeSlotsBackend: existingAppointments fetched:', existingAppointments, 'error:', appError);

  if (appError) throw appError;

  if (existingAppointments) {
    existingAppointments.forEach(app => {
      if (!app || typeof app.appointment_time !== 'string') {
        console.warn('getAvailableTimeSlotsBackend: Invalid appointment entry, skipping:', app);
        return;
      }
      const appStartTimeStr = app.appointment_time.substring(0, 5);
      const appStartTime = parse(appStartTimeStr, 'HH:mm', date);
      const appEndTime = addMinutes(appStartTime, app.total_duration_minutes);
      busyIntervals.push({ start: appStartTime, end: appEndTime });
      console.log('getAvailableTimeSlotsBackend: Added existing appointment busy interval:', { start: appStartTime.toISOString(), end: appEndTime.toISOString() });
    });
  }
  console.log('getAvailableTimeSlotsBackend: All raw busyIntervals (from exceptions and appointments):', busyIntervals.map(b => ({ start: b.start.toISOString(), end: b.end.toISOString() })));

  busyIntervals.sort((a, b) => a.start.getTime() - b.start.getTime());
  const mergedBusyIntervals = [];
  if (busyIntervals.length > 0) {
    let currentMerged = busyIntervals[0];
    for (let i = 1; i < busyIntervals.length; i++) {
      const next = busyIntervals[i];
      if (isBefore(next.start, addMinutes(currentMerged.end, 1))) { // Check if next interval overlaps or is adjacent
        currentMerged.end = isAfter(currentMerged.end, next.end) ? currentMerged.end : next.end;
      } else {
        mergedBusyIntervals.push(currentMerged);
        currentMerged = next;
      }
    }
    mergedBusyIntervals.push(currentMerged);
  }
  console.log('getAvailableTimeSlotsBackend: Merged busyIntervals:', mergedBusyIntervals.map(b => ({ start: b.start.toISOString(), end: b.end.toISOString() })));

  for (const workingInterval of effectiveWorkingIntervals) {
    let currentTime = workingInterval.start;

    if (selectedDateStart.getTime() === today.getTime()) {
      const now = new Date();
      const nextSlotAfterNow = setMinutes(setHours(now, now.getHours()), Math.ceil(now.getMinutes() / slotIntervalMinutes) * slotIntervalMinutes);
      if (isBefore(currentTime, nextSlotAfterNow)) {
        currentTime = nextSlotAfterNow;
      }
    }
    console.log('getAvailableTimeSlotsBackend: Starting iteration for workingInterval:', { start: workingInterval.start.toISOString(), end: workingInterval.end.toISOString(), initialCurrentTime: currentTime.toISOString() });

    while (isBefore(addMinutes(currentTime, requiredDuration), addMinutes(workingInterval.end, 1))) {
      const slotStart = currentTime;
      const slotEnd = addMinutes(slotStart, requiredDuration);

      let isSlotFree = true;
      
      // Check against past time for current day
      if (selectedDateStart.getTime() === today.getTime() && isBefore(slotStart, new Date())) {
        isSlotFree = false;
        console.log('Slot ignored (in past):', format(slotStart, 'HH:mm'));
      } else {
        for (const busy of mergedBusyIntervals) {
          if (isBefore(slotStart, busy.end) && isAfter(slotEnd, busy.start)) {
            isSlotFree = false;
            console.log('Slot ignored (conflicts with busy interval):', format(slotStart, 'HH:mm'), 'Busy Interval:', { start: busy.start.toISOString(), end: busy.end.toISOString() });
            const busyEndAligned = setMinutes(setHours(busy.end, busy.end.getHours()), Math.ceil(busy.end.getMinutes() / slotIntervalMinutes) * slotIntervalMinutes);
            currentTime = isAfter(currentTime, busyEndAligned) ? currentTime : busyEndAligned;
            break;
          }
        }
      }

      if (isSlotFree) {
        availableSlots.push(`${format(slotStart, 'HH:mm')} às ${format(slotEnd, 'HH:mm')}`);
        console.log('Slot added:', format(slotStart, 'HH:mm'));
      }
      currentTime = addMinutes(currentTime, slotIntervalMinutes); // Always advance currentTime
      console.log('Advanced currentTime to:', format(currentTime, 'HH:mm'));
    }
  }
  console.log('getAvailableTimeSlotsBackend End - Final availableSlots:', availableSlots);
  return Array.from(new Set(availableSlots)).sort();
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Verify the user's session (the one calling this function)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: No Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token or user not found' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      clientId,
      clientNickname, // <-- Agora vamos usar este campo
      collaboratorId,
      serviceIds,
      appointmentDate,
      appointmentTime,
      totalDurationMinutes,
      totalPriceCalculated,
      observations,
      companyId,
    } = await req.json();

    console.log('book-appointment: Received payload for booking:', { companyId, clientId, collaboratorId, serviceIds, appointmentDate, appointmentTime, totalDurationMinutes, totalPriceCalculated, observations });

    if (!clientId || !collaboratorId || !serviceIds || serviceIds.length === 0 || !appointmentDate || !appointmentTime || !companyId || totalDurationMinutes === undefined || totalPriceCalculated === undefined) {
        return new Response(JSON.stringify({ error: 'Missing required appointment data' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

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

    // 1. Verify if the authenticated user is the client they are trying to book for
    const { data: clientData, error: clientFetchError } = await supabaseAdmin
      .from('clients')
      .select('id, client_auth_id')
      .eq('id', clientId)
      .single();

    if (clientFetchError || !clientData || clientData.client_auth_id !== user.id) {
      console.warn('book-appointment: Forbidden attempt to book for another client.', { userId: user.id, clientId, clientAuthId: clientData?.client_auth_id });
      return new Response(JSON.stringify({ error: 'Forbidden: You can only book appointments for yourself.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // 2. Re-verify time slot availability on the backend to prevent race conditions
    const parsedAppointmentDate = parse(appointmentDate, 'yyyy-MM-dd', new Date());
    const startTimeForDb = appointmentTime.split(' ')[0]; // "HH:MM"
    const endTimeForDb = format(addMinutes(parse(startTimeForDb, 'HH:mm', parsedAppointmentDate), totalDurationMinutes), 'HH:mm');
    const requestedSlot = `${startTimeForDb} às ${endTimeForDb}`;

    console.log('book-appointment: Re-validating requestedSlot:', requestedSlot);
    console.log('book-appointment: Parameters for getAvailableTimeSlotsBackend:', { companyId, collaboratorId, parsedAppointmentDate: parsedAppointmentDate.toISOString(), totalDurationMinutes });

    const availableSlots = await getAvailableTimeSlotsBackend(
      supabaseAdmin, // Use admin client for backend check
      companyId,
      collaboratorId,
      parsedAppointmentDate,
      totalDurationMinutes
    );

    console.log('book-appointment: Available slots from backend (re-validation):', availableSlots);

    if (!availableSlots.includes(requestedSlot)) {
      console.warn('book-appointment: Requested slot not available during re-validation.', { requestedSlot, availableSlots });
      return new Response(JSON.stringify({ error: 'O horário selecionado não está mais disponível. Por favor, escolha outro horário.' }), {
        status: 409, // Conflict
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Insert the main appointment entry
    const { data: appointment, error: insertAppointmentError } = await supabaseAdmin
      .from('appointments')
      .insert({
        company_id: companyId,
        client_id: clientId,
        client_nickname: clientNickname, // <-- AGORA INSERIMOS O NICKNAME/NOME
        collaborator_id: collaboratorId,
        appointment_date: appointmentDate,
        appointment_time: startTimeForDb,
        total_duration_minutes: totalDurationMinutes,
        total_price: totalPriceCalculated,
        observations: observations,
        created_by_user_id: user.id, // The client who created the appointment
        status: 'pendente', // Default status for new client appointments
      })
      .select()
      .single();

    if (insertAppointmentError) {
      console.error('book-appointment: Error inserting appointment:', insertAppointmentError.message);
      return new Response(JSON.stringify({ error: insertAppointmentError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Link services to the appointment in appointment_services table
    const appointmentServicesToInsert = serviceIds.map((serviceId: string) => ({
      appointment_id: appointment.id,
      service_id: serviceId,
    }));

    const { error: insertServicesError } = await supabaseAdmin
      .from('appointment_services')
      .insert(appointmentServicesToInsert);

    if (insertServicesError) {
      console.error('book-appointment: Error inserting appointment services:', insertServicesError.message);
      // Consider rolling back the appointment if service linking fails
      await supabaseAdmin.from('appointments').delete().eq('id', appointment.id);
      return new Response(JSON.stringify({ error: 'Failed to link services to appointment: ' + insertServicesError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: 'Appointment booked successfully', appointmentId: appointment.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Edge Function Error (book-appointment): Uncaught exception -', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});