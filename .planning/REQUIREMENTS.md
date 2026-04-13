# Requirements — Hybrid Attendance Tracker

## Functional Requirements

### FR-1: Monthly Calendar Grid
Display the current month as a 7-column calendar grid. Each day cell shows its date number and current status color. First day of the month aligns to the correct day-of-week column. Empty cells fill leading/trailing positions.

### FR-2: Day Status Cycling
Click/tap any day cell to cycle through statuses: unset → in office → at home → time off → work from anywhere → unset. Each status has a distinct color. Status changes persist immediately to localStorage.

### FR-3: Color-Coded Status Indicators
Each status type has a visually distinct color:
- In office: color TBD (warm/active)
- At home: color TBD (cool/neutral)
- Time off: color TBD (muted/absent)
- Work from anywhere: color TBD (accent/travel)
- Unset: no color / default background

Colors must be distinguishable without relying on text labels alone.

### FR-4: Weekend Handling
Weekends (Saturday/Sunday) are excluded from tracking and calculations by default. A toggle enables/disables weekend tracking. Toggle state persists in cookies. When weekends are enabled, they behave like any other day (clickable, counted in calculations).

### FR-5: Average In-Office Days Per Week
Calculate and display: `(in-office days) / (total set days - time off days - WFA days) × 5`

Denominator rules:
- Only count days that have an explicit status set (not unset, not future)
- Subtract time-off days from denominator
- Subtract WFA days from denominator
- Multiply ratio by 5 to express as "days per week"
- Display "—" when denominator is zero

### FR-6: Running Status Totals
Display count of each status type for the current month view (e.g., "In Office: 8 | At Home: 4 | Time Off: 2 | WFA: 1").

### FR-7: Live Recalculation
Average and totals update instantly on every status change — no manual refresh or button press.

### FR-8: Month Navigation
Prev/next arrows to navigate between months. Display current month name and year. Default to current month on page load.

### FR-9: Today Indicator
Visually highlight the current date cell (only visible when viewing current month).

### FR-10: Keyboard Navigation
Arrow keys navigate between day cells. Enter/Space cycles status on focused cell. Tab moves focus in/out of the calendar grid.

### FR-11: Data Persistence
Attendance data stored in localStorage keyed by month (`attendance-YYYY-MM`). Data survives page reloads and browser restarts. Schema includes a version key for future migration. All localStorage access wrapped in try/catch with graceful fallback.

### FR-12: Preference Persistence
User preferences (weekend toggle state) stored via `document.cookie`. Cookies set with `Secure`, `SameSite=Lax`, 365-day expiry.

### FR-13: Dark Mode
Passive `prefers-color-scheme: dark` support via CSS media query. No toggle — follows system setting. Status colors must remain distinguishable in both light and dark modes.

## Non-Functional Requirements

### NFR-1: Zero Dependencies
Pure HTML, CSS, and vanilla JavaScript. No frameworks, libraries, build tools, or package managers.

### NFR-2: GitHub Pages Deployment
Works as static files served from repo root on GitHub Pages. Include `.nojekyll` file. Cache-busting via `?v=N` query params on CSS/JS assets.

### NFR-3: Responsive Layout
Usable on desktop and mobile viewports. Calendar grid adapts to screen width.

### NFR-4: Date Safety
All date construction uses the numeric `Date` constructor (`new Date(year, month, day)`) — never string parsing. Prevents UTC timezone offset bugs.

### NFR-5: Storage Safety
All localStorage and cookie operations wrapped in try/catch. App functions in a degraded state (no persistence) if storage is unavailable (private browsing).

## Out of Scope
- Team/multi-user views
- Authentication
- Server-side processing
- Calendar sync (Google/Outlook)
- Export/CSV/PDF
- Push notifications
- Annual summary view
- PWA / service worker

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FR-1 | Phase 2 | Pending |
| FR-2 | Phase 2 | Pending |
| FR-3 | Phase 2 | Pending |
| FR-4 | Phase 3 | Pending |
| FR-5 | Phase 3 | Pending |
| FR-6 | Phase 3 | Pending |
| FR-7 | Phase 2 | Pending |
| FR-8 | Phase 2 | Pending |
| FR-9 | Phase 2 | Pending |
| FR-10 | Phase 3 | Pending |
| FR-11 | Phase 1 | Complete |
| FR-12 | Phase 1 | Complete |
| FR-13 | Phase 3 | Pending |
| NFR-1 | Phase 1 | Complete |
| NFR-2 | Phase 2 | Pending |
| NFR-3 | Phase 2 | Pending |
| NFR-4 | Phase 1 | Pending |
| NFR-5 | Phase 1 | Complete |

---
*Scoped: 2026-04-13*
