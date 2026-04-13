// src/app.js
import { AppState } from './app-state.js';
import { renderCalendar, renderHeader } from './calendar.js';

const grid = document.getElementById('cal-grid');
const title = document.getElementById('cal-title');

// Register subscriber — re-renders both grid and title on every state change
AppState.subscribe((state) => {
  renderCalendar(grid, state);
  renderHeader(title, state);
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
