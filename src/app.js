// src/app.js
import { AppState } from './app-state.js';
import { renderCalendar, renderHeader } from './calendar.js';
import { renderStats } from './stats.js';

const grid = document.getElementById('cal-grid');
const title = document.getElementById('cal-title');
const avgEl = document.getElementById('stats-average');
const totalsEl = document.getElementById('stats-totals');

// Default off per FR-4; Plan 02 will wire the cookie read
let weekendsEnabled = false;

// Register subscriber — re-renders calendar, header, and stats on every state change
AppState.subscribe((state) => {
  renderCalendar(grid, state);
  renderHeader(title, state);
  renderStats(avgEl, totalsEl, state, weekendsEnabled);
});

// Month navigation buttons
document.getElementById('btn-prev').addEventListener('click', () => AppState.navigate(-1));
document.getElementById('btn-next').addEventListener('click', () => AppState.navigate(+1));

// Day click via event delegation — one listener on container, never on cells
// closest('[data-day]') handles clicks on the inner <span> (date number)
grid.addEventListener('click', (e) => {
  const cell = e.target.closest('[data-day]');
  if (!cell) return;
  AppState.cycleDay(cell.dataset.day);
});

// Initial render — loads persisted data for current month, triggers subscriber
AppState.loadCurrentMonth();
