import { subDays, startOfDay, endOfDay, format, startOfMonth } from 'date-fns';

export type DateRangeKey = 'current_month' | 'last_month' | 'last_3_months' | 'last_year';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  startDateDb: string;
  endDateDb: string;
}

export function getDateRange(key: DateRangeKey): DateRange {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = endOfDay(now);
  let days: number;

  switch (key) {
    case 'current_month':
      startDate = startOfDay(startOfMonth(now));
      return {
        startDate,
        endDate,
        startDateDb: format(startDate, 'yyyy-MM-dd'),
        endDateDb: format(endDate, 'yyyy-MM-dd'),
      };
    case 'last_month':
      days = 30;
      break;
    case 'last_3_months':
      days = 90;
      break;
    case 'last_year':
      days = 365;
      break;
    default:
      days = 30;
  }

  startDate = startOfDay(subDays(now, days));

  return {
    startDate,
    endDate,
    startDateDb: format(startDate, 'yyyy-MM-dd'),
    endDateDb: format(endDate, 'yyyy-MM-dd'),
  };
}

// Function to get the previous period's date range for comparison
export function getPreviousDateRange(currentRange: DateRange): DateRange {
  const diffInDays = Math.ceil((currentRange.endDate.getTime() - currentRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const prevEndDate = subDays(currentRange.startDate, 1);
  const prevStartDate = subDays(prevEndDate, diffInDays);

  return {
    startDate: startOfDay(prevStartDate),
    endDate: endOfDay(prevEndDate),
    startDateDb: format(startOfDay(prevStartDate), 'yyyy-MM-dd'),
    endDateDb: format(endOfDay(prevEndDate), 'yyyy-MM-dd'),
  };
}