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
  const selectedDateEnd = endOfDay(date);

  console.log('--- getAvailableTimeSlots Start ---');
  console.log('Input Params:', { companyId, collaboratorId, date: format(date, 'yyyy-MM-dd'), requiredDuration, slotIntervalMinutes });

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

  let effectiveWorkingIntervals: Array<{ start: Date; end: Date }> = [];
  let busyIntervals: Array<{ start: Date; end: Date }> = [];

  // Process working schedules first
  if (workingSchedules && workingSchedules.length > 0) {
    effectiveWorkingIntervals = workingSchedules.map(schedule => {
      const startTimeStr = schedule.start_time.substring(0, 5);
      const endTimeStr = schedule.end_time.substring(0, 5);
      const start = parse(startTimeStr, 'HH:mm', date);
      const end = parse(endTimeStr, 'HH:mm', date);
      return { start, end };
    });
  }

  // Apply exceptions
  if (exceptions && exceptions.length > 0) {
    const exception = exceptions[0]; // Assuming one exception per day for simplicity
    if (exception.is_day_off) {
      effectiveWorkingIntervals = []; // Collaborator is off for the entire day
    } else if (exception.start_time && exception.end_time) {
      // If there's a specific exception time, it means the collaborator is busy during this period
      const exceptionStart = parse(exception.start_time.substring(0, 5), 'HH:mm', date);
      const exceptionEnd = parse(exception.end_time.substring(0, 5), 'HH:mm', date);
      busyIntervals.push({ start: exceptionStart, end: exceptionEnd });
    }
  }

  // If no effective working hours after applying exceptions, no slots are available
  if (effectiveWorkingIntervals.length === 0) {
    console.log('No effective working hours found after applying exceptions. Returning empty slots.');
    console.log('--- getAvailableTimeSlots End ---');
    return [];
  }

  // Add existing appointments to busy intervals
  if (existingAppointments) {
    existingAppointments.forEach(app => {
      const appStartTime = parse(`${app.appointment_time}`, 'HH:mm', date);
      const appEndTime = addMinutes(appStartTime, app.total_duration_minutes);
      busyIntervals.push({ start: appStartTime, end: appEndTime });
    });
  }

  // Sort busy intervals by start time
  busyIntervals.sort((a, b) => a.start.getTime() - b.start.getTime());

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

    while (isBefore(addMinutes(currentTime, requiredDuration), addMinutes(workingInterval.end, 1))) {
      let isSlotFree = true;
      const slotEnd = addMinutes(currentTime, requiredDuration);

      // Check if the potential slot is within the working interval
      if (isBefore(currentTime, workingInterval.start) || isAfter(slotEnd, workingInterval.end)) {
        isSlotFree = false;
      }

      // Check against busy intervals (appointments and exceptions)
      if (isSlotFree) {
        for (const busy of busyIntervals) {
          // If the slot overlaps with a busy interval
          if (
            (isBefore(currentTime, busy.end) && isAfter(slotEnd, busy.start)) ||
            (currentTime.getTime() === busy.start.getTime()) ||
            (slotEnd.getTime() === busy.end.getTime())
          ) {
            isSlotFree = false;
            // Move current time past the busy interval to avoid re-checking
            currentTime = addMinutes(busy.end, slotIntervalMinutes - (busy.end.getMinutes() % slotIntervalMinutes));
            break; // Break from busy interval loop, re-evaluate from new currentTime
          }
        }
      }

      if (isSlotFree) {
        availableSlots.push(`${format(currentTime, 'HH:mm')} às ${format(slotEnd, 'HH:mm')}`);
        currentTime = addMinutes(currentTime, slotIntervalMinutes);
      } else {
        // If not free, ensure currentTime advances to the next potential slot
        // This handles cases where a slot is blocked, but the next one might be free
        if (isBefore(addMinutes(currentTime, requiredDuration), addMinutes(workingInterval.end, 1))) {
          currentTime = addMinutes(currentTime, slotIntervalMinutes);
        } else {
          // If the current time + required duration is already past the working interval end,
          // break out of the while loop for this working interval.
          break;
        }
      }
    }
  }

  // Filter out duplicate slots and sort
  const uniqueSlots = Array.from(new Set(availableSlots)).sort();
  console.log('--- getAvailableTimeSlots End ---');

  return uniqueSlots;
}