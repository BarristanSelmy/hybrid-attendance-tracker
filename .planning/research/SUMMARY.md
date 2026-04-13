# Project Research Summary

**Project:** Hybrid Attendance Tracker
**Domain:** Static single-page personal attendance tracker (vanilla HTML/CSS/JS, GitHub Pages)
**Researched:** 2026-04-13
**Confidence:** HIGH

## Executive Summary

This is a zero-dependency personal tool: a monthly calendar grid where a user clicks days to set their work location status (office, home, WFA, time-off), and the app computes an honest "average in-office days per week" metric. The entire stack is native browser APIs — HTML5, CSS Grid, vanilla ES2022 JS, `localStorage` for data, and `document.cookie` for preferences — deployed directly to GitHub Pages with no build step. Every required capability (calendar math, DOM, storage) is available natively in 2025+ browsers, making external libraries dead weight.

The recommended approach is a simple three-layer architecture: UI components (CalendarGrid, StatsDisplay, MonthNav) that never talk to each other directly; a single AppState object with a pub-sub interface that all components read from and write to; and a StorageAdapter that is the only code allowed to touch localStorage and cookies. Full re-render of the ~31-cell grid on every state change is the correct strategy — diffing adds complexity for zero perceptible benefit at this scale.

The primary risks are all date/calculation correctness issues, not infrastructure issues. The timezone gotcha (`new Date("2025-12-01")` parses as UTC, displays as the wrong day in most timezones) must be fixed before any rendering code is written. The average calculation denominator is the core differentiator of this tool and must be exact: only days with an explicit status set, excluding WFA and time-off, excluding future unset days. Get these two right in Phase 1 and the rest of the build is straightforward.

## Key Findings

### Recommended Stack

Zero dependencies by design. Every feature required is available natively. The only non-obvious choices are: use `document.cookie` (not the newer Cookie Store API, which has async overhead and incomplete browser support) for preferences, and avoid the Temporal API (not Baseline as of April 2026) in favor of the legacy `Date` numeric constructor. GitHub Pages requires a `.nojekyll` file at repo root to prevent Jekyll from silently dropping files.

**Core technologies:**
- HTML5: Structure and semantics — native `<time>` element, `data-*` attributes, no template library needed
- CSS Grid: Calendar layout — `grid-template-columns: repeat(7, 1fr)` is the canonical 7-column calendar pattern
- Vanilla ES2022 JS: All logic — no transpilation; `?.`, `??`, `class`, `structuredClone` supported universally
- `localStorage`: Attendance data persistence — keyed by `attendance-YYYY-MM`, survives restarts, no quota issues at this scale
- `document.cookie`: User preference persistence — explicit project requirement; 4 KB limit is fine for a handful of key/value prefs

### Expected Features

**Must have (table stakes):**
- Monthly calendar grid, current month on load — the primary UI metaphor
- Click/tap to cycle through 4 statuses (office → home → time-off → WFA → unset) — the entire interaction model
- Color-coded status indicators — required for at-a-glance readability without text labels
- Average in-office days/week with correct denominator — the core value proposition; must exclude WFA, time-off, and future unset days
- Weekends excluded from calculation by default — correct baseline assumption
- Month navigation (prev/next) — history review and back-filling are primary use patterns
- `localStorage` persistence keyed by month — without this, the tool has no value
- Weekend toggle stored in cookies — explicit project requirement; affects denominator

**Should have (competitive):**
- Today indicator — immediate context for where you are in the month; trivial to add
- Live recalculation on every click — mid-month course correction; start with re-render-on-state, which achieves this automatically
- Keyboard navigation — low-effort accessibility improvement once core UX is confirmed

**Defer (v2+):**
- Annual summary view — useful for year-end employer reporting; defer until monthly habit is established
- Export/copy month summary — low demand until a sharing use case emerges
- Passive `prefers-color-scheme` support — cosmetic; add after core is stable

### Architecture Approach

Three layers with strict boundary rules: UI components only call `setState()` and subscribe to state changes; AppState is the single source of truth exposed via `subscribe(fn)` / `setState(patch)`; StorageAdapter is the only module that reads/writes `localStorage` or cookies. No component talks directly to another component. Status records are stored as a flat object keyed by ISO date string (`"2026-04-07": "office"`) — O(1) lookup, trivial JSON serialization. Full grid re-render on state change is correct and fast at 31 cells.

**Major components:**
1. StorageAdapter — read/write `localStorage` (attendance) and cookies (preferences); the only persistence boundary
2. AppState — single source of truth; pub-sub notifications to all UI components on mutation
3. CalendarGrid — renders the month grid with correct day offsets and status colors; event delegation for click handling
4. StatusPicker — cycles day status on click; writes to AppState; does not manipulate DOM directly
5. StatsDisplay — computes and displays average from current state; re-runs on every state notification
6. MonthNav — increments/decrements `currentMonth` in AppState; triggers full re-render

### Critical Pitfalls

1. **ISO date string parsed as UTC** — Never pass `"YYYY-MM-DD"` to the `Date` constructor. Always use `new Date(year, month - 1, day)` (numeric constructor creates local time). Must be fixed before any calendar rendering is written; affects all negative UTC-offset users.

2. **Wrong average denominator** — Denominator = only days with an explicit status, minus time-off, minus WFA, minus future unset days. Do not divide by total calendar workdays. Verify with a unit-test matrix: mid-month with gaps, all WFA, all time-off, mixed statuses.

3. **No `schemaVersion` in localStorage** — Define a version key from day one. Any status string rename or data shape change without a migration function silently corrupts existing user data or throws on `JSON.parse`.

4. **Uncaught localStorage exceptions** — `localStorage.setItem` throws `QuotaExceededError` in private browsing; `JSON.parse` throws on corrupted data. All reads and writes must be wrapped in try/catch with graceful fallback to empty state.

5. **Stale GitHub Pages CDN cache** — No build step means no asset fingerprinting. Append `?v=N` to `<link>` and `<script>` tags in `index.html`; increment on every CSS/JS change. Accept 5–10 minute CDN propagation as an operational constraint.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation — Data Model and Persistence
**Rationale:** Pitfalls research is unanimous: date handling bugs and storage failures must be fixed before any UI is written. Building storage and date utilities first makes every subsequent phase testable in isolation.
**Delivers:** Safe localStorage read/write helpers with try/catch; schema version key; ISO date utility functions using the numeric constructor; cookie read/write helpers; status constants defined once.
**Addresses:** Table-stakes feature — "data persists across page reloads"
**Avoids:** ISO date timezone bug (Pitfall 1), unhandled localStorage exceptions (Pitfall 5), schema migration debt (Pitfall 3)

### Phase 2: Core Calculation Logic
**Rationale:** The average calculation is the product's reason for existing and has a non-obvious denominator. Verifying it independently — before any UI is wired — means bugs are caught with simple console tests, not through a broken UI.
**Delivers:** `calculateAverage(attendanceData, preferences, currentMonth)` pure function with correct denominator logic; verified against mid-month, all-WFA, all-time-off, and empty-month edge cases.
**Addresses:** "Average in-office days/week with correct denominator" (P1 feature)
**Avoids:** Wrong denominator (Pitfall 2), NaN/Infinity display bug (UX pitfall)

### Phase 3: Calendar Grid and State Layer
**Rationale:** AppState and CalendarGrid are the structural core that every other UI component plugs into. Building them together with the pub-sub wiring establishes the pattern all later phases follow.
**Delivers:** AppState with subscribe/setState; CalendarGrid rendering the correct month with CSS Grid layout; day offset computed from `new Date(year, month, 1).getDay()`; today indicator; weekend cells visually distinct.
**Uses:** CSS Grid (`grid-template-columns: repeat(7, 1fr)`), `data-date` attributes for event delegation
**Implements:** AppState and CalendarGrid components

### Phase 4: Interaction and Status Cycling
**Rationale:** With the grid rendered and state wired, adding click-to-cycle is a thin layer. StorageAdapter persistence completes the core loop: click → state → storage → re-render.
**Delivers:** Click handler with event delegation; status cycle (office → home → time-off → WFA → unset); StorageAdapter writing to localStorage on every state mutation; month navigation with prev/next arrows; full working app.
**Addresses:** All P1 table-stakes features (status cycling, color coding, month nav, persistence)
**Avoids:** `onclick` inline attributes anti-pattern; scattered localStorage calls anti-pattern

### Phase 5: Preferences and Stats Display
**Rationale:** StatsDisplay depends on the calculation logic (Phase 2) and AppState (Phase 3); weekend toggle depends on cookie storage (Phase 1). Both are ready to wire now that the core loop is complete.
**Delivers:** StatsDisplay rendered and subscribed to AppState; "—" fallback when denominator is zero; weekend toggle UI writing preference to cookies; StatsDisplay correctly using preference in denominator.
**Addresses:** Weekend toggle (P1), live recalculation (P2), empty-month edge case
**Avoids:** NaN/Infinity in stats, wrong denominator when weekend toggle changes

### Phase 6: Polish and Deployment
**Rationale:** Cache-busting convention must be established before iterative deploys create CDN confusion. Polish (click feedback, legend, keyboard nav) rounds out the P2 features.
**Delivers:** `?v=1` cache-busting query params on all assets; `.nojekyll` confirmed in repo root; GitHub Pages live at `https://barristanselmy.github.io/hybrid-attendance-tracker/`; CSS transition on status change for click feedback; status legend; keyboard navigation.
**Avoids:** Stale CDN assets (Pitfall 4), Jekyll file-dropping bug

### Phase Ordering Rationale

- Foundation before everything else because the date utility and localStorage wrappers are called by every other phase. Bugs here cascade everywhere.
- Calculation logic before UI because the formula is the product's core differentiator and is independently testable without a browser UI.
- State layer before interaction because StatusPicker needs AppState to exist before it can write to it; CalendarGrid DOM must exist before click delegation can be attached.
- Preferences and stats last among core phases because they depend on AppState being stable and the calculation function being correct.
- Deployment phase last because cache-busting is only relevant once iterative deploys begin, and polish belongs after the functional core is verified.

### Research Flags

Phases with well-documented patterns (skip research-phase):
- **Phase 1 (Foundation):** localStorage and cookie patterns are extensively documented; the specific helpers are provided in STACK.md verbatim.
- **Phase 3 (Calendar Grid):** CSS Grid calendar layout is a solved, well-documented problem. The exact implementation pattern is provided in STACK.md and ARCHITECTURE.md.
- **Phase 4 (Interaction):** Event delegation and pub-sub on vanilla JS are canonical, well-documented patterns. No novel integration risk.
- **Phase 6 (Deployment):** GitHub Pages deployment from `main` branch root is a two-click UI operation; the `.nojekyll` requirement is documented.

Phases that may benefit from brief planning validation:
- **Phase 2 (Calculation):** The denominator formula has edge cases (partial month, all-WFA months, toggled weekends) that warrant writing out explicit test cases before coding. Not novel research — just explicit test design.
- **Phase 5 (Preferences/Stats):** The interaction between weekend toggle and denominator recalculation has a subtle ordering requirement (preference must be loaded before first render). Worth a brief design pass.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies are native browser APIs with MDN/official documentation. No third-party library decisions to validate. |
| Features | HIGH | Scope is tightly defined in PROJECT.md; competitor analysis confirms the 4-status + correct-denominator approach is unique and correct. |
| Architecture | HIGH | Observer/pub-sub + keyed records + full re-render is a well-established vanilla JS pattern. Component boundaries map directly to feature boundaries. |
| Pitfalls | HIGH (date/calc/storage) / MEDIUM (CDN) | Date timezone bug and localStorage exceptions are thoroughly documented. CDN cache behavior is empirically reported but not officially spec'd by GitHub. |

**Overall confidence:** HIGH

### Gaps to Address

- **CDN cache timing:** GitHub Pages CDN propagation is reported as 5–10 minutes by community sources but not officially documented. Treat as a known operational constraint; the `?v=N` mitigation is unambiguous.
- **localStorage behavior in private browsing on iOS Safari:** The near-zero quota behavior in private browsing is well-documented for Firefox; iOS Safari private mode behavior with localStorage has varied across versions. The try/catch wrapper in Phase 1 handles this defensively, but testing on iOS Safari private mode is worth doing before considering the app production-ready.
- **Exact cookie cookie attributes for GitHub Pages custom domain (if added):** PITFALLS.md notes that `Secure` flag is correct for GitHub Pages (HTTPS guaranteed). If a custom domain is added later with HTTP support, this assumption needs revisiting.

## Sources

### Primary (HIGH confidence)
- MDN Web Docs (Cookie Store API, Temporal API, localStorage) — browser API baseline status, storage limits
- CSS-Tricks "A Calendar in Three Lines of CSS" — CSS Grid calendar layout pattern
- GitHub Docs "Configuring a publishing source" — GitHub Pages branch root deployment
- ECMAScript specification (via MDN) — ISO date string UTC parse behavior

### Secondary (MEDIUM confidence)
- Go Make Things "Working with cookies in vanilla JS" — `document.cookie` parse/serialize helpers
- LogRocket "localStorage in JavaScript: A complete guide" — QuotaExceededError handling patterns
- Jan Monschke "Simple frontend data migration" — schema version + migration pattern
- Chris Lamb "Simple media cachebusting with GitHub Pages" — `?v=N` query string pattern
- DEV Community timezone gotcha articles — confirming off-by-one behavior in negative UTC offsets

### Tertiary (LOW confidence)
- Community reports on GitHub Pages CDN cache duration (5–10 min) — no official SLA; empirical observation only

---
*Research completed: 2026-04-13*
*Ready for roadmap: yes*
