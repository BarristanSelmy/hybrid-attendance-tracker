# Phase 2: Calendar and Core Loop - Research

**Researched:** 2026-04-13
**Domain:** Vanilla JS DOM manipulation, CSS Grid calendar layout, pub-sub state management, GitHub Pages deployment
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Status colors: In Office=#4CAF50, At Home=#2196F3, Time Off=#9E9E9E, WFA=#FF9800, Unset=transparent
- Today indicator: 2px solid accent border — ring/outline style, not fill
- Clean minimal style: rounded corners, subtle shadows, system font stack
- Cell min-height 48px, date number top-left, status fills entire cell background
- Day-of-week headers: 3-letter abbreviations (Sun, Mon, Tue, Wed, Thu, Fri, Sat)
- Leading/trailing empty cells: no content, same background as page
- Month/year header: "April 2026" centered with ◀ ▶ arrow buttons on each side
- Week starts Sunday (matches JS getDay() convention)
- State architecture: AppState object with subscribe/notify pub-sub; components re-render on state change
- Single index.html with inline `<script type="module">` importing from src/
- CSS in separate style.css
- GitHub Pages: .nojekyll file + ?v=1 cache-busting query params on CSS/JS references
- Small inline legend below calendar showing color swatches with status labels

### Claude's Discretion
- Exact shadow/border-radius values for cells
- Accent color for today indicator border
- Specific responsive breakpoint values
- Internal component decomposition within the above constraints

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FR-1 | Monthly calendar grid: 7-column layout, date numbers, correct day-of-week alignment, empty leading/trailing cells | CSS Grid 7-column, firstDayOfWeek() for offset calculation, full-grid re-render pattern |
| FR-2 | Click/tap to cycle day status: unset→in-office→at-home→time-off→wfa→unset; persist immediately to localStorage | Event delegation on grid container, STATUS constants cycle array, saveMonth() integration |
| FR-3 | Color-coded status per cell; colors locked in CONTEXT.md decisions | CSS custom properties for status colors, applied via data-status attribute or class |
| FR-7 | Live recalculation on every status change — stats update without page reload | AppState pub-sub: notify subscribers after every state mutation |
| FR-8 | Prev/next month navigation; display current month name + year; default to current month on load | AppState.currentYear/currentMonth, navigate() mutates state and notifies |
| FR-9 | Today indicator: visually highlight current date (only when viewing current month) | Compare cell date to today in renderGrid(); apply today CSS class conditionally |
| NFR-2 | GitHub Pages deployment: .nojekyll, ?v=1 cache-busting on assets, works from repo root | .nojekyll file, ?v=1 query param on link/script tags in index.html |
| NFR-3 | Responsive: usable on desktop and mobile, no horizontal scrolling | CSS Grid with fr units; min-width on cells at small viewport; media query for font size |
</phase_requirements>

---

## Summary

Phase 2 builds the visible application on top of the Phase 1 storage layer. The core challenge is not algorithmic — it is structural: deciding how AppState, the calendar renderer, and the event layer connect without a framework. The locked decision is a pub-sub AppState (`subscribe`/`notify`), which is the correct minimal pattern for this scale. The entire calendar is 31 cells maximum; full DOM re-render on every state change is fast and correct — no diffing, no virtual DOM.

The CSS Grid calendar layout is well-understood. A 7-column grid with `grid-column-start` set to `firstDayOfWeek() + 1` for the first day cell produces correct alignment for any month. Empty cells before and after the active days need no special treatment — CSS Grid auto-placement fills remaining cells. The main pitfall is confusing 0-indexed CSS `grid-column` (1-based) with JS `getDay()` (0-based); off by one produces a visually wrong calendar.

GitHub Pages deployment for a zero-build project is trivial: push to the repo, add `.nojekyll` to prevent Jekyll processing, and add `?v=1` to CSS/JS `<link>`/`<script>` `src` attributes to prevent stale cache on updates. No CI, no build command, no publish directory config needed.

**Primary recommendation:** Build AppState as a plain JS object with `state`, `subscribe(fn)`, and `notify()`. Render the calendar grid by clearing the container `innerHTML` and rebuilding all cells on every `notify()` call. Wire click handler via event delegation on the grid container (one listener, not 31).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| (none) | — | Pure HTML/CSS/JS per NFR-1 | Zero-dependency constraint is locked |

### Supporting (dev only — not shipped)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 3.x (installed) | Unit tests for AppState logic | Already installed from Phase 1 |
| jsdom | 29.x (installed) | DOM environment for vitest | Already installed from Phase 1 |

**No new installations required.** Phase 1 established full test infrastructure. All shipped code is HTML/CSS/JS only.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Full re-render on notify | Targeted DOM patch per cell | Patch is premature optimization at 31 cells; re-render is simpler and correct |
| Event delegation (one listener) | Listener per cell | Per-cell listeners must be removed/re-added on every re-render; delegation avoids this entirely |
| CSS data-status attribute styling | Class-per-status | data-status is cleaner — one attribute communicates both value and style hook; avoids class proliferation |
| ?v=1 manual cache-bust | Service worker / ETag | Service worker is explicitly out of scope (REQUIREMENTS.md); ?v=1 is sufficient for static GitHub Pages |

---

## Architecture Patterns

### Recommended File Structure
```
index.html          # Entry point — imports app.js as module, links style.css?v=1
style.css           # All CSS including grid layout, status colors, responsive rules
src/
├── storage.js      # (Phase 1) saveMonth, loadMonth, clearMonth, STATUS, SCHEMA_VERSION
├── dates.js        # (Phase 1) daysInMonth, firstDayOfWeek, createLocalDate, toMonthKey
├── calc.js         # (Phase 1) calcAverage
├── app-state.js    # AppState pub-sub object — state, subscribe(), notify(), mutators
└── calendar.js     # renderCalendar(container, state) — builds grid DOM from state
tests/
├── app-state.test.js
└── calendar.test.js   # optional — DOM rendering tests are lower priority than state tests
.nojekyll           # Required for GitHub Pages — prevents Jekyll processing
```

### Pattern 1: AppState Pub-Sub Object

**What:** A plain JS object holding current application state, a subscriber list, and mutator functions that call `notify()` after every change.

**When to use:** Required — this is the locked architecture decision from CONTEXT.md.

```javascript
// src/app-state.js
import { loadMonth, saveMonth, STATUS } from './storage.js';
import { toMonthKey } from './dates.js';

const STATUS_CYCLE = [
  STATUS.UNSET,
  STATUS.IN_OFFICE,
  STATUS.AT_HOME,
  STATUS.TIME_OFF,
  STATUS.WFA,
];

const today = new Date();

export const AppState = {
  year: today.getFullYear(),
  month: today.getMonth() + 1,  // 1-indexed
  days: {},                      // { '1': 'in-office', '15': 'at-home', ... }
  _subscribers: [],

  subscribe(fn) {
    this._subscribers.push(fn);
  },

  notify() {
    for (const fn of this._subscribers) fn(this);
  },

  // Load persisted data for current month into this.days
  loadCurrentMonth() {
    const key = toMonthKey(this.year, this.month);
    const stored = loadMonth(key);
    this.days = (stored && stored.days) ? stored.days : {};
    this.notify();
  },

  // Navigate to prev/next month
  navigate(delta) {
    this.month += delta;
    if (this.month > 12) { this.month = 1; this.year++; }
    if (this.month < 1)  { this.month = 12; this.year--; }
    this.loadCurrentMonth();
    // notify() is called inside loadCurrentMonth()
  },

  // Cycle a single day's status and persist
  cycleDay(dayNum) {
    const current = this.days[dayNum] || STATUS.UNSET;
    const idx = STATUS_CYCLE.indexOf(current);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    if (next === STATUS.UNSET) {
      delete this.days[dayNum];
    } else {
      this.days[dayNum] = next;
    }
    saveMonth(toMonthKey(this.year, this.month), this.days);
    this.notify();
  },
};
```

**Key design notes:**
- `days` is a sparse object keyed by day number string (`'1'` through `'31'`). Missing keys = UNSET. This is compact and directly matches what `saveMonth` persists.
- `notify()` is called after every mutation. Subscribers re-render synchronously — safe at this scale.
- `today` is captured once at module load. All "is today?" comparisons use this snapshot.

### Pattern 2: Calendar Grid Renderer (Full Re-render)

**What:** A function that clears a container and rebuilds all 42 grid slots (6 rows × 7 cols) from scratch on each call.

**When to use:** Called by the subscriber registered in `app.js`. Receives state, renders DOM.

```javascript
// src/calendar.js
import { daysInMonth, firstDayOfWeek } from './dates.js';
import { STATUS } from './storage.js';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

export function renderCalendar(container, state) {
  const { year, month, days } = state;
  const todayObj = new Date();
  const isCurrentMonth = (
    year === todayObj.getFullYear() && month === (todayObj.getMonth() + 1)
  );
  const todayDay = isCurrentMonth ? todayObj.getDate() : -1;

  const totalDays = daysInMonth(year, month);
  const startOffset = firstDayOfWeek(year, month); // 0=Sun…6=Sat

  // Clear and rebuild
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
    cell.dataset.day = d;
    cell.dataset.status = status;
    if (d === todayDay) cell.classList.add('cal-cell--today');

    const num = document.createElement('span');
    num.className = 'cal-cell__num';
    num.textContent = d;
    cell.appendChild(num);

    container.appendChild(cell);
  }
}

export function renderHeader(yearEl, monthEl, state) {
  monthEl.textContent = MONTH_NAMES[state.month - 1] + ' ' + state.year;
}
```

**Key design notes:**
- `data-status` attribute on each cell drives all color CSS via `[data-status="in-office"]` selectors.
- `cal-cell--today` class adds the 2px ring border without overriding background.
- No trailing empty cells needed — CSS Grid auto-placement fills remaining space invisibly.
- The renderer is a pure function (takes state, returns nothing, only mutates DOM). Testable in isolation.

### Pattern 3: Event Delegation for Click Handling

**What:** One `click` listener on the grid container, not per-cell. Uses `event.target.closest('[data-day]')` to find the clicked cell.

**When to use:** Required when grid is re-rendered on every state change (per-cell listeners would be lost on re-render).

```javascript
// In app.js bootstrap
gridContainer.addEventListener('click', (e) => {
  const cell = e.target.closest('[data-day]');
  if (!cell) return;
  AppState.cycleDay(cell.dataset.day);
});
```

**Why `closest`:** The cell contains a `<span>` for the date number. Clicking the number fires the event on the span, not the cell. `closest('[data-day]')` traverses up from the span to find the cell div.

### Pattern 4: CSS Grid Calendar Layout

**What:** 7-column grid with equal-width columns. First-day offset via `grid-column-start` on the first day cell.

```css
/* style.css */
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

/* Day-of-week header row */
.cal-header-cell {
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 0;
  color: #666;
}

/* Day cell */
.cal-cell {
  min-height: 48px;
  border-radius: 6px;
  position: relative;
  cursor: pointer;
  background: transparent;
  transition: opacity 0.1s;
}

.cal-cell__num {
  position: absolute;
  top: 4px;
  left: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  color: #333;
  pointer-events: none;  /* ensures click bubbles to cell, not span */
}

/* Status colors via data-status attribute */
.cal-cell[data-status="in-office"]  { background: #4CAF50; }
.cal-cell[data-status="at-home"]    { background: #2196F3; }
.cal-cell[data-status="time-off"]   { background: #9E9E9E; }
.cal-cell[data-status="wfa"]        { background: #FF9800; }
.cal-cell[data-status="unset"]      { background: transparent; border: 1px solid #e0e0e0; }

/* Today indicator — ring, not fill */
.cal-cell--today {
  outline: 2px solid #1565C0;
  outline-offset: -2px;
}

/* Empty cells — no border, no background */
.cal-cell--empty {
  background: transparent;
  cursor: default;
  border: none;
}

/* Responsive */
@media (max-width: 480px) {
  .cal-cell { min-height: 40px; }
  .cal-cell__num { font-size: 0.7rem; }
}
```

**Key note on `pointer-events: none` on the span:** Without this, `e.target` inside the click handler is the `<span>`, not the cell `<div>`. `closest('[data-day]')` handles this anyway, but `pointer-events: none` is a clean belt-and-suspenders addition.

### Pattern 5: index.html Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hybrid Attendance Tracker</title>
  <link rel="stylesheet" href="style.css?v=1">
</head>
<body>
  <div id="app">
    <header class="cal-nav">
      <button id="btn-prev" aria-label="Previous month">&#9664;</button>
      <h1 id="cal-title"></h1>
      <button id="btn-next" aria-label="Next month">&#9654;</button>
    </header>

    <div class="cal-headers">
      <div class="cal-header-cell">Sun</div>
      <div class="cal-header-cell">Mon</div>
      <div class="cal-header-cell">Tue</div>
      <div class="cal-header-cell">Wed</div>
      <div class="cal-header-cell">Thu</div>
      <div class="cal-header-cell">Fri</div>
      <div class="cal-header-cell">Sat</div>
    </div>

    <div id="cal-grid" class="cal-grid"></div>

    <div class="cal-legend">
      <span class="legend-item" data-status="in-office">In Office</span>
      <span class="legend-item" data-status="at-home">At Home</span>
      <span class="legend-item" data-status="time-off">Time Off</span>
      <span class="legend-item" data-status="wfa">WFA</span>
    </div>
  </div>

  <script type="module" src="src/app.js?v=1"></script>
</body>
</html>
```

**Why `▶`/`◀` as HTML entities:** ◀ = `&#9664;`, ▶ = `&#9654;`. No image assets, no font icons needed.

### Pattern 6: app.js Bootstrap (Entry Point)

```javascript
// src/app.js
import { AppState } from './app-state.js';
import { renderCalendar, renderHeader } from './calendar.js';

const grid = document.getElementById('cal-grid');
const title = document.getElementById('cal-title');

// Register subscriber — re-render on any state change
AppState.subscribe((state) => {
  renderCalendar(grid, state);
  renderHeader(null, title, state);
});

// Wire navigation buttons
document.getElementById('btn-prev').addEventListener('click', () => AppState.navigate(-1));
document.getElementById('btn-next').addEventListener('click', () => AppState.navigate(+1));

// Wire day click via event delegation
grid.addEventListener('click', (e) => {
  const cell = e.target.closest('[data-day]');
  if (!cell) return;
  AppState.cycleDay(cell.dataset.day);
});

// Initial render
AppState.loadCurrentMonth();
```

### Anti-Patterns to Avoid

- **Per-cell event listeners:** Adding `addEventListener` to each of 31 cells on every render floods the listener queue and requires cleanup. Use delegation.
- **Storing full Date objects in state:** Store year, month, day numbers only. Date objects are not serializable and introduce timezone risk if ever stringified.
- **Using `innerHTML` string concatenation to build cells:** XSS risk if any user data (day numbers) is ever interpolated. Use `createElement` / `textContent` for cell content.
- **`grid-column-start` on every cell:** Only the FIRST cell of the month needs `grid-column-start: startOffset + 1`. CSS auto-placement handles all subsequent cells.
- **Deriving "today" on every render inside the loop:** Capture `new Date()` once before the loop. Multiple `new Date()` calls inside a render triggered near midnight could produce inconsistent results.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Month name display | Lookup table of 12 strings | Intl.DateTimeFormat (optional) OR hardcoded array | Intl adds complexity for no benefit here; a 12-element array is readable and zero-risk |
| Status color mapping | Inline style per cell in JS | CSS `[data-status]` attribute selectors | CSS is the right layer; JS should not own color values |
| Responsive grid | JavaScript resize observers | CSS Grid `1fr` columns + `@media` query | CSS handles it natively without JS |
| "Is this month current?" check | Complex date range logic | `year === today.getFullYear() && month === today.getMonth() + 1` | Two comparisons, no library needed |
| Cache-busting | Service worker, build hash | `?v=1` query param incremented manually | Sufficient for a static project with no CI/CD pipeline |

**Key insight:** All complexity in this phase is structural (file organization, data flow) not algorithmic. Resist the urge to add abstraction layers — 31 cells rendered 1-2 times per second at most is not a performance problem.

---

## Common Pitfalls

### Pitfall 1: Off-by-One in grid-column-start
**What goes wrong:** First day cell renders one column too early or late. Calendar days misalign with day-of-week headers.
**Why it happens:** `firstDayOfWeek()` returns 0–6 (0=Sunday). CSS `grid-column-start` is 1-indexed. Setting `grid-column-start: firstDayOfWeek()` when Sunday (0) puts it in column 0, which wraps to the last column of the prior row.
**How to avoid:** Set `grid-column-start: firstDayOfWeek(year, month) + 1`. For Sunday (0), this correctly gives column 1.
**Warning signs:** January 2025 starts on a Wednesday (index 3); cell should be in column 4. If it's in column 3, the offset is missing the +1.

### Pitfall 2: Click Event Fires on Child Span, Not Cell Div
**What goes wrong:** `e.target` is the `<span>` (date number) inside the cell. `e.target.dataset.day` is undefined. Click handler silently does nothing.
**Why it happens:** The `<span>` visually covers most of the cell's clickable area. The click event fires on the innermost target element.
**How to avoid:** Use `e.target.closest('[data-day]')` in the click handler. Always. Not `e.target` directly.
**Warning signs:** Clicking on the number does nothing; clicking on the cell edge (outside the number) works.

### Pitfall 3: Lost Event Listeners After Re-render
**What goes wrong:** Event listeners registered on individual cells are destroyed when `innerHTML = ''` clears the grid. Clicks stop working after the first state change.
**Why it happens:** `innerHTML = ''` removes all child DOM nodes, which destroys their event listeners.
**How to avoid:** Register the single click listener on the grid container (`#cal-grid`) once in `app.js`, never inside the renderer. The container element persists across re-renders.
**Warning signs:** Calendar renders correctly but clicks stop working after navigating months.

### Pitfall 4: days Object Key Type Mismatch
**What goes wrong:** `AppState.days` stores keys as numbers (`1`, `2`) but `cell.dataset.day` returns strings (`'1'`, `'2'`). Object lookup `days[1]` succeeds but `days['1']` fails (or vice versa depending on how the object was built).
**Why it happens:** JS object keys are always strings internally, but numeric literals as keys look like numbers to the developer. `dataset` always returns strings.
**How to avoid:** Always use string keys: `days[String(d)]` when writing, `cell.dataset.day` (already a string) when reading. Be consistent: use string keys throughout.
**Warning signs:** Clicking a day appears to work (no error) but the color never updates; the status is stored under a different key type.

### Pitfall 5: GitHub Pages Serves Stale Cached Files
**What goes wrong:** After pushing an update, users see the old version because the browser cached the previous `style.css` or `app.js`.
**Why it happens:** GitHub Pages sets cache headers. Static filenames don't trigger cache invalidation.
**How to avoid:** Increment `?v=N` on `<link href="style.css?v=2">` and `<script src="src/app.js?v=2">` with every meaningful update. Document the convention.
**Warning signs:** Changes are visible in the repo but not in the deployed site; force-refresh (Ctrl+Shift+R) shows the new version.

### Pitfall 6: .nojekyll Missing
**What goes wrong:** GitHub Pages tries to process the files with Jekyll, which ignores files/directories starting with `_` and may fail on JS module syntax.
**Why it happens:** GitHub Pages defaults to Jekyll processing for any repo without `.nojekyll`.
**How to avoid:** Add an empty `.nojekyll` file to the repo root. Commit it.
**Warning signs:** Deployment succeeds but the page shows a Jekyll error or loads without CSS/JS.

---

## Code Examples

### Status Cycle Array (Canonical Order)
```javascript
// Source: FR-2 in REQUIREMENTS.md — unset → in-office → at-home → time-off → wfa → unset
import { STATUS } from './storage.js';

const STATUS_CYCLE = [
  STATUS.UNSET,      // 'unset'
  STATUS.IN_OFFICE,  // 'in-office'
  STATUS.AT_HOME,    // 'at-home'
  STATUS.TIME_OFF,   // 'time-off'
  STATUS.WFA,        // 'wfa'
];

function cycleStatus(current) {
  const idx = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}
```

### Today Indicator — Correct Comparison
```javascript
// Capture today once, outside the render loop
const todayObj = new Date();
const isCurrentMonth = (
  state.year === todayObj.getFullYear() &&
  state.month === (todayObj.getMonth() + 1)  // getMonth() is 0-indexed
);
const todayDay = isCurrentMonth ? todayObj.getDate() : -1;

// Inside cell loop:
if (d === todayDay) cell.classList.add('cal-cell--today');
```

### Grid Column Offset (Correct)
```javascript
// firstDayOfWeek returns 0=Sun…6=Sat
// CSS grid-column-start is 1-indexed
// Sunday (0) → column 1, Wednesday (3) → column 4
const firstCell = container.querySelector('.cal-cell:first-child');
// OR: set on first day cell during creation:
if (d === 1) {
  cell.style.gridColumnStart = firstDayOfWeek(year, month) + 1;
}
```

### loadMonth Integration — Days Object Shape
```javascript
// storage.js saveMonth stores: { schemaVersion: 1, days: { '15': 'in-office', ... } }
// loadMonth returns: { schemaVersion: 1, days: { ... } } or null

function loadCurrentMonth() {
  const key = toMonthKey(this.year, this.month);
  const stored = loadMonth(key);
  // Guard: stored may be null (no data yet) or missing .days
  this.days = (stored && stored.days) ? { ...stored.days } : {};
}
```

### Minimal AppState Unit Test Pattern
```javascript
// tests/app-state.test.js
import { describe, it, expect, beforeEach } from 'vitest';

describe('AppState.cycleDay', () => {
  it('cycles from unset to in-office', () => {
    AppState.days = {};
    AppState.cycleDay('5');
    expect(AppState.days['5']).toBe('in-office');
  });

  it('cycles from wfa back to unset and removes key', () => {
    AppState.days = { '5': 'wfa' };
    AppState.cycleDay('5');
    expect(AppState.days['5']).toBeUndefined();
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Framework component state (React, Vue) | Plain JS pub-sub object | N/A — never appropriate for NFR-1 | Zero-dependency; predictable; debuggable without devtools |
| Per-cell DOM update | Full container re-render | Established for small lists | Simpler code; correctness guaranteed; performance non-issue at 31 cells |
| CSS class-per-status (`.status-in-office`) | `data-status` attribute + attribute selector | CSS attribute selectors widely supported since IE7 | Single attribute carries both value (readable by JS) and style hook (readable by CSS) |
| Jekyll-based GitHub Pages | `.nojekyll` static file serving | GitHub Pages supports this directly | No build step, no config, pure static serve |

---

## Open Questions

1. **Legend swatch implementation**
   - What we know: Small inline legend required below calendar (CONTEXT.md)
   - What's unclear: Whether swatches use `<span>` with background-color or `<div>` with `data-status`
   - Recommendation: Reuse `data-status` attribute pattern — `<span class="legend-swatch" data-status="in-office"></span>` styled via same CSS selectors as calendar cells. DRY — status colors defined once.

2. **AppState testability with module-level `new Date()`**
   - What we know: `today` is captured at module load time; tests import the module
   - What's unclear: Whether the "today" capture at module init causes issues in tests that run in a fixed time context
   - Recommendation: Capture today inside `loadCurrentMonth()` or pass it as a parameter to `renderCalendar` rather than at module level. This keeps the module pure and the renderer testable with arbitrary dates.

3. **Month navigation boundary — far future/past**
   - What we know: Navigate mutates year when month crosses 1 or 12
   - What's unclear: Whether there is any practical boundary needed (e.g., prevent navigating before 2020 or after 2030)
   - Recommendation: No boundary for Phase 2 — any year/month combination is valid. Boundaries are a UX nicety that can be added in Phase 3 if needed.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `vitest.config.js` — EXISTS (from Phase 1) |
| Quick run command | `npm test` |
| Full suite command | `npm run test:coverage` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FR-1 | `renderCalendar` produces correct number of day cells for a given month | unit | `npm test -- tests/calendar.test.js` | Wave 0 |
| FR-1 | First day cell has correct `gridColumnStart` value for a known month | unit | `npm test -- tests/calendar.test.js` | Wave 0 |
| FR-2 | `AppState.cycleDay` cycles unset→in-office→at-home→time-off→wfa→unset | unit | `npm test -- tests/app-state.test.js` | Wave 0 |
| FR-2 | `AppState.cycleDay` removes key from `days` when cycling back to unset | unit | `npm test -- tests/app-state.test.js` | Wave 0 |
| FR-7 | `AppState.notify()` calls all subscribers with current state | unit | `npm test -- tests/app-state.test.js` | Wave 0 |
| FR-8 | `AppState.navigate(+1)` from December increments year, sets month to 1 | unit | `npm test -- tests/app-state.test.js` | Wave 0 |
| FR-8 | `AppState.navigate(-1)` from January decrements year, sets month to 12 | unit | `npm test -- tests/app-state.test.js` | Wave 0 |
| FR-9 | Today cell gets `cal-cell--today` class only when viewing current month | unit | `npm test -- tests/calendar.test.js` | Wave 0 |
| NFR-2 | `.nojekyll` file exists in repo root | smoke (manual) | `ls .nojekyll` | Wave 0 |
| NFR-3 | Calendar grid uses `1fr` columns (no fixed pixel widths) | manual/visual | Visual check at 320px viewport | N/A — manual |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm run test:coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/app-state.test.js` — covers FR-2, FR-7, FR-8 (AppState mutation and pub-sub)
- [ ] `tests/calendar.test.js` — covers FR-1, FR-9 (DOM rendering correctness)

*(Existing infrastructure: `vitest.config.js`, `package.json`, `tests/` directory — all in place from Phase 1. Only new test files needed.)*

---

## Sources

### Primary (HIGH confidence)
- Phase 1 RESEARCH.md — storage.js, dates.js, calc.js interfaces; STATUS constants shape; 1-indexed month API
- `src/storage.js` — confirmed STATUS object keys and values; saveMonth/loadMonth signatures; days object shape
- `src/dates.js` — confirmed daysInMonth/firstDayOfWeek/toMonthKey signatures; 1-indexed API
- `src/calc.js` — confirmed calcAverage signature and days array shape
- CONTEXT.md locked decisions — status colors, layout rules, architecture decisions are definitive
- REQUIREMENTS.md — FR-1 through FR-9 behavioral specifications

### Secondary (MEDIUM confidence)
- MDN CSS Grid Layout — `grid-template-columns: repeat(7, 1fr)`, `grid-column-start` behavior, auto-placement
- MDN EventTarget.addEventListener / Event.target — delegation pattern, `closest()` behavior
- GitHub Pages documentation — `.nojekyll` requirement, static file serving, cache behavior

### Tertiary (LOW confidence — informational only)
- General knowledge of pub-sub pattern suitability for small vanilla JS apps

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero shipped dependencies locked by NFR-1; existing dev tooling confirmed installed
- Architecture: HIGH — all patterns derived from existing Phase 1 code interfaces (read directly) and CONTEXT.md locked decisions
- Pitfalls: HIGH — grid-column off-by-one, event delegation, innerHTML re-render listener loss are well-known DOM patterns
- Validation architecture: HIGH — test infrastructure exists from Phase 1; only new test files needed

**Research date:** 2026-04-13
**Valid until:** 2026-10-13 (stable Web APIs; no moving-target dependencies)
