# Roadmap: Hybrid Attendance Tracker

## Overview

Three phases deliver a fully working personal attendance tracker. Phase 1 builds the invisible but critical foundation — safe storage helpers, correct date utilities, and the average calculation formula verified in isolation. Phase 2 assembles the visible app — calendar grid, click-to-cycle interaction, state layer, and month navigation — leaving users with a fully working tracker. Phase 3 completes the surface — stats display, weekend toggle, dark mode, and keyboard navigation — and confirms the live deployment.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Storage helpers, date utilities, and verified average calculation formula (completed 2026-04-13)
- [x] **Phase 2: Calendar and Core Loop** - Working calendar grid with click-to-cycle status, month navigation, and persistence (completed 2026-04-13)
- [ ] **Phase 3: Stats, Preferences, and Polish** - Stats display, weekend toggle, dark mode, keyboard nav, and deployment

## Phase Details

### Phase 1: Foundation
**Goal**: Safe, correct data infrastructure exists that every UI component can depend on
**Depends on**: Nothing (first phase)
**Requirements**: FR-11, FR-12, NFR-1, NFR-4, NFR-5
**Success Criteria** (what must be TRUE):
  1. Attendance data can be written to and read from localStorage keyed by month, and the app continues to function (no throws) when localStorage is unavailable
  2. Cookie read/write helpers correctly persist and retrieve user preferences with Secure, SameSite=Lax, and 365-day expiry
  3. All date construction uses the numeric Date constructor — no ISO string parsing — and produces correct local-time dates in negative UTC-offset timezones
  4. The average calculation returns the correct result for: normal mid-month mix, all-WFA month, all-time-off month, empty month (returns "—"), and toggled-weekend scenarios
  5. A schemaVersion key is present in every localStorage write, and a corrupt or missing payload falls back to empty state without throwing
**Plans**: 2 plans

Plans:
- [ ] 01-01-PLAN.md — Test infrastructure, localStorage adapter (saveMonth/loadMonth/clearMonth with schemaVersion + try/catch), and cookie helpers (setCookie/getCookie/deleteCookie with Secure/SameSite=Lax)
- [ ] 01-02-PLAN.md — Date construction utilities (numeric Date constructor only) and average in-office calculation formula with edge-case verification

### Phase 2: Calendar and Core Loop
**Goal**: A fully interactive calendar exists where users can click days to set statuses and navigate months, with all data persisting across page reloads
**Depends on**: Phase 1
**Requirements**: FR-1, FR-2, FR-3, FR-7, FR-8, FR-9, NFR-2, NFR-3
**Success Criteria** (what must be TRUE):
  1. The current month displays as a 7-column grid with days aligned to the correct day-of-week column and today's cell visually highlighted
  2. Clicking any day cell cycles its status (unset → in office → at home → time off → WFA → unset) and the cell color updates instantly without a page reload
  3. Navigating to a previous or future month renders that month's grid with any previously saved statuses already applied
  4. Reloading the page restores all previously set statuses for the displayed month
  5. The calendar is usable on both desktop and mobile viewports without horizontal scrolling
  6. The app deploys to GitHub Pages and loads correctly from the public URL with no build step
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — AppState pub-sub object and CalendarGrid renderer with full unit test coverage
- [x] 02-02-PLAN.md — index.html, style.css, app.js bootstrap, event delegation wiring, and GitHub Pages deployment files

### Phase 3: Stats, Preferences, and Polish
**Goal**: The average calculation is displayed and live, the weekend toggle works and persists, and the app is accessible and visually complete in both light and dark modes
**Depends on**: Phase 2
**Requirements**: FR-4, FR-5, FR-6, FR-10, FR-13
**Success Criteria** (what must be TRUE):
  1. The average in-office days per week updates instantly on every status change and displays "—" when no qualifying days exist
  2. The per-status count totals (In Office / At Home / Time Off / WFA) update instantly on every status change
  3. Enabling the weekend toggle makes Saturday and Sunday clickable and included in calculations; disabling it excludes them; toggle state persists after page reload
  4. Arrow keys navigate between day cells and Enter/Space cycles the focused cell's status
  5. All status colors and the average/totals display remain clearly readable when the OS is set to dark mode
**Plans**: TBD

Plans:
- [ ] 03-01: StatsDisplay component (average + totals, live recalculation, "—" fallback)
- [ ] 03-02: Weekend toggle UI with cookie persistence, keyboard navigation, dark mode CSS, and cache-busting setup

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/2 | Complete   | 2026-04-13 |
| 2. Calendar and Core Loop | 2/2 | Complete     | 2026-04-13 |
| 3. Stats, Preferences, and Polish | 0/2 | Not started | - |

## Requirement Coverage

| Requirement | Phase | Description |
|-------------|-------|-------------|
| FR-1 | Phase 2 | Monthly calendar grid |
| FR-2 | Phase 2 | Day status cycling |
| FR-3 | Phase 2 | Color-coded status indicators |
| FR-4 | Phase 3 | Weekend handling and toggle |
| FR-5 | Phase 3 | Average in-office days per week |
| FR-6 | Phase 3 | Running status totals |
| FR-7 | Phase 2 | Live recalculation |
| FR-8 | Phase 2 | Month navigation |
| FR-9 | Phase 2 | Today indicator |
| FR-10 | Phase 3 | Keyboard navigation |
| FR-11 | Phase 1 | Data persistence (localStorage) |
| FR-12 | Phase 1 | Preference persistence (cookies) |
| FR-13 | Phase 3 | Dark mode |
| NFR-1 | Phase 1 | Zero dependencies |
| NFR-2 | Phase 2 | GitHub Pages deployment |
| NFR-3 | Phase 2 | Responsive layout |
| NFR-4 | Phase 1 | Date safety (numeric constructor) |
| NFR-5 | Phase 1 | Storage safety (try/catch) |

**Coverage: 18/18 requirements mapped. No orphans.**
