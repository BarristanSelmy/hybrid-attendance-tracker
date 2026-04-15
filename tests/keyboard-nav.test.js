/**
 * Keyboard navigation tests for the roving tabindex grid navigation.
 *
 * Pattern: Strategy — the navigation logic is encapsulated in initKeyboardNav()
 * and tested in isolation from the full app.js module side effects.
 *
 * The handler is extracted as an exported function so it can be tested
 * without needing the full DOM structure that app.js requires at module load.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock app-state before importing the module under test
vi.mock('../src/app-state.js', () => ({
  AppState: {
    cycleDay: vi.fn(),
    subscribe: vi.fn(),
    notify: vi.fn(),
    loadCurrentMonth: vi.fn(),
    year: 2026,
    month: 4,
    days: {},
  },
}));

// Mock storage to avoid localStorage dependency
vi.mock('../src/storage.js', () => ({
  STATUS: {
    UNSET: 'unset',
    IN_OFFICE: 'in-office',
    AT_HOME: 'at-home',
    TIME_OFF: 'time-off',
    WFA: 'wfa',
  },
}));

// Mock cookies.js to avoid document.cookie dependency
vi.mock('../src/cookies.js', () => ({
  getCookie: vi.fn(() => undefined),
  setCookie: vi.fn(),
}));

// Mock calendar.js so app.js import doesn't render into a missing container
vi.mock('../src/calendar.js', () => ({
  renderCalendar: vi.fn(),
  renderHeader: vi.fn(),
}));

// Mock stats.js
vi.mock('../src/stats.js', () => ({
  renderStats: vi.fn(),
}));

// Set up minimal DOM that app.js needs at module load time.
// app.js calls document.getElementById for several elements at the top level;
// we provide stubs so the module can be imported without crashing.
function setupAppDom() {
  const ids = ['cal-grid', 'cal-title', 'stats-average', 'stats-totals',
               'toggle-weekends', 'btn-prev', 'btn-next'];
  for (const id of ids) {
    if (!document.getElementById(id)) {
      const el = document.createElement(id === 'toggle-weekends' ? 'input' : 'div');
      el.id = id;
      if (id === 'toggle-weekends') el.type = 'checkbox';
      document.body.appendChild(el);
    }
  }
}

setupAppDom();

const { initKeyboardNav } = await import('../src/app.js');
const { AppState } = await import('../src/app-state.js');

/**
 * Build a grid of N day cells in a container.
 * Returns { grid, cells }.
 * Cells at indices in weekendIndices get data-disabled="true" and data-weekend="true".
 */
function buildGrid(numCells, weekendIndices = []) {
  const grid = document.createElement('div');
  grid.id = 'cal-grid';
  const cells = [];

  for (let i = 0; i < numCells; i++) {
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    cell.dataset.day = String(i + 1);
    cell.dataset.status = 'unset';
    cell.setAttribute('tabindex', i === 0 ? '0' : '-1');

    if (weekendIndices.includes(i)) {
      cell.dataset.weekend = 'true';
      cell.dataset.disabled = 'true';
    }

    // jsdom needs focus() to work — make element focusable
    cell.tabIndex = i === 0 ? 0 : -1;
    cells.push(cell);
    grid.appendChild(cell);
  }

  return { grid, cells };
}

/**
 * Dispatch a KeyboardEvent on the grid and return it.
 */
function pressKey(grid, key) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  });
  grid.dispatchEvent(event);
  return event;
}

/**
 * Get the cell with tabindex="0" in the grid.
 */
function getFocusedCell(grid) {
  return grid.querySelector('[data-day][tabindex="0"]');
}

describe('initKeyboardNav — ArrowRight', () => {
  it('moves tabindex from cell 5 (index 4) to cell 6 (index 5)', () => {
    const { grid, cells } = buildGrid(10);
    initKeyboardNav(grid);
    // Set tabindex=0 on index 4 (day=5)
    cells.forEach((c, i) => c.setAttribute('tabindex', i === 4 ? '0' : '-1'));
    pressKey(grid, 'ArrowRight');
    expect(getFocusedCell(grid).dataset.day).toBe('6');
  });

  it('cell 5 loses tabindex=0, cell 6 gains tabindex=0', () => {
    const { grid, cells } = buildGrid(10);
    initKeyboardNav(grid);
    cells.forEach((c, i) => c.setAttribute('tabindex', i === 4 ? '0' : '-1'));
    pressKey(grid, 'ArrowRight');
    expect(cells[4].getAttribute('tabindex')).toBe('-1');
    expect(cells[5].getAttribute('tabindex')).toBe('0');
  });

  it('wraps from last cell to first cell (modular wrap per user decision)', () => {
    const { grid, cells } = buildGrid(10);
    initKeyboardNav(grid);
    // Set tabindex=0 on last cell (index 9, day=10)
    cells.forEach((c, i) => c.setAttribute('tabindex', i === 9 ? '0' : '-1'));
    pressKey(grid, 'ArrowRight');
    expect(getFocusedCell(grid).dataset.day).toBe('1');
  });
});

describe('initKeyboardNav — ArrowLeft', () => {
  it('moves tabindex from cell 5 (index 4) to cell 4 (index 3)', () => {
    const { grid, cells } = buildGrid(10);
    initKeyboardNav(grid);
    cells.forEach((c, i) => c.setAttribute('tabindex', i === 4 ? '0' : '-1'));
    pressKey(grid, 'ArrowLeft');
    expect(getFocusedCell(grid).dataset.day).toBe('4');
  });

  it('wraps from first cell to last cell (modular wrap per user decision)', () => {
    const { grid, cells } = buildGrid(10);
    initKeyboardNav(grid);
    // tabindex=0 on first cell (index 0, day=1)
    pressKey(grid, 'ArrowLeft');
    expect(getFocusedCell(grid).dataset.day).toBe('10');
  });
});

describe('initKeyboardNav — ArrowDown', () => {
  it('moves tabindex from cell 3 (index 2) to cell 10 (index 9)', () => {
    const { grid, cells } = buildGrid(14);
    initKeyboardNav(grid);
    cells.forEach((c, i) => c.setAttribute('tabindex', i === 2 ? '0' : '-1'));
    pressKey(grid, 'ArrowDown');
    expect(getFocusedCell(grid).dataset.day).toBe('10');
  });
});

describe('initKeyboardNav — ArrowUp', () => {
  it('moves tabindex from cell 10 (index 9) to cell 3 (index 2)', () => {
    const { grid, cells } = buildGrid(14);
    initKeyboardNav(grid);
    cells.forEach((c, i) => c.setAttribute('tabindex', i === 9 ? '0' : '-1'));
    pressKey(grid, 'ArrowUp');
    expect(getFocusedCell(grid).dataset.day).toBe('3');
  });
});

describe('initKeyboardNav — Enter and Space', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Enter on cell with data-day="5" calls AppState.cycleDay with "5"', () => {
    const { grid, cells } = buildGrid(10);
    initKeyboardNav(grid);
    cells.forEach((c, i) => c.setAttribute('tabindex', i === 4 ? '0' : '-1'));
    pressKey(grid, 'Enter');
    expect(AppState.cycleDay).toHaveBeenCalledWith('5');
  });

  it('Space on cell with data-day="5" calls AppState.cycleDay with "5"', () => {
    const { grid, cells } = buildGrid(10);
    initKeyboardNav(grid);
    cells.forEach((c, i) => c.setAttribute('tabindex', i === 4 ? '0' : '-1'));
    pressKey(grid, ' ');
    expect(AppState.cycleDay).toHaveBeenCalledWith('5');
  });
});

describe('initKeyboardNav — skip disabled weekend cells', () => {
  it('ArrowRight skips a disabled cell and moves to the next enabled cell', () => {
    // 10 cells; cell at index 1 (day=2) is disabled (weekend)
    const { grid, cells } = buildGrid(10, [1]);
    initKeyboardNav(grid);
    // tabindex=0 on index 0 (day=1)
    pressKey(grid, 'ArrowRight');
    // Should skip disabled index 1, go to index 2 (day=3)
    // NOTE: The implementation uses modular arithmetic over enabled cells only,
    // so ArrowRight from the first enabled cell goes to index=1 in the enabled list,
    // which is the second enabled cell (day=3, since day=2 is disabled).
    const focused = getFocusedCell(grid);
    // Disabled cell (day=2) must NOT be focused
    expect(focused.dataset.day).not.toBe('2');
    expect(focused.dataset.disabled).toBeUndefined();
  });

  it('disabled cells never receive tabindex=0', () => {
    const { grid, cells } = buildGrid(10, [0, 6]);
    initKeyboardNav(grid);
    // Set the first enabled cell as focused (index 1, day=2)
    cells.forEach((c, i) => c.setAttribute('tabindex', i === 1 ? '0' : '-1'));
    // Navigate through several steps
    pressKey(grid, 'ArrowRight');
    pressKey(grid, 'ArrowRight');
    pressKey(grid, 'ArrowLeft');
    // After navigation, disabled cells should never have tabindex=0
    const disabledCells = grid.querySelectorAll('[data-disabled="true"]');
    disabledCells.forEach(cell => {
      expect(cell.getAttribute('tabindex')).not.toBe('0');
    });
  });
});
