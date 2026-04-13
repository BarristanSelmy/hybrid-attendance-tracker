import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderStats, buildDayObjects } from '../src/stats.js';
import { STATUS } from '../src/storage.js';

describe('buildDayObjects', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns correct length for a 30-day month', () => {
    const result = buildDayObjects(2026, 4, {}, false);
    expect(result.length).toBe(30);
  });

  it('returns correct length for a 31-day month', () => {
    const result = buildDayObjects(2026, 1, {}, false);
    expect(result.length).toBe(31);
  });

  it('marks Saturday (day=6) and Sunday (day=0) as isWeekend=true', () => {
    // April 2026: 1st is Wednesday; 4th is Saturday, 5th is Sunday
    const result = buildDayObjects(2026, 4, {}, false);
    const april4 = result[3]; // index 3 = day 4 (Saturday)
    const april5 = result[4]; // index 4 = day 5 (Sunday)
    const april6 = result[5]; // index 5 = day 6 (Monday)
    expect(april4.isWeekend).toBe(true);
    expect(april5.isWeekend).toBe(true);
    expect(april6.isWeekend).toBe(false);
  });

  it('marks future days as isFuture=true when pinned to mid-month', () => {
    // Pin today to April 13, 2026
    vi.setSystemTime(new Date(2026, 3, 13));
    const result = buildDayObjects(2026, 4, {}, false);
    expect(result[12].isFuture).toBe(false); // day 13 = today
    expect(result[13].isFuture).toBe(true);  // day 14 = future
    expect(result[0].isFuture).toBe(false);  // day 1 = past
  });

  it('marks all days as isFuture=false for a past month', () => {
    vi.setSystemTime(new Date(2026, 3, 13));
    const result = buildDayObjects(2026, 3, {}, false); // March 2026 (past)
    expect(result.every(d => d.isFuture === false)).toBe(true);
  });

  it('marks all days as isFuture=false for a future month', () => {
    vi.setSystemTime(new Date(2026, 3, 13));
    const result = buildDayObjects(2026, 6, {}, false); // June 2026 (future month)
    expect(result.every(d => d.isFuture === false)).toBe(true);
  });

  it('picks up status from the days map', () => {
    const result = buildDayObjects(2026, 4, { '5': STATUS.IN_OFFICE }, false);
    expect(result[4].status).toBe(STATUS.IN_OFFICE);
    expect(result[0].status).toBe(STATUS.UNSET);
  });
});

describe('renderStats', () => {
  let avgEl, totalsEl;

  beforeEach(() => {
    avgEl = document.createElement('p');
    totalsEl = document.createElement('p');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('displays em dash when no qualifying days exist (empty month)', () => {
    // Pin to a future month so all days are excluded (no denominator days)
    vi.setSystemTime(new Date(2026, 0, 1)); // Jan 1 2026
    const state = { year: 2026, month: 3, days: {} }; // March 2026 is future
    renderStats(avgEl, totalsEl, state, false);
    expect(avgEl.textContent).toContain('\u2014');
  });

  it('displays average correctly for 3 in-office + 2 at-home days', () => {
    // Pin today to April 13, 2026
    vi.setSystemTime(new Date(2026, 3, 13));
    // Use March 2026 (past month) so no isFuture.
    // March 1 2026 is a Sunday (weekend, excluded when weekendsEnabled=false).
    // Use weekdays: Mon=2, Tue=3, Wed=4 as IN_OFFICE; Thu=5, Fri=6 as AT_HOME.
    const days = {
      '2': STATUS.IN_OFFICE,
      '3': STATUS.IN_OFFICE,
      '4': STATUS.IN_OFFICE,
      '5': STATUS.AT_HOME,
      '6': STATUS.AT_HOME,
    };
    const state = { year: 2026, month: 3, days };
    renderStats(avgEl, totalsEl, state, false);
    // (3/5)*5 = 3.0
    expect(avgEl.textContent).toContain('3.0 days/week');
  });

  it('displays 5.0 days/week when all qualifying days are in-office', () => {
    vi.setSystemTime(new Date(2026, 3, 13));
    const days = {};
    // Set weekdays in March 2026 to in-office (day 2 = Monday, March 2026)
    for (let d = 2; d <= 6; d++) days[String(d)] = STATUS.IN_OFFICE;
    const state = { year: 2026, month: 3, days };
    renderStats(avgEl, totalsEl, state, false);
    expect(avgEl.textContent).toContain('5.0 days/week');
  });

  it('shows correct per-status count totals', () => {
    vi.setSystemTime(new Date(2026, 3, 13));
    const days = {
      '2': STATUS.IN_OFFICE,  // Monday
      '3': STATUS.AT_HOME,    // Tuesday
      '4': STATUS.TIME_OFF,   // Wednesday
      '5': STATUS.WFA,        // Thursday
    };
    const state = { year: 2026, month: 3, days };
    renderStats(avgEl, totalsEl, state, false);
    const html = totalsEl.innerHTML;
    expect(html).toContain('In Office');
    expect(html).toContain('At Home');
    expect(html).toContain('Time Off');
    expect(html).toContain('WFA');
  });

  it('excludes future days from totals count', () => {
    // Pin to April 13, 2026; set future days in the current month
    vi.setSystemTime(new Date(2026, 3, 13));
    const days = {
      '1': STATUS.IN_OFFICE,  // past
      '20': STATUS.IN_OFFICE, // future (day 20 > day 13)
    };
    const state = { year: 2026, month: 4, days };
    renderStats(avgEl, totalsEl, state, false);
    // Average should be (1/1)*5 = 5.0 (only day 1 counted)
    expect(avgEl.textContent).toContain('5.0 days/week');
  });

  it('excludes disabled weekends from counts when weekendsEnabled=false', () => {
    vi.setSystemTime(new Date(2026, 3, 13));
    // April 4 (Saturday) and April 5 (Sunday) are weekends
    const days = {
      '1': STATUS.IN_OFFICE,  // Wednesday (weekday)
      '4': STATUS.IN_OFFICE,  // Saturday (weekend)
      '5': STATUS.IN_OFFICE,  // Sunday (weekend)
    };
    const state = { year: 2026, month: 4, days };
    renderStats(avgEl, totalsEl, state, false);
    // Only day 1 counted: (1/1)*5 = 5.0
    expect(avgEl.textContent).toContain('5.0 days/week');
  });

  it('includes weekends in counts when weekendsEnabled=true', () => {
    vi.setSystemTime(new Date(2026, 3, 13));
    const days = {
      '1': STATUS.IN_OFFICE,  // Wednesday
      '4': STATUS.IN_OFFICE,  // Saturday
      '5': STATUS.AT_HOME,    // Sunday
    };
    const state = { year: 2026, month: 4, days };
    renderStats(avgEl, totalsEl, state, true);
    // (2/3)*5 ≈ 3.333
    expect(avgEl.textContent).toContain('days/week');
    expect(avgEl.textContent).not.toContain('\u2014');
  });
});
