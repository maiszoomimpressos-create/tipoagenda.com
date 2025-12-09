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
  console.log('Fetched workingSchedules:', workingSchedules);

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
  console.log('Fetched exceptions:', exceptions);

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
  console.log('Fetched existingAppointments:', existingAppointments);

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
  console.log('Initial effectiveWorkingIntervals (from working_schedules):', effectiveWorkingIntervals.map(i => `${format(i.start, 'HH:mm')}-${format(i.end, 'HH:mm')}`));


  // Apply exceptions
  if (exceptions && exceptions.length > 0) {
    const exception = exceptions[0]; // Assuming one exception per day for simplicity
    if (exception.is_day_off) {
      effectiveWorkingIntervals = []; // Collaborator is off for the entire day
      console.log('Exception: Day off. effectiveWorkingIntervals cleared.');
    } else if (exception.start_time && exception.end_time) {
      // If there's a specific exception time, it means the collaborator is busy during this period
      const exceptionStart = parse(exception.start_time.substring(0, 5), 'HH:mm', date);
      const exceptionEnd = parse(exception.end_time.substring(0, 5), 'HH:mm', date);
      busyIntervals.push({ start: exceptionStart, end: exceptionEnd });
      console.log('Exception: Specific busy interval added:', `${format(exceptionStart, 'HH:mm')}-${format(exceptionEnd, 'HH:mm')}`);
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
      // Extract only HH:MM from the appointment_time string (e.g., "11:30:00" -> "11:30")
      const appTimeStr = app.appointment_time.substring(0, 5); 
      const appStartTime = parse(appTimeStr, 'HH:mm', date);
      const appEndTime = addMinutes(appStartTime, app.total_duration_minutes);
      busyIntervals.push({ start: appStartTime, end: appEndTime });
    });
  }
  console.log('Final busyIntervals (appointments + exceptions):', busyIntervals.map(i => `${format(i.start, 'HH:mm')}-${format(i.end, 'HH:mm')}`));


  // Sort busy intervals by start time
  busyIntervals.sort((a, b) => a.start.getTime() - b.start.getTime());

  // Generate potential slots within each effective working interval
  for (const workingInterval of effectiveWorkingIntervals) {
    let currentTime = workingInterval.start;

    // 1. Ensure currentTime is aligned to the next slotIntervalMinutes from the start of the working interval
    currentTime = setMinutes(setHours(currentTime, currentTime.getHours()), Math.ceil(currentTime.getMinutes() / slotIntervalMinutes) * slotIntervalMinutes);

    // 2. Adjust start time if it's today and before current time
    if (selectedDateStart.getTime() === today.getTime()) {
      const now = new Date();
      const nextSlotAfterNow = setMinutes(setHours(now, now.getHours()), Math.ceil(now.getMinutes() / slotIntervalMinutes) * slotIntervalMinutes);
      if (isBefore(currentTime, nextSlotAfterNow)) {
        currentTime = nextSlotAfterNow;
      }
    }
    console.log(`Processing working interval: ${format(workingInterval.start, 'HH:mm')}-${format(workingInterval.end, 'HH:mm')}`);
    console.log(`  Initial currentTime for interval (aligned): ${format(currentTime, 'HH:mm')}`);


    // Loop while the end of the potential slot is not after the end of the working interval
    while (!isAfter(addMinutes(currentTime, requiredDuration), workingInterval.end)) {
      const slotStart = currentTime;
      const slotEnd = addMinutes(slotStart, requiredDuration);

      console.log(`  Checking slot: ${format(slotStart, 'HH:mm')}-${format(slotEnd, 'HH:mm')}`);

      let isSlotFree = true;
      let nextAdvanceTime = addMinutes(currentTime, slotIntervalMinutes); // Default advance

      // Check against busy intervals (appointments and exceptions)
      for (const busy of busyIntervals) {
        // Check for overlap: [slotStart, slotEnd) vs [busy.start, busy.end)
        if (isBefore(slotStart, busy.end) && isAfter(slotEnd, busy.start)) {
          isSlotFree = false;
          console.log(`    Overlap with busy interval: ${format(busy.start, 'HH:mm')}-${format(busy.end, 'HH:mm')}`);
          // If there's an overlap, the next possible start time should be after the busy interval ends.
          // Ensure it's aligned to the slotIntervalMinutes.
          const busyEndAligned = setMinutes(setHours(busy.end, busy.end.getHours()), Math.ceil(busy.end.getMinutes() / slotIntervalMinutes) * slotIntervalMinutes);
          nextAdvanceTime = isAfter(nextAdvanceTime, busyEndAligned) ? nextAdvanceTime : busyEndAligned; // Advance nextAdvanceTime past the busy block
          console.log(`    Advanced nextAdvanceTime to (due to busy): ${format(nextAdvanceTime, 'HH:mm')}`);
          break; // No need to check other busy intervals for this slot, move to next currentTime
        }
      }

      if (isSlotFree) {
        availableSlots.push(`${format(slotStart, 'HH:mm')} às ${format(slotEnd, 'HH:mm')}`);
        console.log(`    Slot added: ${format(slotStart, 'HH:mm')} às ${format(slotEnd, 'HH:mm')}`);
        // If a slot is free, the next candidate start time must be after this slot ends.
        // Ensure it's aligned to the slotIntervalMinutes.
        const slotEndAligned = setMinutes(setHours(slotEnd, slotEnd.getHours()), Math.ceil(slotEnd.getMinutes() / slotIntervalMinutes) * slotIntervalMinutes);
        nextAdvanceTime = isAfter(nextAdvanceTime, slotEndAligned) ? nextAdvanceTime : slotEndAligned;
        console.log(`    Advanced nextAdvanceTime to (due to free slot): ${format(nextAdvanceTime, 'HH:mm')}`);
      }
      
      currentTime = nextAdvanceTime; // Apply the calculated advance
    }
  }

  // Filter out duplicate slots and sort
  const uniqueSlots = Array.from(new Set(availableSlots)).sort();
  console.log('Final uniqueSlots:', uniqueSlots);
  console.log('--- getAvailableTimeSlots End ---');

  return uniqueSlots;
}