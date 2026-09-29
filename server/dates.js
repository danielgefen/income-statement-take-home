export class InvalidDateRangeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidDateRangeError';
  }
}

function isCalendarDate(value) {
  if (typeof value !== 'string' || value.length !== 10 || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthLengths = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= monthLengths[month - 1];
}

export function validateDateRange(start, end) {
  if (!isCalendarDate(start)) {
    throw new InvalidDateRangeError('Start date must be a valid date in YYYY-MM-DD format.');
  }
  if (!isCalendarDate(end)) {
    throw new InvalidDateRangeError('End date must be a valid date in YYYY-MM-DD format.');
  }
  // Validated fixed-width calendar strings sort chronologically, without time zones.
  if (start > end) throw new InvalidDateRangeError('Start date must be on or before end date.');
  return { start, end };
}
