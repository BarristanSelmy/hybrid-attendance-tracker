# Phase 3: Stats, Preferences, and Polish - Research

**Researched:** 2026-04-13
**Domain:** Vanilla JS UI components, CSS custom properties, ARIA accessibility, cookie persistence
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Stats panel positioned below the legend
- Average formatted as "X.X days/week" with 1 decimal place
- Per-status totals displayed as inline row with colored dots: "● 8 In Office · ● 4 At Home · ● 2 Time Off · ● 1 WFA" — reuses legend colors
- Average gets larger font size in its own row above the totals
- Native `<input type="checkbox">` labeled "Include weekends" — zero-dependency, accessible by default
- Toggle positioned below the stats panel
- Disabled weekends appear grayed out and unclickable — reduced opacity (0.3), pointer-events:none, no status color
- Default state: off (weekends excluded) — matches FR-4 "excluded by default"
- Focus indicator: 2px ring matching today-indicator color (#1565C0) — consistent visual language
- Arrow keys wrap to next/previous row at grid edges — natural grid feel
- Roving tabindex pattern: single tab stop on grid, only focused cell has tabindex=0, arrows navigate cells
- Month navigation: focus follows to same day number (clamped to new month's max)
- Background dark mode: #121212 (Material dark surface)
- Status colors: same hues, slightly desaturated (~15% brightness reduction) to avoid "glow"
- Text: #e0e0e0 body text, #424242 borders
- Today indicator lighten to #42A5F5 in dark mode

### Claude's Discretion
- Exact desaturation values for dark mode status colors
- Responsive breakpoint adjustments for stats panel
- Internal component decomposition for stats rendering

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FR-4 | Weekend handling — excluded by default, toggle persists in cookies, when enabled weekends behave like any other day | Cookie helpers already implemented in `src/cookies.js`; `calcAverage` already accepts `weekendsEnabled` param; calendar.js needs `data-weekend` attribute and disabled state CSS |
| FR-5 | Average in-office days per week — formula `(inOffice / denominator) * 5`, "—" when denominator zero | `calcAverage` in `src/calc.js` fully implements this and returns `null` for zero denominator; needs a `buildDayObjects` helper in `app.js` and a `renderStats` function |
| FR-6 | Running status totals per status type for current month view | Count loop over `AppState.days`; rendered in same stats panel as FR-5; subscribes to `AppState` for live updates |
| FR-10 | Keyboard navigation — arrow keys between cells, Enter/Space cycles status, Tab moves focus in/out of grid | Roving tabindex pattern on `#cal-grid`; `keydown` listener via event delegation; `ArrowLeft/Right/Up/Down` + `Enter/Space` key handling |
| FR-13 | Dark mode — passive `prefers-color-scheme: dark` CSS media query, status colors distinguishable in both modes | Pure CSS `@media (prefers-color-scheme: dark)` block in `style.css`; no JS needed |
</phase_requirements>

## Summary

Phase 3 completes the last five requirements (FR-4, FR-5, FR-6, FR-10, FR-13) of v1.0. All supporting infrastructure is already in place: `calcAverage` handles the formula including weekend exclusion and null-for-zero; `cookies.js` has full read/write/delete; `AppState` has pub-sub for live re-render; `calendar.js` renders the grid. The work decomposes into two cohesive units: (1) a StatsDisplay component that subscribes to AppState and renders average + totals, and (2) weekend toggle wiring + keyboard navigation + dark mode CSS.

The only non-trivial technical surface is the roving tabindex keyboard navigation pattern. This is a well-established ARIA pattern: the grid container holds `role="grid"`, cells hold `role="gridcell"`, only the focused cell has `tabindex=0`, all others have `tabindex=-1`. Arrow key handlers shift `tabindex` and call `.focus()`. The pattern integrates cleanly with the existing event delegation model since it needs a single `keydown` listener on `#cal-grid`.

The weekend toggle requires a `weekendsEnabled` flag in app.js (loaded from cookie on startup). When the toggle changes: update the flag, save cookie, update `data-disabled` attribute on weekend cells, re-render stats. Dark mode is pure CSS — no JavaScript path changes needed.

**Primary recommendation:** Implement stats rendering first (FR-5, FR-6) since it exercises the full subscriber pipeline; then wire the weekend toggle (FR-4); then keyboard navigation (FR-10); finally dark mode CSS (FR-13).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | 3.x (already installed) | Unit tests | Already in devDependencies; jsdom environment configured |
| jsdom | 29.x (already installed) | DOM simulation for tests | Required by Vitest 3.x; already in devDependencies |

No new dependencies. NFR-1 (zero dependencies) forbids adding any.

### Supporting
Vanilla HTML/CSS/JS only. No new packages.

**Version verification:** No new packages to install. All required tools present.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── calc.js          # (EXISTS) calcAverage — no changes needed
├── storage.js       # (EXISTS) STATUS constants, loadMonth/saveMonth — no changes needed
├── dates.js         # (EXISTS) date helpers — no changes needed
├── cookies.js       # (EXISTS) setCookie/getCookie/deleteCookie — no changes needed
├── app-state.js     # (EXISTS) pub-sub AppState — no changes needed
├── calendar.js      # (MODIFY) add data-weekend attribute on weekend cells, data-disabled for grayed state
├── stats.js         # (NEW) renderStats(container, state, weekendsEnabled) — average + totals
└── app.js           # (MODIFY) buildDayObjects, weekendsEnabled flag, weekend toggle, keyboard nav
tests/
├── stats.test.js    # (NEW) renderStats output assertions
└── (all others)     # (EXISTS) unchanged
index.html           # (MODIFY) add #stats container, #toggle-weekends checkbox
style.css            # (MODIFY) stats panel CSS, disabled weekend CSS, focus ring, dark mode block
```

### Pattern 1: Stats Subscriber (same pattern as calendar render)
**What:** `stats.js` exports `renderStats(container, state, weekendsEnabled)`. `app.js` registers it as a subscriber.
**When to use:** Any time AppState changes (cycleDay, navigate, toggle change) — all trigger `notify()`.
**Example:**
```javascript
// src/stats.js
import { STATUS } from './storage.js';
import { calcAverage } from './calc.js';
import { daysInMonth, firstDayOfWeek } from './dates.js';

export function renderStats(container, state, weekendsEnabled) {
  const { year, month, days } = state;
  // Build day objects that calcAverage expects
  const dayObjs = buildDayObjects(year, month, days, weekendsEnabled);
  const avg = calcAverage(dayObjs, weekendsEnabled);

  const counts = { [STATUS.IN_OFFICE]: 0, [STATUS.AT_HOME]: 0, [STATUS.TIME_OFF]: 0, [STATUS.WFA]: 0 };
  for (const d of dayObjs) {
    if (!d.isFuture && !(d.isWeekend && !weekendsEnabled) && d.status !== STATUS.UNSET) {
      if (counts[d.status] !== undefined) counts[d.status]++;
    }
  }

  const avgText = avg === null ? '—' : avg.toFixed(1) + ' days/week';
  // render avgText and counts into container.innerHTML
}
```

### Pattern 2: buildDayObjects Helper
**What:** Converts `state.days` (sparse object keyed by day number string) into the array format that `calcAverage` expects.
**When to use:** Called in app.js subscriber before passing to renderStats and renderCalendar.
**Example:**
```javascript
// In app.js (or extracted to a shared helper)
function buildDayObjects(year, month, days, weekendsEnabled) {
  const total = daysInMonth(year, month);
  const today = new Date();
  const result = [];
  for (let d = 1; d <= total; d++) {
    const date = new Date(year, month - 1, d);  // numeric constructor — NFR-4
    const dow = date.getDay();  // 0=Sun, 6=Sat
    const isWeekend = (dow === 0 || dow === 6);
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;
    const isFuture = isCurrentMonth && d > today.getDate();
    result.push({ status: days[String(d)] || STATUS.UNSET, isWeekend, isFuture });
  }
  return result;
}
```

### Pattern 3: Roving Tabindex Keyboard Navigation
**What:** Single tab stop on the grid; arrow keys shift focus between cells.
**When to use:** Standard ARIA pattern for grids and composite widgets (ARIA APG Grid pattern).
**Example:**
```javascript
// In app.js, after renderCalendar — call after every re-render
function initRovingTabindex() {
  const cells = [...grid.querySelectorAll('[data-day]')];
  // On first render, give focus to today or first cell
  cells.forEach((c, i) => c.setAttribute('tabindex', i === 0 ? '0' : '-1'));
}

grid.addEventListener('keydown', (e) => {
  const cells = [...grid.querySelectorAll('[data-day]')];
  const focused = grid.querySelector('[tabindex="0"]');
  const idx = cells.indexOf(focused);
  if (idx === -1) return;

  let next = idx;
  if (e.key === 'ArrowRight') next = idx + 1;
  else if (e.key === 'ArrowLeft') next = idx - 1;
  else if (e.key === 'ArrowDown') next = idx + 7;
  else if (e.key === 'ArrowUp') next = idx - 7;
  else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    AppState.cycleDay(focused.dataset.day);
    return;
  } else return;

  // Clamp to valid range
  next = Math.max(0, Math.min(next, cells.length - 1));
  e.preventDefault();
  focused.setAttribute('tabindex', '-1');
  cells[next].setAttribute('tabindex', '0');
  cells[next].focus();
});
```

### Pattern 4: Weekend Toggle Wiring
**What:** Checkbox reads initial value from cookie, updates `weekendsEnabled` flag and re-renders on change.
**Example:**
```javascript
// In app.js
const COOKIE_WEEKENDS = 'weekends-enabled';
let weekendsEnabled = getCookie(COOKIE_WEEKENDS) === 'true';

const toggle = document.getElementById('toggle-weekends');
toggle.checked = weekendsEnabled;

toggle.addEventListener('change', () => {
  weekendsEnabled = toggle.checked;
  setCookie(COOKIE_WEEKENDS, String(weekendsEnabled), {
    'max-age': 31536000,  // 365 days
    SameSite: 'Lax',
    Secure: true,
  });
  AppState.notify();  // triggers all subscribers with new weekendsEnabled
});
```
**Important:** The subscriber closure must capture `weekendsEnabled` by reference (or re-read it). Since `weekendsEnabled` is a `let` in module scope, the subscriber lambda reads the current value correctly.

### Pattern 5: Disabled Weekend Cells (CSS + calendar.js)
**What:** Weekend cells get `data-weekend="true"` attribute always. When `weekendsEnabled` is false, they also get `data-disabled="true"`. CSS handles visual state.
**Example in calendar.js:**
```javascript
if (isWeekend) cell.dataset.weekend = 'true';
if (isWeekend && !weekendsEnabled) cell.dataset.disabled = 'true';
```
**CSS:**
```css
.cal-cell[data-disabled="true"] {
  opacity: 0.3;
  pointer-events: none;
  cursor: default;
  background: transparent;
}
```

### Anti-Patterns to Avoid
- **Reading `weekendsEnabled` from DOM state (checkbox.checked):** The subscriber runs before the DOM is re-rendered; read from module-scope variable instead.
- **Registering keydown listener inside renderCalendar:** Re-registers on every re-render, stacking up listeners. Register once in app.js.
- **Rebuilding tabindex inside renderCalendar:** calendar.js renders cells without tabindex; app.js roving logic runs after render. Keep concerns separate.
- **Mutating day status on disabled weekend click:** `pointer-events: none` on `[data-disabled]` cells prevents clicks at CSS level; no JS guard needed, but confirm the event delegation handler still skips cells that have no `data-day` (it already does via `closest('[data-day]')`).
- **`toFixed` on null:** `calcAverage` returns null for zero denominator. Always null-check before calling `.toFixed(1)`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cookie read/write | Custom cookie parser | `src/cookies.js` (already exists) | Handles encoding, try/catch, regex escaping |
| Average formula | Re-implement in stats.js | `calcAverage` from `src/calc.js` (already exists) | Fully tested, handles all edge cases including null |
| Date construction | `new Date('2026-04-13')` string parsing | `new Date(year, month-1, day)` numeric | NFR-4 — string parsing has UTC offset bugs |
| Weekend detection | Custom day-of-week logic | `date.getDay() === 0 \|\| date.getDay() === 6` | Simple, no library needed |

**Key insight:** The calc.js and cookies.js modules were purpose-built in earlier phases specifically for Phase 3 consumption. Use them directly.

## Common Pitfalls

### Pitfall 1: Subscriber Closure Captures Stale weekendsEnabled
**What goes wrong:** The subscriber lambda in app.js closes over `weekendsEnabled` at registration time; toggling the checkbox does not update the closed-over value.
**Why it happens:** JavaScript closures capture variables by reference for `let` but by value for `const`. If declared `const`, the value can never update.
**How to avoid:** Declare `weekendsEnabled` as `let` in module scope. The subscriber reads it at call time, not at registration time.
**Warning signs:** Toggle appears to have no effect on stats calculation.

### Pitfall 2: Keyboard Focus Lost After Re-Render
**What goes wrong:** `renderCalendar` replaces `container.innerHTML`, destroying all DOM nodes including the currently focused cell. The browser loses focus.
**Why it happens:** innerHTML re-render is the established pattern (correct for 31 cells), but it nukes the DOM.
**How to avoid:** After every `renderCalendar` call, restore tabindex to the cell that had `tabindex=0` before re-render (capture focused day number before render, restore after). If no prior focused cell, set `tabindex=0` on the first cell.
**Warning signs:** Arrow navigation works until month navigation occurs; focus jumps to body after navigate.

### Pitfall 3: Stats Counts Including Future Days or Disabled Weekends
**What goes wrong:** Totals count future days or weekends that are disabled, showing wrong numbers.
**Why it happens:** `AppState.days` stores all set statuses regardless of future/weekend status.
**How to avoid:** The count loop in `renderStats` must apply the same filtering rules as `calcAverage`: skip `isFuture`, skip `isWeekend && !weekendsEnabled`.
**Warning signs:** Totals don't match what the user sees in the calendar.

### Pitfall 4: Roving Tabindex After Navigate — Month Clamping
**What goes wrong:** User is focused on day 31; navigates to a month with 28 days. The target cell index (30) doesn't exist.
**Why it happens:** Day count varies by month; stored focus index may exceed new month's cell count.
**How to avoid:** After navigate + re-render, resolve focus day number: `Math.min(focusedDayNum, daysInMonth(newYear, newMonth))`. Then find cell with that day number and set its tabindex.
**Warning signs:** Focus disappears after navigating from a 31-day month to a 28-day month.

### Pitfall 5: Dark Mode Color Contrast
**What goes wrong:** Desaturated status colors become indistinguishable from each other or from the `#121212` background.
**Why it happens:** Dark backgrounds absorb saturation; colors that are clearly distinct on white merge on near-black.
**How to avoid:** Test the specific values in dark mode. Recommended adjustments from the existing light values:
- `#4CAF50` (in-office green) → `#388E3C` (Material Green 700, darker)
- `#2196F3` (at-home blue) → `#1565C0` (Material Blue 800) — wait, this darkens; better `#64B5F6` (Blue 300, lighter)
- `#9E9E9E` (time-off grey) → `#757575` darkens too much; use `#BDBDBD` (Grey 400, lighter)
- `#FF9800` (WFA orange) → `#F57C00` darkens; use `#FFB74D` (Orange 300, lighter)
The CONTEXT.md says "slightly desaturated, ~15% brightness reduction" but on dark backgrounds, lighter/less-saturated variants read better. Discretion is granted for exact values — use lighter variants of each hue.
**Warning signs:** User cannot distinguish At Home from Unset cells in dark mode.

### Pitfall 6: Checkbox Accessibility — Missing label association
**What goes wrong:** Screenreaders don't announce the toggle's purpose if label is implicit.
**Why it happens:** `<input type="checkbox">` without a proper `<label for="...">` association.
**How to avoid:** Use explicit `<label for="toggle-weekends">Include weekends</label>` in HTML, with matching `id="toggle-weekends"` on the input.
**Warning signs:** VoiceOver/NVDA reads "checkbox" without label text.

## Code Examples

### Stats Panel HTML Structure
```html
<!-- Add to index.html below .cal-legend -->
<section id="stats" aria-label="Attendance statistics">
  <p id="stats-average" class="stats-average"></p>
  <p id="stats-totals" class="stats-totals"></p>
</section>

<div class="cal-preferences">
  <label for="toggle-weekends">
    <input type="checkbox" id="toggle-weekends">
    Include weekends
  </label>
</div>
```

### renderStats Implementation Shape
```javascript
// src/stats.js
export function renderStats(avgEl, totalsEl, state, weekendsEnabled) {
  const { year, month, days } = state;
  const total = daysInMonth(year, month);
  const today = new Date();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;

  const dayObjs = [];
  for (let d = 1; d <= total; d++) {
    const date = new Date(year, month - 1, d);
    const dow = date.getDay();
    dayObjs.push({
      status: days[String(d)] || STATUS.UNSET,
      isWeekend: dow === 0 || dow === 6,
      isFuture: isCurrentMonth && d > today.getDate(),
    });
  }

  const avg = calcAverage(dayObjs, weekendsEnabled);
  avgEl.textContent = avg === null ? 'Average: —' : `Average: ${avg.toFixed(1)} days/week`;

  const counts = { [STATUS.IN_OFFICE]: 0, [STATUS.AT_HOME]: 0, [STATUS.TIME_OFF]: 0, [STATUS.WFA]: 0 };
  for (const d of dayObjs) {
    if (d.isFuture) continue;
    if (d.isWeekend && !weekendsEnabled) continue;
    if (counts[d.status] !== undefined) counts[d.status]++;
  }
  totalsEl.textContent = `● ${counts[STATUS.IN_OFFICE]} In Office · ● ${counts[STATUS.AT_HOME]} At Home · ● ${counts[STATUS.TIME_OFF]} Time Off · ● ${counts[STATUS.WFA]} WFA`;
}
```

### Dark Mode CSS Block
```css
@media (prefers-color-scheme: dark) {
  body {
    background: #121212;
    color: #e0e0e0;
  }
  .cal-cell[data-status="unset"] {
    border-color: #424242;
  }
  .cal-cell[data-status="in-office"]  { background: #388E3C; }  /* Green 700 */
  .cal-cell[data-status="at-home"]    { background: #64B5F6; }  /* Blue 300 */
  .cal-cell[data-status="time-off"]   { background: #757575; }  /* Grey 600 */
  .cal-cell[data-status="wfa"]        { background: #FFB74D; }  /* Orange 300 */
  .cal-cell--today                    { outline-color: #42A5F5; }
  .legend-swatch[data-status="in-office"]  { background: #388E3C; }
  .legend-swatch[data-status="at-home"]    { background: #64B5F6; }
  .legend-swatch[data-status="time-off"]   { background: #757575; }
  .legend-swatch[data-status="wfa"]        { background: #FFB74D; }
  .cal-header-cell { color: #9e9e9e; }
  .cal-nav button  { border-color: #424242; color: #e0e0e0; }
  .cal-nav button:hover { background: #1e1e1e; }
}
```

### Focus Ring CSS
```css
.cal-cell:focus {
  outline: 2px solid #1565C0;
  outline-offset: -2px;
  z-index: 1;  /* Prevent outline clipping by adjacent cells */
}
/* Override in dark mode */
@media (prefers-color-scheme: dark) {
  .cal-cell:focus { outline-color: #42A5F5; }
}
```

### Cache-Busting Bump
When adding stats.js (if extracted as a module), update index.html script tag `?v=1` → `?v=2`. The style.css link also needs a bump when CSS changes.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tabindex` on every interactive element | Roving tabindex for composite widgets | ARIA APG established ~2016 | Single tab stop, arrow key navigation inside widget |
| JS-driven dark mode toggle | `prefers-color-scheme` CSS media query | CSS4/2019 | Zero JS, respects OS setting automatically |
| Per-element event listeners | Event delegation on container | Standard since jQuery popularized it | Survives innerHTML re-renders |

**Deprecated/outdated:**
- `document.cookie = "name=value; expires=..."` date string format: Use `max-age` (seconds, not date string) — already implemented correctly in cookies.js.

## Open Questions

1. **Focus persistence across month navigation**
   - What we know: `renderCalendar` replaces innerHTML; roving tabindex needs to restore focus after re-render
   - What's unclear: Should focus land on the same day number, or always on the first cell?
   - Recommendation: CONTEXT.md says "focus follows to same day number (clamped to new month's max)" — track `focusedDay` as a module-level variable, restore after render.

2. **Stats panel — does totals row count future days?**
   - What we know: calcAverage excludes future days from the denominator
   - What's unclear: Should the per-status totals also exclude future days?
   - Recommendation: Yes — exclude future days from totals for consistency. A future day with a pre-set status should not count toward "running totals" for the current month.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.js` |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FR-4 | Weekend toggle default is off; toggling enables weekends in calcAverage | unit | `npm test -- --reporter=verbose tests/stats.test.js` | ❌ Wave 0 |
| FR-4 | Cookie persists toggle state across simulated reload | unit | `npm test -- --reporter=verbose tests/stats.test.js` | ❌ Wave 0 |
| FR-5 | renderStats displays "—" when denominator is zero | unit | `npm test -- --reporter=verbose tests/stats.test.js` | ❌ Wave 0 |
| FR-5 | renderStats displays "X.X days/week" with 1 decimal for valid average | unit | `npm test -- --reporter=verbose tests/stats.test.js` | ❌ Wave 0 |
| FR-6 | renderStats shows correct per-status counts | unit | `npm test -- --reporter=verbose tests/stats.test.js` | ❌ Wave 0 |
| FR-6 | Totals exclude future days and disabled weekends | unit | `npm test -- --reporter=verbose tests/stats.test.js` | ❌ Wave 0 |
| FR-10 | ArrowRight moves focus to next cell | unit | `npm test -- --reporter=verbose tests/keyboard-nav.test.js` | ❌ Wave 0 |
| FR-10 | ArrowLeft moves focus to previous cell | unit | `npm test -- --reporter=verbose tests/keyboard-nav.test.js` | ❌ Wave 0 |
| FR-10 | ArrowDown moves focus down one row (7 cells) | unit | `npm test -- --reporter=verbose tests/keyboard-nav.test.js` | ❌ Wave 0 |
| FR-10 | ArrowUp moves focus up one row (7 cells) | unit | `npm test -- --reporter=verbose tests/keyboard-nav.test.js` | ❌ Wave 0 |
| FR-10 | Enter/Space on focused cell calls cycleDay | unit | `npm test -- --reporter=verbose tests/keyboard-nav.test.js` | ❌ Wave 0 |
| FR-13 | Dark mode CSS exists in style.css (structural) | manual | Visual check in OS dark mode | N/A |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/stats.test.js` — covers FR-5, FR-6, FR-4 cookie/toggle behavior
- [ ] `tests/keyboard-nav.test.js` — covers FR-10 arrow key and Enter/Space behavior

*(Framework install: not needed — Vitest + jsdom already installed)*

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `src/calc.js`, `src/app-state.js`, `src/app.js`, `src/calendar.js`, `src/cookies.js`, `src/storage.js`, `style.css`, `index.html`
- `npm test` run — 78 tests passing, confirms infrastructure health
- ARIA Authoring Practices Guide — Roving tabindex / Grid pattern (established standard)

### Secondary (MEDIUM confidence)
- Material Design color system — dark surface `#121212`, color-on-dark recommendations
- MDN `prefers-color-scheme` — CSS media query, no JS needed, OS-level signal

### Tertiary (LOW confidence)
- Dark mode color specific values (`#388E3C`, `#64B5F6`, etc.) — judgment calls within Claude's discretion; visual testing required

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all tools pre-existing and verified
- Architecture: HIGH — all integration points confirmed by reading actual source code
- Pitfalls: HIGH for JS pitfalls (confirmed by code structure), MEDIUM for dark mode color values (discretion area)

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable vanilla JS domain)
