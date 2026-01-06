import { SupabaseClient } from '@supabase/supabase-js';
import { format, addMinutes, setHours, setMinutes, isBefore, isAfter, parseISO, parse, getDay, startOfDay, endOfDay } from 'date-fns';

interface WorkingSchedule {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface ScheduleException {
  id?: string;
  exception_date: string;
  is_day_off: boolean;
  start_time: string | null;
  end_time: string | null;
}

interface Appointment {
  id?: string;
  appointment_time: string;
  total_duration_minutes: number;
}

export async function getAvailableTimeSlots(
  supabase: SupabaseClient,
  companyId: string,
  collaboratorId: string,
  date: Date,
  requiredDuration: number,
  slotIntervalMinutes: number = 30, // Intervalo de slots, por exemplo, 30 minutos
  excludeAppointmentId?: string // Novo parâmetro opcional
): Promise<string[]> {
  const availableSlots: string[] = [];
  const selectedDayOfWeek = getDay(date); // 0 for Sunday, 1 for Monday, etc.
  const today = startOfDay(new Date());
  const selectedDateStart = startOfDay(date);

  console.log('--- getAvailableTimeSlots Start ---');
  console.log('Input Params:', { companyId, collaboratorId, date: format(date, 'yyyy-MM-dd'), requiredDuration, slotIntervalMinutes, excludeAppointmentId });

  // Fetch all scheduling data from Edge Function to bypass RLS
  const response = await fetch(`${supabase.supabaseUrl}/functions/v1/get-scheduling-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabase.supabaseKey}`, // Use anon key for Edge Function call
    },
    body: JSON.stringify({
      companyId,
      collaboratorId,
      date: date.toISOString(), // Pass date as ISO string
      excludeAppointmentId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Error calling get-scheduling-data Edge Function:', errorData);
    throw new Error('Failed to fetch scheduling data: ' + errorData.error);
  }

  const { workingSchedules, exceptions, existingAppointments } = await response.json();

  console.log('Fetched workingSchedules (from Edge Function):', workingSchedules);
  console.log('Fetched exceptions (from Edge Function):', exceptions);
  console.log('Fetched existingAppointments (from Edge Function):', existingAppointments);

  let effectiveWorkingIntervals: Array<{ start: Date; end: Date }> = [];
  let busyIntervals: Array<{ start: Date; end: Date }> = [];

  // Process working schedules first
  if (workingSchedules && workingSchedules.length > 0) {
    effectiveWorkingIntervals = workingSchedules.map(schedule => {
      // Defensive check for schedule object itself and its properties
      if (!schedule || typeof schedule.start_time !== 'string' || typeof schedule.end_time !== 'string') {
        console.warn(`Invalid working schedule entry found (ID: ${schedule?.id || 'unknown'}, Day: ${schedule?.day_of_week || 'unknown'}). Expected start_time and end_time to be strings. Skipping.`);
        return null; // Return null for invalid schedules
      }
      const startTimeStr = schedule.start_time.substring(0, 5);
      const endTimeStr = schedule.end_time.substring(0, 5);
      const start = parse(startTimeStr, 'HH:mm', date);
      const end = parse(endTimeStr, 'HH:mm', date);
      return { start, end };
    }).filter(Boolean) as Array<{ start: Date; end: Date }>; // Filter out any nulls
  }
  console.log('Initial effectiveWorkingIntervals (from working_schedules):', effectiveWorkingIntervals.map(i => `${format(i.start, 'HH:mm')}-${format(i.end, 'HH:mm')}`));


  // Apply exceptions
  let isFullDayOff = false;
  if (exceptions && exceptions.length > 0) {
    for (const exception of exceptions) {
      if (exception.is_day_off) {
        isFullDayOff = true;
        console.log(`Exception: Full day off detected for ${format(date, 'yyyy-MM-dd')}.`);
        break; // If any exception is a full day off, no need to check others
      } else if (exception.start_time && exception.end_time) {
        if (typeof exception.start_time !== 'string' || typeof exception.end_time !== 'string') {
          console.warn(`Schedule exception ID ${exception.id || 'unknown'} for date ${exception.exception_date} has invalid start_time or end_time. Skipping this exception interval.`);
        } else {
          const exceptionStart = parse(exception.start_time.substring(0, 5), 'HH:mm', date);
          const exceptionEnd = parse(exception.end_time.substring(0, 5), 'HH:mm', date);
          busyIntervals.push({ start: exceptionStart, end: exceptionEnd });
          console.log('Exception: Specific busy interval added:', `${format(exceptionStart, 'HH:mm')}-${format(exceptionEnd, 'HH:mm')}`);
        }
      }
    }
  }

  if (isFullDayOff) {
    effectiveWorkingIntervals = []; // Collaborator is off for the entire day
    console.log('EffectiveWorkingIntervals cleared due to full day off exception.');
  }
  console.log('EffectiveWorkingIntervals after full day off check:', effectiveWorkingIntervals.map(i => `${format(i.start, 'HH:mm')}-${format(i.end, 'HH:mm')}`)); // ADDED LOG
  console.log('BusyIntervals after exceptions processing:', busyIntervals.map(i => `${format(i.start, 'HH:mm')}-${format(i.end, 'HH:mm')}`)); // ADDED LOG


  // If no effective working hours after applying exceptions, no slots are available
  if (effectiveWorkingIntervals.length === 0) {
    console.log('No effective working hours found after applying exceptions. Returning empty slots.');
    console.log('--- getAvailableTimeSlots End ---');
    return [];
  }

  // Add existing appointments to busy intervals
  if (existingAppointments) {
    existingAppointments.forEach(app => {
      if (!app || typeof app.appointment_time !== 'string') {
        console.warn(`Invalid appointment entry found (ID: ${app?.id || 'unknown'}). Expected appointment_time to be a string. Skipping.`);
        return;
      }
      const appStartTimeStr = app.appointment_time.substring(0, 5);
      const appStartTime = parse(appStartTimeStr, 'HH:mm', date);
      const appEndTime = addMinutes(appStartTime, app.total_duration_minutes);
      busyIntervals.push({ start: appStartTime, end: appEndTime });
    });
  }
  console.log('Final busyIntervals (appointments + exceptions):', busyIntervals.map(i => `${format(i.start, 'HH:mm')}-${format(i.end, 'HH:mm')}`));

  // Sort busy intervals by start time and merge overlapping busy intervals for efficiency
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
  console.log('Merged busyIntervals:', mergedBusyIntervals.map(i => `${format(i.start, 'HH:mm')}-${format(i.end, 'HH:mm')}`));


  // Generate potential slots within each effective working interval
  for (const workingInterval of effectiveWorkingIntervals) {
    let currentTime = workingInterval.start;

    // Adjust start time if it's today and before current time
    if (selectedDateStart.getTime() === today.getTime()) {
      const now = new Date();
      const nextSlotAfterNow = setMinutes(setHours(now, now.getHours()), Math.ceil(now.getMinutes() / slotIntervalMinutes) * slotIntervalMinutes);
      if (isBefore(currentTime, nextSlotAfterNow)) {
        currentTime = nextSlotAfterNow;
      }
    }
    console.log(`Processing working interval: ${format(workingInterval.start, 'HH:mm')}-${format(workingInterval.end, 'HH:mm')}`);

    while (isBefore(addMinutes(currentTime, requiredDuration), addMinutes(workingInterval.end, 1))) {
      const slotStart = currentTime;
      const slotEnd = addMinutes(slotStart, requiredDuration);

      console.log(`  Checking slot: ${format(slotStart, 'HH:mm')}-${format(slotEnd, 'HH:mm')}`);

      let isSlotFree = true;
      
      // Check against merged busy intervals (appointments and exceptions)
      for (const busy of mergedBusyIntervals) {
        console.log(`    Comparing slot ${format(slotStart, 'HH:mm')}-${format(slotEnd, 'HH:mm')} with busy interval ${format(busy.start, 'HH:mm')}-${format(busy.end, 'HH:mm')}`); // ADDED LOG
        if (isBefore(slotStart, busy.end) && isAfter(slotEnd, busy.start)) {
          isSlotFree = false;
          console.log(`    Overlap detected: ${format(slotStart, 'HH:mm')}-${format(slotEnd, 'HH:mm')} overlaps with ${format(busy.start, 'HH:mm')}-${format(busy.end, 'HH:mm')}`); // ADDED LOG
          const busyEndAligned = setMinutes(setHours(busy.end, busy.end.getHours()), Math.ceil(busy.end.getMinutes() / slotIntervalMinutes) * slotIntervalMinutes);
          currentTime = isAfter(currentTime, busyEndAligned) ? currentTime : busyEndAligned;
          console.log(`    Advanced currentTime to: ${format(currentTime, 'HH:mm')}`);
          break;
        }
      }

      if (isSlotFree) {
        availableSlots.push(`${format(slotStart, 'HH:mm')}`); // Simplificado para apenas o horário de início
        console.log(`    Slot added: ${format(slotStart, 'HH:mm')}`);
        currentTime = addMinutes(currentTime, slotIntervalMinutes);
      } else { // ADDED ELSE BLOCK FOR CLARITY IN LOGGING
        console.log(`    Slot ${format(slotStart, 'HH:mm')}-${format(slotEnd, 'HH:mm')} is NOT free.`); // ADDED LOG
      }
    }
  }

  const uniqueSlots = Array.from(new Set(availableSlots)).sort();
  console.log('Final uniqueSlots:', uniqueSlots);
  console.log('--- getAvailableTimeSlots End ---');

  return uniqueSlots;
}