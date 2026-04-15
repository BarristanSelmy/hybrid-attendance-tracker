import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock storage and dates before importing AppState
vi.mock('../src/storage.js', () => ({
  STATUS: {
    UNSET: 'unset', IN_OFFICE: 'in-office', AT_HOME: 'at-home',
    TIME_OFF: 'time-off', WFA: 'wfa',
  },
  saveMonth: vi.fn(),
  loadMonth: vi.fn(() => null),
}));

vi.mock('../src/dates.js', () => ({
  toMonthKey: vi.fn((y, m) => `${y}-${String(m).padStart(2, '0')}`),
}));

// Import after mocks
const { AppState } = await import('../src/app-state.js');
const { saveMonth, loadMonth } = await import('../src/storage.js');

describe('AppState.setDay', () => {
  beforeEach(() => {
    AppState.days = {};
    AppState._subscribers = [];
    vi.clearAllMocks();
  });

  it('sets a day to the given status', () => {
    AppState.setDay('5', 'in-office');
    expect(AppState.days['5']).toBe('in-office');
  });

  it('clears a day when same status is applied again (toggle off)', () => {
    AppState.days['5'] = 'in-office';
    AppState.setDay('5', 'in-office');
    expect('5' in AppState.days).toBe(false);
  });

  it('replaces an existing status with a different one', () => {
    AppState.days['5'] = 'in-office';
    AppState.setDay('5', 'at-home');
    expect(AppState.days['5']).toBe('at-home');
  });

  it('sets from unset to any status', () => {
    AppState.setDay('10', 'time-off');
    expect(AppState.days['10']).toBe('time-off');
  });

  it('calls saveMonth after each setDay call', () => {
    AppState.setDay('5', 'in-office');
    expect(saveMonth).toHaveBeenCalledOnce();
  });

  it('calls notify after setDay', () => {
    const spy = vi.fn();
    AppState.subscribe(spy);
    AppState.setDay('5', 'wfa');
    expect(spy).toHaveBeenCalledOnce();
  });
});

describe('AppState.navigate', () => {
  beforeEach(() => {
    AppState.days = {};
    AppState._subscribers = [];
    AppState.year = 2026;
    AppState.month = 6;
    vi.clearAllMocks();
  });

  it('navigate(+1) increments month', () => {
    AppState.navigate(+1);
    expect(AppState.month).toBe(7);
    expect(AppState.year).toBe(2026);
  });

  it('navigate(-1) decrements month', () => {
    AppState.navigate(-1);
    expect(AppState.month).toBe(5);
    expect(AppState.year).toBe(2026);
  });

  it('navigate(+1) from month 12 wraps to month 1 of next year', () => {
    AppState.month = 12;
    AppState.year = 2026;
    AppState.navigate(+1);
    expect(AppState.month).toBe(1);
    expect(AppState.year).toBe(2027);
  });

  it('navigate(-1) from month 1 wraps to month 12 of previous year', () => {
    AppState.month = 1;
    AppState.year = 2026;
    AppState.navigate(-1);
    expect(AppState.month).toBe(12);
    expect(AppState.year).toBe(2025);
  });

  it('calls loadCurrentMonth (which calls loadMonth) after navigate', () => {
    AppState.navigate(+1);
    expect(loadMonth).toHaveBeenCalled();
  });
});

describe('AppState.subscribe / notify', () => {
  beforeEach(() => {
    AppState.days = {};
    AppState._subscribers = [];
    vi.clearAllMocks();
  });

  it('subscribe registers a callback that receives AppState on notify', () => {
    const spy = vi.fn();
    AppState.subscribe(spy);
    AppState.notify();
    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith(AppState);
  });

  it('notify calls all registered subscribers', () => {
    const spy1 = vi.fn();
    const spy2 = vi.fn();
    AppState.subscribe(spy1);
    AppState.subscribe(spy2);
    AppState.notify();
    expect(spy1).toHaveBeenCalledOnce();
    expect(spy2).toHaveBeenCalledOnce();
  });
});

describe('AppState.loadCurrentMonth', () => {
  beforeEach(() => {
    AppState.days = {};
    AppState._subscribers = [];
    AppState.year = 2026;
    AppState.month = 6;
    vi.clearAllMocks();
  });

  it('sets days to {} when loadMonth returns null', () => {
    loadMonth.mockReturnValue(null);
    AppState.loadCurrentMonth();
    expect(AppState.days).toEqual({});
  });

  it('sets days to a copy of stored.days when data exists', () => {
    const storedDays = { '1': 'in-office', '15': 'at-home' };
    loadMonth.mockReturnValue({ schemaVersion: 1, days: storedDays });
    AppState.loadCurrentMonth();
    expect(AppState.days).toEqual(storedDays);
    expect(AppState.days).not.toBe(storedDays);
  });

  it('calls notify after loading', () => {
    const spy = vi.fn();
    AppState.subscribe(spy);
    AppState.loadCurrentMonth();
    expect(spy).toHaveBeenCalledOnce();
  });
});
