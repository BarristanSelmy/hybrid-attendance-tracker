import { daysInMonth } from './dates.js';
import { STATUS } from './storage.js';
import { calcAverage } from './calc.js';

/**
 * Build an array of day objects for a given month.
 * Used by renderStats and exposed for unit testing.
 *
 * @param {number} year
 * @param {number} month - 1-indexed
 * @param {Object} days  - sparse map of dayNum (string) -> status
 * @param {boolean} weekendsEnabled - unused here but kept for API symmetry
 * @returns {Array<{status: string, isWeekend: boolean, isFuture: boolean}>}
 */
export function buildDayObjects(year, month, days, weekendsEnabled) {
  const count = daysInMonth(year, month);
  const today = new Date();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;
  const result = [];

  for (let d = 1; d <= count; d++) {
    const date = new Date(year, month - 1, d);
    const dow = date.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const isFuture = isCurrentMonth && d > today.getDate();
    const status = days[String(d)] || STATUS.UNSET;
    result.push({ status, isWeekend, isFuture });
  }

  return result;
}

/**
 * Render the stats panel (average and per-status totals) into two DOM elements.
 *
 * @param {HTMLElement} avgEl    - element to receive average text
 * @param {HTMLElement} totalsEl - element to receive totals HTML
 * @param {{year: number, month: number, days: Object}} state
 * @param {boolean} weekendsEnabled
 */
export function renderStats(avgEl, totalsEl, state, weekendsEnabled) {
  const dayObjs = buildDayObjects(state.year, state.month, state.days, weekendsEnabled);
  const avg = calcAverage(dayObjs, weekendsEnabled);

  avgEl.textContent = avg === null
    ? 'Average: \u2014'
    : 'Average: ' + avg.toFixed(1) + ' days/week';

  const counts = {
    [STATUS.IN_OFFICE]: 0,
    [STATUS.AT_HOME]: 0,
    [STATUS.TIME_OFF]: 0,
    [STATUS.WFA]: 0,
  };

  for (const d of dayObjs) {
    if (d.isFuture) continue;
    if (d.isWeekend && !weekendsEnabled) continue;
    if (d.status === STATUS.UNSET) continue;
    if (Object.prototype.hasOwnProperty.call(counts, d.status)) {
      counts[d.status]++;
    }
  }

  totalsEl.innerHTML =
    '<span class="stat-dot" data-status="in-office"></span> ' + counts[STATUS.IN_OFFICE] + ' In Office' +
    ' \u00B7 <span class="stat-dot" data-status="at-home"></span> ' + counts[STATUS.AT_HOME] + ' At Home' +
    ' \u00B7 <span class="stat-dot" data-status="time-off"></span> ' + counts[STATUS.TIME_OFF] + ' Time Off' +
    ' \u00B7 <span class="stat-dot" data-status="wfa"></span> ' + counts[STATUS.WFA] + ' WFA';
}
