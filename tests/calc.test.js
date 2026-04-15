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
    // denominator = 5 + 3 + 9 = 17 (unset past days are eligible working days)
    // average = (5/17)*5 ≈ 1.4706
    const days = [
      ...Array(5).fill(null).map(() => day(STATUS.IN_OFFICE)),
      ...Array(3).fill(null).map(() => day(STATUS.AT_HOME)),
      ...Array(2).fill(null).map(() => day(STATUS.TIME_OFF)),
      ...Array(1).fill(null).map(() => day(STATUS.WFA)),
      ...Array(9).fill(null).map(() => day(STATUS.UNSET)),
    ];
    expect(calcAverage(days, false)).toBeCloseTo((5 / 17) * 5);
  });

  it('returns 5.0 when all days are in-office', () => {
    const days = Array(20).fill(null).map(() => day(STATUS.IN_OFFICE));
    expect(calcAverage(days, false)).toBe(5.0);
  });

  it('returns 0.0 when all days are at-home', () => {
    const days = Array(20).fill(null).map(() => day(STATUS.AT_HOME));
    expect(calcAverage(days, false)).toBe(0.0);
  });

  it('returns 0 when all days are WFA (denominator = 0)', () => {
    const days = Array(20).fill(null).map(() => day(STATUS.WFA));
    expect(calcAverage(days, false)).toBe(0);
  });

  it('returns 0 when all days are time-off (denominator = 0)', () => {
    const days = Array(20).fill(null).map(() => day(STATUS.TIME_OFF));
    expect(calcAverage(days, false)).toBe(0);
  });

  it('returns 0 for an empty month (all unset past days)', () => {
    // Unset past days count in denominator but contribute 0 in-office
    const days = Array(20).fill(null).map(() => day(STATUS.UNSET));
    expect(calcAverage(days, false)).toBe(0);
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

  it('counts future days with explicit status', () => {
    // 1 in-office past + 5 in-office future — all count
    // denominator = 6, inOffice = 6, average = (6/6)*5 = 5.0
    const days = [
      day(STATUS.IN_OFFICE),
      ...Array(5).fill(null).map(() => day(STATUS.IN_OFFICE, { isFuture: true })),
    ];
    expect(calcAverage(days, false)).toBe(5.0);
  });

  it('skips future unset days but counts future days with status', () => {
    // 1 in-office past + 1 in-office future + 3 unset future
    // denominator = 2 (only the two in-office days — unset futures skipped)
    // average = (2/2)*5 = 5.0
    const days = [
      day(STATUS.IN_OFFICE),
      day(STATUS.IN_OFFICE, { isFuture: true }),
      ...Array(3).fill(null).map(() => day(STATUS.UNSET, { isFuture: true })),
    ];
    expect(calcAverage(days, false)).toBe(5.0);
  });

  it('includes unset past days in denominator', () => {
    // 1 in-office + 4 unset (past) — all eligible
    // denominator = 5, average = (1/5)*5 = 1.0
    const days = [
      day(STATUS.IN_OFFICE),
      ...Array(4).fill(null).map(() => day(STATUS.UNSET)),
    ];
    expect(calcAverage(days, false)).toBe(1.0);
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
