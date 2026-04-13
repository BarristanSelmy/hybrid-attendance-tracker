import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../src/dates.js', () => ({
  daysInMonth: vi.fn(),
  firstDayOfWeek: vi.fn(),
}));

vi.mock('../src/storage.js', () => ({
  STATUS: {
    UNSET: 'unset', IN_OFFICE: 'in-office', AT_HOME: 'at-home',
    TIME_OFF: 'time-off', WFA: 'wfa',
  },
}));

const { renderCalendar, renderHeader } = await import('../src/calendar.js');
const { daysInMonth, firstDayOfWeek } = await import('../src/dates.js');

describe('renderCalendar cell count', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    vi.clearAllMocks();
  });

  it('produces exactly 30 day cells for April 2026', () => {
    daysInMonth.mockReturnValue(30);
    firstDayOfWeek.mockReturnValue(3); // Wednesday
    renderCalendar(container, { year: 2026, month: 4, days: {} });
    const dayCells = container.querySelectorAll('[data-day]');
    expect(dayCells.length).toBe(30);
  });

  it('produces 31 day cells for January 2026', () => {
    daysInMonth.mockReturnValue(31);
    firstDayOfWeek.mockReturnValue(4); // Thursday
    renderCalendar(container, { year: 2026, month: 1, days: {} });
    const dayCells = container.querySelectorAll('[data-day]');
    expect(dayCells.length).toBe(31);
  });

  it('produces 3 leading empty cells for April 2026 (offset=3)', () => {
    daysInMonth.mockReturnValue(30);
    firstDayOfWeek.mockReturnValue(3);
    renderCalendar(container, { year: 2026, month: 4, days: {} });
    const emptyCells = container.querySelectorAll('.cal-cell--empty');
    expect(emptyCells.length).toBe(3);
  });
});

describe('renderCalendar grid offset', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    vi.clearAllMocks();
  });

  it('first day cell has gridColumnStart=4 for April 2026 (offset=3)', () => {
    daysInMonth.mockReturnValue(30);
    firstDayOfWeek.mockReturnValue(3); // Wednesday → column 4
    renderCalendar(container, { year: 2026, month: 4, days: {} });
    const firstDayCell = container.querySelector('[data-day="1"]');
    expect(firstDayCell.style.gridColumnStart).toBe('4');
  });

  it('first day cell has gridColumnStart=4 for January 2025 (offset=3)', () => {
    daysInMonth.mockReturnValue(31);
    firstDayOfWeek.mockReturnValue(3); // Wednesday → column 4
    renderCalendar(container, { year: 2025, month: 1, days: {} });
    const firstDayCell = container.querySelector('[data-day="1"]');
    expect(firstDayCell.style.gridColumnStart).toBe('4');
  });

  it('first day cell has gridColumnStart=1 for March 2026 (offset=0, Sunday)', () => {
    daysInMonth.mockReturnValue(31);
    firstDayOfWeek.mockReturnValue(0); // Sunday → column 1 (not 0)
    renderCalendar(container, { year: 2026, month: 3, days: {} });
    const firstDayCell = container.querySelector('[data-day="1"]');
    expect(firstDayCell.style.gridColumnStart).toBe('1');
  });
});

describe('renderCalendar data attributes', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    vi.clearAllMocks();
  });

  it('each day cell has dataset.day equal to the string day number', () => {
    daysInMonth.mockReturnValue(30);
    firstDayOfWeek.mockReturnValue(3);
    renderCalendar(container, { year: 2026, month: 4, days: {} });
    const cells = container.querySelectorAll('[data-day]');
    cells.forEach((cell, i) => {
      expect(cell.dataset.day).toBe(String(i + 1));
    });
  });

  it('day 15 with days[15]=in-office has dataset.status=in-office', () => {
    daysInMonth.mockReturnValue(30);
    firstDayOfWeek.mockReturnValue(3);
    renderCalendar(container, { year: 2026, month: 4, days: { '15': 'in-office' } });
    const cell = container.querySelector('[data-day="15"]');
    expect(cell.dataset.status).toBe('in-office');
  });

  it('day 15 with no entry in days has dataset.status=unset', () => {
    daysInMonth.mockReturnValue(30);
    firstDayOfWeek.mockReturnValue(3);
    renderCalendar(container, { year: 2026, month: 4, days: {} });
    const cell = container.querySelector('[data-day="15"]');
    expect(cell.dataset.status).toBe('unset');
  });
});

describe('renderCalendar today indicator', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    vi.clearAllMocks();
    // Pin "today" to April 13, 2026
    vi.setSystemTime(new Date(2026, 3, 13)); // month is 0-indexed in Date constructor
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds cal-cell--today to the cell matching today when viewing the current month', () => {
    daysInMonth.mockReturnValue(30);
    firstDayOfWeek.mockReturnValue(3);
    renderCalendar(container, { year: 2026, month: 4, days: {} });
    const todayCell = container.querySelector('[data-day="13"]');
    expect(todayCell.classList.contains('cal-cell--today')).toBe(true);
  });

  it('does not add cal-cell--today to any cell when viewing a different month', () => {
    daysInMonth.mockReturnValue(28);
    firstDayOfWeek.mockReturnValue(0);
    renderCalendar(container, { year: 2026, month: 2, days: {} }); // February 2026
    const todayCells = container.querySelectorAll('.cal-cell--today');
    expect(todayCells.length).toBe(0);
  });

  it('does not add cal-cell--today to other day cells in current month', () => {
    daysInMonth.mockReturnValue(30);
    firstDayOfWeek.mockReturnValue(3);
    renderCalendar(container, { year: 2026, month: 4, days: {} });
    const allTodayCells = container.querySelectorAll('.cal-cell--today');
    expect(allTodayCells.length).toBe(1);
    expect(allTodayCells[0].dataset.day).toBe('13');
  });
});

describe('renderHeader', () => {
  it('sets textContent to April 2026 for month=4, year=2026', () => {
    const el = document.createElement('h2');
    renderHeader(el, { year: 2026, month: 4 });
    expect(el.textContent).toBe('April 2026');
  });

  it('sets textContent to January 2025 for month=1, year=2025', () => {
    const el = document.createElement('h2');
    renderHeader(el, { year: 2025, month: 1 });
    expect(el.textContent).toBe('January 2025');
  });

  it('sets textContent to December 2025 for month=12, year=2025', () => {
    const el = document.createElement('h2');
    renderHeader(el, { year: 2025, month: 12 });
    expect(el.textContent).toBe('December 2025');
  });
});
