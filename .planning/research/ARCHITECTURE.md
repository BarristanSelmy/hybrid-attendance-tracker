# Architecture Research

**Domain:** Static single-page calendar / attendance tracker (vanilla HTML/CSS/JS)
**Researched:** 2026-04-13
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          UI Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  CalendarGrid│  │  StatusPicker│  │    StatsDisplay      │  │
│  │  (DOM render)│  │  (day click) │  │  (avg calculation)   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
├─────────┴─────────────────┴──────────────────────┴──────────────┤
│                        State Layer                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  AppState: { currentMonth, attendanceData, preferences } │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                     Persistence Layer                           │
│  ┌───────────────────────┐   ┌──────────────────────────────┐   │
│  │  localStorage         │   │  cookies                     │   │
│  │  (attendance records) │   │  (user preferences)          │   │
│  └───────────────────────┘   └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| CalendarGrid | Render the month grid; mark weekdays/weekends; apply day status colors | StatusPicker (receives clicks), AppState (reads month + attendance data) |
| StatusPicker | Cycle a day's status on click/tap (office → home → timeoff → wfa → office) | AppState (writes status), CalendarGrid (triggers re-render) |
| MonthNav | Increment/decrement the current month; reset view to today | AppState (writes currentMonth), CalendarGrid (triggers re-render) |
| StatsDisplay | Compute and display avg in-office days/week from current month data | AppState (reads attendance data, reads preferences) |
| AppState | Single source of truth for all runtime data; owned by one module | All UI components read from it; persistence layer syncs to/from it |
| StorageAdapter | Read/write attendance data in localStorage; read/write preferences in cookies | AppState (called on load and on every mutation) |

## Recommended Project Structure

```
hybrid-attendance-tracker/
├── index.html          # Single HTML file; all markup lives here
├── style.css           # All styles; no CSS-in-JS, no preprocessor
└── app.js              # All JavaScript; split into logical sections via
                        # module-like IIFE or ES module blocks
```

For a project of this size (< 500 LOC), a single `app.js` with clearly separated
sections is simpler than multiple files that require import coordination without a bundler.
Split into multiple files only if `app.js` exceeds ~600 lines.

If split into multiple files:

```
hybrid-attendance-tracker/
├── index.html
├── style.css
└── js/
    ├── state.js        # AppState object — single source of truth
    ├── storage.js      # localStorage + cookie read/write
    ├── calendar.js     # CalendarGrid render logic
    ├── stats.js        # Average calculation + StatsDisplay render
    └── app.js          # Wires modules together; init on DOMContentLoaded
```

### Structure Rationale

- **Single index.html:** GitHub Pages serves `index.html` at the root with zero config.
- **Flat JS (or one level deep):** No bundler means no import maps beyond what the browser handles natively. Keep the dependency graph shallow.
- **state.js as hub:** All components read from one state object. No component talks directly to another component — they talk to state, and state notifies listeners.

## Architectural Patterns

### Pattern 1: Observer / Pub-Sub on AppState

**What:** AppState exposes a `subscribe(callback)` method. When any state mutation occurs, registered callbacks fire. UI components subscribe and re-render their own slice.

**When to use:** This project — it eliminates prop-drilling and manual DOM cascade calls across three or four independent UI sections.

**Trade-offs:** Slight overhead in wiring subscriptions at init; simpler than passing callbacks everywhere; no magic.

**Example:**
```js
// state.js
const listeners = [];
const state = { currentMonth: new Date(), attendance: {}, preferences: {} };

function setState(patch) {
  Object.assign(state, patch);
  listeners.forEach(fn => fn(state));
}

function subscribe(fn) {
  listeners.push(fn);
}
```

### Pattern 2: Keyed Attendance Records (YYYY-MM-DD → status)

**What:** Store attendance as a flat object keyed by ISO date string. Each value is a status string (`'office'`, `'home'`, `'timeoff'`, `'wfa'`, `null`).

**When to use:** Always for this project. The key is derived from the date, making reads O(1) with no searching.

**Trade-offs:** Simple to serialize to JSON for localStorage; no indexing needed; month view just iterates over days and looks up status.

**Example:**
```js
// attendance record shape
{
  "2026-04-07": "office",
  "2026-04-08": "home",
  "2026-04-09": "timeoff"
}
```

### Pattern 3: Render-on-State (Full Re-render of Calendar Grid)

**What:** On every state change, re-render the entire calendar grid by replacing its innerHTML. Do not diff or patch individual day cells.

**When to use:** A monthly grid is ~28–31 cells. Full re-render costs microseconds, not milliseconds. Diffing adds complexity for zero benefit at this scale.

**Trade-offs:** Simpler code, no virtual DOM needed; the only risk (focus loss, scroll jump) does not apply to a calendar grid.

## Data Flow

### User Clicks a Day

```
User click on day cell
    ↓
StatusPicker.handleClick(dateString)
    ↓
nextStatus = cycleStatus(currentStatus)
    ↓
setState({ attendance: { ...attendance, [dateString]: nextStatus } })
    ↓
All subscribers notified
    ├── CalendarGrid.render(state)   → updates grid colors
    └── StatsDisplay.render(state)  → recalculates average
    ↓
StorageAdapter.saveAttendance(state.attendance)  → localStorage updated
```

### Page Load

```
DOMContentLoaded
    ↓
StorageAdapter.loadAttendance()    → parse localStorage JSON
StorageAdapter.loadPreferences()   → parse cookies
    ↓
setState({ attendance, preferences, currentMonth: today })
    ↓
CalendarGrid.render(state)
StatsDisplay.render(state)
```

### Month Navigation

```
User clicks prev/next month
    ↓
setState({ currentMonth: newDate })
    ↓
CalendarGrid.render(state)   → grid shows new month
StatsDisplay.render(state)   → stats recalculate for new month
```

### Key Data Flows

1. **Attendance mutation:** StatusPicker → AppState → StorageAdapter (persist) + UI components (re-render). StorageAdapter is never called directly by UI components.
2. **Stat calculation:** StatsDisplay reads `state.attendance` filtered to current month. Denominator excludes `'timeoff'` and `'wfa'` days plus any weekends not opted into tracking.
3. **Preference change (weekend toggle):** Preference written to cookies via StorageAdapter, then state updated, triggering full re-render of grid and stats.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Single user, one browser | Current design is correct — localStorage + cookies, no server |
| Multi-device sync (future) | Replace StorageAdapter with API calls; keep the rest identical |
| Multi-user / team view | Requires auth + server; out of scope for v1 |

### Scaling Priorities

1. **First bottleneck (if any):** Large accumulated attendance history in localStorage. Mitigation: key data by year-month to allow pruning old months without touching current data.
2. **No other realistic bottlenecks** for a personal single-browser tool.

## Anti-Patterns

### Anti-Pattern 1: Scattered localStorage Calls

**What people do:** Each component calls `localStorage.setItem` / `localStorage.getItem` directly.

**Why it's wrong:** Storage format is duplicated across the codebase. When you need to change the schema (e.g., add a new status type), you hunt for every scattered call.

**Do this instead:** All storage access goes through a single `StorageAdapter` module. Components only call `setState()`.

### Anti-Pattern 2: Storing Computed Values

**What people do:** Persist the calculated average in localStorage alongside the raw attendance data.

**Why it's wrong:** Computed values become stale and must be kept in sync. Recalculating from raw data on every render is instant for ~31 records.

**Do this instead:** Store only the raw attendance record. Derive the average in `StatsDisplay.render()` on every render call.

### Anti-Pattern 3: Coupling Day Cells to Each Other

**What people do:** Day cells directly update adjacent cells or the stats element on click via DOM traversal (`parentNode.querySelector('.stats')`).

**Why it's wrong:** Breaks when the DOM structure changes, creates hidden dependencies, and makes month navigation impossible without rewriting click handlers.

**Do this instead:** Day cells dispatch to `setState()`. All downstream effects are handled by subscribers, not by the clicking component.

### Anti-Pattern 4: Using `onclick` Attributes in HTML

**What people do:** `<div onclick="handleClick(...)">` in the generated calendar HTML.

**Why it's wrong:** Requires global function scope, pollutes `window`, conflicts with modules, breaks if function names change.

**Do this instead:** Event delegation — attach one `click` listener to the calendar grid container; derive the date from a `data-date` attribute on the clicked cell.

## Integration Points

### External Services

None. This is intentionally self-contained.

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| UI components ↔ AppState | Direct function call (`setState`, `subscribe`) | One-way writes; notifications via pub-sub |
| AppState ↔ StorageAdapter | Direct function calls on read (init) and write (mutation) | StorageAdapter never pushes to state |
| CalendarGrid ↔ StatusPicker | No direct coupling — both interact only with AppState | StatusPicker is logically the click handler on CalendarGrid cells |

## Suggested Build Order

Dependencies determine order:

1. **StorageAdapter** — no dependencies; can be built and tested in isolation first.
2. **AppState** — depends only on StorageAdapter for initial hydration.
3. **CalendarGrid** — depends on AppState; provides the DOM structure that StatusPicker needs.
4. **StatusPicker** — depends on CalendarGrid DOM existing; writes back to AppState.
5. **StatsDisplay** — depends on AppState; reads from it independently of CalendarGrid.
6. **MonthNav** — depends on AppState; straightforward state mutation.
7. **Wiring / init** (`app.js`) — assembles all modules, calls initial render.

Building in this order means each piece is testable manually (open in browser, check console) before the next piece depends on it.

## Sources

- Vanilla JS component pattern: https://dev.to/megazear7/the-vanilla-javascript-component-pattern-37la
- SPA localStorage state patterns: https://dev.to/linou518/making-your-spa-remember-state-with-localstorage-3-patterns-and-their-pitfalls-30jo
- State management in vanilla JS (2026): https://medium.com/@chirag.dave/state-management-in-vanilla-js-2026-trends-f9baed7599de
- JS SPA architecture patterns: https://www.javaspring.net/blog/architecture-for-single-page-application-javascript/
- Attendance calendar reference implementation: https://github.com/jitangupta/attendance-calendar

---
*Architecture research for: Static hybrid attendance tracker (vanilla HTML/CSS/JS)*
*Researched: 2026-04-13*
