import { describe, it, expect } from 'vitest';
import { calcAverage } from '../src/calc.js';
import { STATUS } from '../src/storage.js';

// Helper to build a day object
function day(status, { isWeekend = false, isFuture = false } = {}) {
  return { status, isWeekend, isFuture };
}

describe('calcAverage', () => {
  it('calculates correctly for a normal mid-month mix', () => {
    // 5 in-office, 3 at-home, 2 time-off, 1 wfa, 9 unset (20 weekdays)
    // denominator = 5 + 3 = 8, average = (5/8)*5 = 3.125
    const days = [
      ...Array(5).fill(null).map(() => day(STATUS.IN_OFFICE)),
      ...Array(3).fill(null).map(() => day(STATUS.AT_HOME)),
      ...Array(2).fill(null).map(() => day(STATUS.TIME_OFF)),
      ...Array(1).fill(null).map(() => day(STATUS.WFA)),
      ...Array(9).fill(null).map(() => day(STATUS.UNSET)),
    ];
    expect(calcAverage(days, false)).toBeCloseTo(3.125);
  });

  it('returns 5.0 when all days are in-office', () => {
    const days = Array(20).fill(null).map(() => day(STATUS.IN_OFFICE));
    expect(calcAverage(days, false)).toBe(5.0);
  });

  it('returns 0.0 when all days are at-home', () => {
    const days = Array(20).fill(null).map(() => day(STATUS.AT_HOME));
    expect(calcAverage(days, false)).toBe(0.0);
  });

  it('returns null when all days are WFA (denominator = 0)', () => {
    const days = Array(20).fill(null).map(() => day(STATUS.WFA));
    expect(calcAverage(days, false)).toBeNull();
  });

  it('returns null when all days are time-off (denominator = 0)', () => {
    const days = Array(20).fill(null).map(() => day(STATUS.TIME_OFF));
    expect(calcAverage(days, false)).toBeNull();
  });

  it('returns null for an empty month (all unset)', () => {
    const days = Array(20).fill(null).map(() => day(STATUS.UNSET));
    expect(calcAverage(days, false)).toBeNull();
  });

  it('skips weekend days when weekendsEnabled is false', () => {
    // 2 in-office weekdays + 2 in-office weekend days — weekends excluded
    // denominator = 2, average = (2/2)*5 = 5.0
    const days = [
      day(STATUS.IN_OFFICE),
      day(STATUS.IN_OFFICE),
      day(STATUS.IN_OFFICE, { isWeekend: true }),
      day(STATUS.IN_OFFICE, { isWeekend: true }),
    ];
    expect(calcAverage(days, false)).toBe(5.0);
  });

  it('includes weekend days in calculation when weekendsEnabled is true', () => {
    // 2 in-office weekdays + 2 in-office weekends + 2 at-home weekdays
    // denominator = 6, average = (4/6)*5 ≈ 3.333
    const days = [
      day(STATUS.IN_OFFICE),
      day(STATUS.IN_OFFICE),
      day(STATUS.IN_OFFICE, { isWeekend: true }),
      day(STATUS.IN_OFFICE, { isWeekend: true }),
      day(STATUS.AT_HOME),
      day(STATUS.AT_HOME),
    ];
    expect(calcAverage(days, true)).toBeCloseTo((4 / 6) * 5);
  });

  it('skips future days regardless of status', () => {
    // 1 in-office past + 5 in-office future — only past day counts
    // denominator = 1, average = (1/1)*5 = 5.0
    const days = [
      day(STATUS.IN_OFFICE),
      ...Array(5).fill(null).map(() => day(STATUS.IN_OFFICE, { isFuture: true })),
    ];
    expect(calcAverage(days, false)).toBe(5.0);
  });

  it('calculates 1.0 for 1 in-office among 4 at-home', () => {
    // denominator = 5, average = (1/5)*5 = 1.0
    const days = [
      day(STATUS.IN_OFFICE),
      ...Array(4).fill(null).map(() => day(STATUS.AT_HOME)),
    ];
    expect(calcAverage(days, false)).toBe(1.0);
  });
});
