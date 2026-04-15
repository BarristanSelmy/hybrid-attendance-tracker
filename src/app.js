// src/app.js
import { AppState } from './app-state.js';
import { renderCalendar, renderHeader } from './calendar.js';
import { renderStats } from './stats.js';
import { getCookie, setCookie } from './cookies.js';
import { STATUS } from './storage.js';

const grid = document.getElementById('cal-grid');
const title = document.getElementById('cal-title');
const avgEl = document.getElementById('stats-average');
const totalsEl = document.getElementById('stats-totals');
const toggle = document.getElementById('toggle-weekends');
const brushBar = document.getElementById('brush-bar');

// Cookie name for weekend preference
const COOKIE_WEEKENDS = 'weekends-enabled';

// Read persisted weekend preference; default off per FR-4
let weekendsEnabled = getCookie(COOKIE_WEEKENDS) === 'true';

// Sync checkbox to persisted state on load
toggle.checked = weekendsEnabled;

// Active brush — which status gets painted on day click
let activeStatus = STATUS.IN_OFFICE;

// Track focused day for roving tabindex restoration after re-renders
let focusedDay = null;

// Restore roving tabindex after every calendar re-render
function restoreRovingTabindex() {
  const cells = [...grid.querySelectorAll('[data-day]')];
  if (cells.length === 0) return;

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

// Brush bar — click a button to select the active status
brushBar.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-brush]');
  if (!btn) return;
  activeStatus = btn.dataset.brush;
  brushBar.querySelectorAll('.brush-btn').forEach(b => b.classList.remove('brush-btn--active'));
  btn.classList.add('brush-btn--active');
});

// Day click via event delegation — paint with active brush, toggle off on second click
grid.addEventListener('click', (e) => {
  const cell = e.target.closest('[data-day]');
  if (!cell || cell.dataset.disabled === 'true') return;
  AppState.setDay(cell.dataset.day, activeStatus);
});

// Keyboard navigation — roving tabindex with arrow keys, Enter/Space to paint
export function initKeyboardNav(gridEl) {
  gridEl.addEventListener('keydown', (e) => {
    const cells = [...gridEl.querySelectorAll('[data-day]:not([data-disabled="true"])')];
    const focused = gridEl.querySelector('[data-day][tabindex="0"]');
    if (!focused || cells.length === 0) return;

    const idx = cells.indexOf(focused);

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      AppState.setDay(focused.dataset.day, activeStatus);
      return;
    }

    let delta = 0;
    if (e.key === 'ArrowRight') delta = 1;
    else if (e.key === 'ArrowLeft') delta = -1;
    else if (e.key === 'ArrowDown') delta = 7;
    else if (e.key === 'ArrowUp') delta = -7;
    else return;

    const next = ((idx + delta) % cells.length + cells.length) % cells.length;
    e.preventDefault();

    gridEl.querySelectorAll('[data-day]').forEach(c => c.setAttribute('tabindex', '-1'));
    cells[next].setAttribute('tabindex', '0');
    cells[next].focus();
    focusedDay = Number(cells[next].dataset.day);
  });
}

initKeyboardNav(grid);

// Initial render — loads persisted data for current month, triggers subscriber
AppState.loadCurrentMonth();
