// src/app.js
import { AppState } from './app-state.js';
import { renderCalendar, renderHeader } from './calendar.js';
import { renderStats } from './stats.js';
import { getCookie, setCookie } from './cookies.js';

const grid = document.getElementById('cal-grid');
const title = document.getElementById('cal-title');
const avgEl = document.getElementById('stats-average');
const totalsEl = document.getElementById('stats-totals');
const toggle = document.getElementById('toggle-weekends');

// Cookie name for weekend preference
const COOKIE_WEEKENDS = 'weekends-enabled';

// Read persisted weekend preference; default off per FR-4
let weekendsEnabled = getCookie(COOKIE_WEEKENDS) === 'true';

// Sync checkbox to persisted state on load
toggle.checked = weekendsEnabled;

// Track focused day for roving tabindex restoration after re-renders
let focusedDay = null;

// Restore roving tabindex after every calendar re-render
function restoreRovingTabindex() {
  const cells = [...grid.querySelectorAll('[data-day]')];
  if (cells.length === 0) return;

  // Find target cell: previously focused day, or today, or first cell
  let target = null;
  if (focusedDay) {
    target = cells.find(c => c.dataset.day === String(focusedDay));
  }
  if (!target) {
    target = grid.querySelector('.cal-cell--today') || cells[0];
  }

  cells.forEach(c => c.setAttribute('tabindex', '-1'));
  target.setAttribute('tabindex', '0');
}

// Register subscriber — re-renders calendar, header, and stats on every state change
AppState.subscribe((state) => {
  renderCalendar(grid, state, weekendsEnabled);
  renderHeader(title, state);
  renderStats(avgEl, totalsEl, state, weekendsEnabled);
  restoreRovingTabindex();
});

// Month navigation buttons
document.getElementById('btn-prev').addEventListener('click', () => AppState.navigate(-1));
document.getElementById('btn-next').addEventListener('click', () => AppState.navigate(+1));

// Weekend toggle — persist preference as cookie, re-render everything
toggle.addEventListener('change', () => {
  weekendsEnabled = toggle.checked;
  setCookie(COOKIE_WEEKENDS, String(weekendsEnabled), {
    'max-age': 31536000,
    SameSite: 'Lax',
    Secure: true,
  });
  AppState.notify();
});

// Day click via event delegation — one listener on container, never on cells
// closest('[data-day]') handles clicks on the inner <span> (date number)
grid.addEventListener('click', (e) => {
  const cell = e.target.closest('[data-day]');
  if (!cell) return;
  AppState.cycleDay(cell.dataset.day);
});

// Keyboard navigation — roving tabindex with arrow keys, Enter/Space to cycle status
grid.addEventListener('keydown', (e) => {
  const cells = [...grid.querySelectorAll('[data-day]:not([data-disabled="true"])')];
  const focused = grid.querySelector('[data-day][tabindex="0"]');
  if (!focused || cells.length === 0) return;

  const idx = cells.indexOf(focused);

  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    AppState.cycleDay(focused.dataset.day);
    return;
  }

  let delta = 0;
  if (e.key === 'ArrowRight') delta = 1;
  else if (e.key === 'ArrowLeft') delta = -1;
  else if (e.key === 'ArrowDown') delta = 7;
  else if (e.key === 'ArrowUp') delta = -7;
  else return;

  // Wrap using modular arithmetic — natural grid feel per user decision
  const next = ((idx + delta) % cells.length + cells.length) % cells.length;
  e.preventDefault();

  // Update all cells (including disabled) so only one has tabindex=0
  grid.querySelectorAll('[data-day]').forEach(c => c.setAttribute('tabindex', '-1'));
  cells[next].setAttribute('tabindex', '0');
  cells[next].focus();
  focusedDay = Number(cells[next].dataset.day);
});

// Initial render — loads persisted data for current month, triggers subscriber
AppState.loadCurrentMonth();
