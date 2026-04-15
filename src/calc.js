import { STATUS } from './storage.js';

/**
 * Calculate average in-office days per week.
 * Formula: (inOffice / eligibleDays) * 5
 *
 * Denominator includes ALL eligible working days in the month — not just days
 * with an explicit status. This prevents a single in-office day from reading 5.0.
 *
 * Eligible = not a disabled weekend, not time-off, not WFA, not a future unset day.
 * Past unset days ARE eligible (they're workdays you didn't track).
 * Future days with an explicit status ARE eligible (they're planned days).
 *
 * Returns 0 when denominator is zero (no eligible days).
 *
 * @param {Array<{status: string, isWeekend: boolean, isFuture: boolean}>} days
 * @param {boolean} weekendsEnabled
 * @returns {number} Average days per week
 */
export function calcAverage(days, weekendsEnabled) {
  let inOffice = 0;
  let denominator = 0;

  for (const day of days) {
    if (day.isWeekend && !weekendsEnabled) continue;
    if (day.isFuture && day.status === STATUS.UNSET) continue;
    if (day.status === STATUS.TIME_OFF) continue;
    if (day.status === STATUS.WFA) continue;

    denominator++;
    if (day.status === STATUS.IN_OFFICE) {
      inOffice++;
    }
  }

  if (denominator === 0) return 0;
  return (inOffice / denominator) * 5;
}
