import { daysInMonth, firstDayOfWeek } from './dates.js';
import { STATUS } from './storage.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function renderCalendar(container, state) {
  const { year, month, days } = state;

  // Capture today once — never inside the cell loop (avoid midnight inconsistency)
  const todayObj = new Date();
  const isCurrentMonth = (
    year === todayObj.getFullYear() &&
    month === (todayObj.getMonth() + 1)
  );
  const todayDay = isCurrentMonth ? todayObj.getDate() : -1;

  const totalDays = daysInMonth(year, month);
  const startOffset = firstDayOfWeek(year, month);  // 0=Sun … 6=Sat

  container.innerHTML = '';

  // Leading empty cells
  for (let i = 0; i < startOffset; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-cell cal-cell--empty';
    container.appendChild(empty);
  }

  // Day cells
  for (let d = 1; d <= totalDays; d++) {
    const status = days[String(d)] || STATUS.UNSET;
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    cell.dataset.day = String(d);
    cell.dataset.status = status;
    if (d === todayDay) cell.classList.add('cal-cell--today');
    if (d === 1) cell.style.gridColumnStart = String(startOffset + 1);

    const num = document.createElement('span');
    num.className = 'cal-cell__num';
    num.textContent = String(d);
    // pointer-events: none applied via CSS, not inline style
    cell.appendChild(num);

    container.appendChild(cell);
  }
}

export function renderHeader(el, state) {
  el.textContent = MONTH_NAMES[state.month - 1] + ' ' + state.year;
}
