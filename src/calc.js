import { STATUS } from './storage.js';

/**
 * Calculate average in-office days per week.
 * Formula: (inOffice / denominator) * 5
 *
 * Denominator includes only in-office + at-home days.
 * Excluded from denominator: unset, future, time-off, WFA, disabled weekends.
 *
 * Returns null (not 0) when denominator is zero — the UI layer displays null as "---".
 *
 * @param {Array<{status: string, isWeekend: boolean, isFuture: boolean}>} days
 * @param {boolean} weekendsEnabled
 * @returns {number|null} Average days per week, or null if denominator is 0
 */
export function calcAverage(days, weekendsEnabled) {
  let inOffice = 0;
  let denominator = 0;

  for (const day of days) {
    if (day.isWeekend && !weekendsEnabled) continue;
    if (day.isFuture) continue;
    if (day.status === STATUS.UNSET) continue;
    if (day.status === STATUS.TIME_OFF) continue;
    if (day.status === STATUS.WFA) continue;

    if (day.status === STATUS.IN_OFFICE) {
      inOffice++;
      denominator++;
    } else if (day.status === STATUS.AT_HOME) {
      denominator++;
    }
  }

  if (denominator === 0) return null;
  return (inOffice / denominator) * 5;
}
