/**
 * Date utility helpers for EstateFlow.
 * Eliminates UTC midnight timezone shifts that cause calendar dates
 * to display as 1 day in the past in timezones behind UTC.
 */

/**
 * Returns today's local date as "YYYY-MM-DD" based on the user's local clock.
 * Replaces new Date().toISOString().split('T')[0] which returns yesterday
 * during late night hours in positive UTC timezones.
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converts any Date or date string into a standard "YYYY-MM-DD" string
 * for <input type="date"> without UTC shift.
 */
export function toInputDateValue(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return getTodayDateString();
  if (typeof dateInput === 'string') {
    // If already in YYYY-MM-DD format (starts with YYYY-MM-DD)
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }

  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return getTodayDateString();

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Safely parses year, month (1-12), and day (1-31) from date input.
 */
function parseDateParts(dateInput: string | Date | null | undefined): { year: number; month: number; day: number } | null {
  if (!dateInput) return null;

  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return {
        year: parseInt(match[1], 10),
        month: parseInt(match[2], 10),
        day: parseInt(match[3], 10),
      };
    }
  }

  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  };
}

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Formats a calendar date for table/card display without timezone offset.
 * Example: formatDateForDisplay("2026-09-08") -> "08 Sep 2026"
 */
export function formatDateForDisplay(
  dateInput: string | Date | null | undefined,
  style: 'short' | 'medium' | 'full' | 'numeric' = 'medium'
): string {
  const parts = parseDateParts(dateInput);
  if (!parts) return 'N/A';

  const { year, month, day } = parts;
  const dayPadded = String(day).padStart(2, '0');
  const monthPadded = String(month).padStart(2, '0');

  if (style === 'numeric') {
    return `${dayPadded}/${monthPadded}/${year}`;
  }

  if (style === 'full') {
    return `${dayPadded} ${MONTH_NAMES_FULL[month - 1]} ${year}`;
  }

  // Default 'medium' / 'short'
  return `${dayPadded} ${MONTH_NAMES_SHORT[month - 1]} ${year}`;
}

/**
 * Compares whether a date string/object is within a DateRange based purely on
 * calendar days (YYYY-MM-DD), avoiding timezone boundary clipping.
 */
export function isDateWithinRange(
  dateInput: string | Date | null | undefined,
  from?: Date | string | null,
  to?: Date | string | null
): boolean {
  if (!dateInput) return false;
  const targetStr = toInputDateValue(dateInput);
  if (!targetStr) return false;

  if (from) {
    const fromStr = toInputDateValue(from);
    if (targetStr < fromStr) return false;
  }

  if (to) {
    const toStr = toInputDateValue(to);
    if (targetStr > toStr) return false;
  }

  return true;
}
