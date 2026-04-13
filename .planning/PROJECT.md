# Hybrid Attendance Tracker

## What This Is

A static single-page web app that helps you track your hybrid work schedule on a monthly calendar. You click each day to set your status (in office, at home, time off, or work from anywhere), and it calculates your average in-office days per week. Hosted on GitHub Pages for easy access.

## Core Value

Accurately calculate average in-office days per week, excluding time off and work-from-anywhere days from the denominator.

## Requirements

### Validated

- [x] Attendance data persisted in localStorage across visits — Validated in Phase 1: Foundation
- [x] User preferences (weekend toggle, etc.) stored in cookies — Validated in Phase 1: Foundation
- [x] Monthly calendar grid showing all days of the current month — Validated in Phase 2: Calendar and Core Loop
- [x] Click/tap each day to cycle through statuses — Validated in Phase 2: Calendar and Core Loop
- [x] Color-coded status indicators for each status type — Validated in Phase 2: Calendar and Core Loop
- [x] Month navigation to view past and future months — Validated in Phase 2: Calendar and Core Loop
- [x] Current month shown by default — Validated in Phase 2: Calendar and Core Loop
- [x] Static HTML suitable for GitHub Pages deployment — Validated in Phase 2: Calendar and Core Loop

### Active

- [ ] Weekends marked as "off" by default (not counted)
- [ ] Toggle to enable/disable weekend days for tracking
- [ ] Average in-office days per week calculation: in-office days / (total days - time off - WFA days)

### Out of Scope

- Team/multi-user views — this is personal tracking only
- Backend/database — all data stays client-side
- Authentication — no login needed
- Mobile app — web-only, though should be responsive
- Export/reporting — v1 focuses on tracking and the average calculation

## Context

- Hosted on GitHub Pages from a public repo (BarristanSelmy/hybrid-attendance-tracker)
- Must work as static files — no server-side processing
- Single user, single browser — localStorage and cookies are sufficient for persistence
- Target audience: hybrid worker wanting to see their in-office frequency at a glance

## Constraints

- **Tech stack**: Pure HTML/CSS/JS — no frameworks, no build tools, no dependencies
- **Hosting**: Must deploy directly to GitHub Pages with zero configuration
- **Storage**: Browser-only (localStorage for data, cookies for preferences)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Static HTML over framework | GitHub Pages simplicity, no build step needed | — Pending |
| localStorage for attendance data | Persists across visits without a server | — Pending |
| Cookies for user preferences | User requested cookie-based preference storage | — Pending |
| Personal-only scope | Keeps v1 simple, no auth/team complexity | — Pending |

---
*Last updated: 2026-04-13 after Phase 2: Calendar and Core Loop complete*
