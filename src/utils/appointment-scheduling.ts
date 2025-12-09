import { SupabaseClient } from '@supabase/supabase-js';
import { format, addMinutes, setHours, setMinutes, isBefore, isAfter, parseISO, parse, getDay, startOfDay, endOfDay } from 'date-fns';

interface WorkingSchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface ScheduleException {
  exception_date: string;
  is_day_off: boolean;
  start_time: string | null;
  end_time: string | null;
}

interface Appointment {
  appointment_date: string;
  appointment_time: string;
  total_duration_minutes: number;
}

export async function getAvailableTimeSlots(
  supabase: SupabaseClient,
  companyId: string,
  collaboratorId: string,
  date: Date,
  requiredDuration: number,
  slotIntervalMinutes: number = 30 // Intervalo de slots, por exemplo, 30 minutos
): Promise<string[]> {
  const availableSlots: string[] = [];
  const selectedDayOfWeek = getDay(date); // 0 for Sunday, 1 for Monday, etc.
  const today = startOfDay(new Date());
  const selectedDateStart = startOfDay(date);

  console.log('--- getAvailableTimeSlots Debug Start ---');
  console.log('Input Params:', { companyId, collaboratorId, date: format(date, 'yyyy-MM-dd'), requiredDuration, slotIntervalMinutes });
  console.log('Selected Day of Week:', selectedDayOfWeek);

  // 1. Fetch working schedules for the selected day
  const { data: workingSchedules, error: wsError } = await supabase
    .from('working_schedules')
    .select('day_of_week, start_time, end_time')
    .eq('collaborator_id', collaboratorId)
    .eq('company_id', companyId)
    .eq('day_of_week', selectedDayOfWeek);

  if (wsError) {
    console.error('Error fetching working schedules:', wsError);
    throw wsError;
  }
  console.log('Fetched Working Schedules:', workingSchedules);

  // 2. Fetch schedule exceptions for the selected date
  const { data: exceptions, error: exError } = await supabase
    .from('schedule_exceptions')
    .select('exception_date, is_day_off, start_time, end_time')
    .eq('collaborator_id', collaboratorId)
    .eq('company_id', companyId)
    .eq('exception_date', format(date, 'yyyy-MM-dd'));

  if (exError) {
    console.error('Error fetching schedule exceptions:', exError);
    throw exError;
  }
  console.log('Fetched Schedule Exceptions:', exceptions);

  // 3. Fetch existing appointments for the selected date and collaborator
  const { data: existingAppointments, error: appError } = await supabase
    .from('appointments')
    .select('appointment_time, total_duration_minutes')
    .eq('collaborator_id', collaboratorId)
    .eq('company_id', companyId)
    .eq('appointment_date', format(date, 'yyyy-MM-dd'))
    .neq('status', 'cancelado'); // Exclude canceled appointments

  if (appError) {
    console.error('Error fetching existing appointments:', appError);
    throw appError;
  }
  console.log('Fetched Existing Appointments:', existingAppointments);

  let effectiveWorkingHours: Array<{ start: Date; end: Date }> = [];

  // Apply working schedules
  if (workingSchedules && workingSchedules.length > 0) {
    effectiveWorkingHours = workingSchedules.map(schedule => {
      const start = parse(`${schedule.start_time}`, 'HH:mm', date);
      const end = parse(`${schedule.end_time}`, 'HH:mm', date);
      return { start, end };
    });
  }
  console.log('Initial Effective Working Hours:', effectiveWorkingHours.map(h => ({ start: format(h.start, 'HH:mm'), end: format(h.end, 'HH:mm') })));


  // Apply exceptions
  if (exceptions && exceptions.length > 0) {
    const exception = exceptions[0]; // Assuming one exception per day for simplicity
    if (exception.is_day_off) {
      effectiveWorkingHours = []; // Collaborator is off for the entire day
      console.log('Exception: Day off. Effective Working Hours cleared.');
    } else if (exception.start_time && exception.end_time) {
      // Replace or modify working hours based on exception
      const exceptionStart = parse(`${exception.start_time}`, 'HH:mm', date);
      const exceptionEnd = parse(`${exception.end_time}`, 'HH:mm', date);

      // For now, let's assume an exception *replaces* the entire day's schedule if it's not a day off
      // A more complex logic would merge/subtract intervals.
      effectiveWorkingHours = [{ start: exceptionStart, end: exceptionEnd }];
      console.log('Exception: Custom hours. Effective Working Hours set to:', effectiveWorkingHours.map(h => ({ start: format(h.start, 'HH:mm'), end: format(h.end, 'HH:mm') })));
    }
  }

  // If no effective working hours, no slots are available
  if (effectiveWorkingHours.length === 0) {
    console.log('No effective working hours found. Returning empty slots.');
    console.log('--- getAvailableTimeSlots Debug End ---');
    return [];
  }

  // Combine all busy intervals (existing appointments)
  const busyIntervals: Array<{ start: Date; end: Date }> = [];
  if (existingAppointments) {
    existingAppointments.forEach(app => {
      const appStartTime = parse(`${app.appointment_time}`, 'HH:mm', date);
      const appEndTime = addMinutes(appStartTime, app.total_duration_minutes);
      busyIntervals.push({ start: appStartTime, end: appEndTime });
    });
  }

  // Sort busy intervals by start time
  busyIntervals.sort((a, b) => a.start.getTime() - b.start.getTime());
  console.log('Busy Intervals (sorted):', busyIntervals.map(b => ({ start: format(b.start, 'HH:mm'), end: format(b.end, 'HH:mm') })));


  // Generate potential slots within effective working hours
  for (const workingHour of effectiveWorkingHours) {
    let currentTime = workingHour.start;

    // Adjust start time if it's today and before current time
    if (selectedDateStart.getTime() === today.getTime()) {
      const now = new Date();
      const nextSlotAfterNow = setMinutes(setHours(now, now.getHours()), Math.ceil(now.getMinutes() / slotIntervalMinutes) * slotIntervalMinutes);
      if (isBefore(currentTime, nextSlotAfterNow)) {
        currentTime = nextSlotAfterNow;
        console.log('Adjusted currentTime for today:', format(currentTime, 'HH:mm'));
      }
    }

    while (isBefore(addMinutes(currentTime, requiredDuration), addMinutes(workingHour.end, 1))) { // +1 minute to ensure end boundary is inclusive
      let isSlotFree = true;
      const slotEnd = addMinutes(currentTime, requiredDuration);

      console.log(`Checking slot: ${format(currentTime, 'HH:mm')} - ${format(slotEnd, 'HH:mm')}`);

      // Check against busy intervals
      for (const busy of busyIntervals) {
        // If the slot overlaps with a busy interval
        if (
          (isBefore(currentTime, busy.end) && isAfter(slotEnd, busy.start)) ||
          (currentTime.getTime() === busy.start.getTime()) || // Slot starts exactly when busy starts
          (slotEnd.getTime() === busy.end.getTime()) // Slot ends exactly when busy ends
        ) {
          isSlotFree = false;
          console.log(`  - Overlaps with busy: ${format(busy.start, 'HH:mm')} - ${format(busy.end, 'HH:mm')}`);
          // Move current time past the busy interval to avoid re-checking
          currentTime = addMinutes(busy.end, slotIntervalMinutes - (busy.end.getMinutes() % slotIntervalMinutes));
          console.log('  - Adjusted currentTime to:', format(currentTime, 'HH:mm'));
          break; // Break from busy interval loop, re-evaluate from new currentTime
        }
      }

      if (isSlotFree) {
        availableSlots.push(format(currentTime, 'HH:mm'));
        console.log(`  - Slot is FREE. Added: ${format(currentTime, 'HH:mm')}`);
        currentTime = addMinutes(currentTime, slotIntervalMinutes);
      } else {
        // If not free due to overlap, currentTime was already adjusted.
        // If not free for other reasons (e.g., slotEnd is after workingHour.end),
        // currentTime will be advanced by slotIntervalMinutes.
        if (isBefore(addMinutes(currentTime, requiredDuration), addMinutes(workingHour.end, 1))) {
             currentTime = addMinutes(currentTime, slotIntervalMinutes);
        }
      }
    }
  }

  // Filter out duplicate slots and sort
  const uniqueSlots = Array.from(new Set(availableSlots)).sort();
  console.log('Final Unique Available Slots:', uniqueSlots);
  console.log('--- getAvailableTimeSlots Debug End ---');

  return uniqueSlots;
}