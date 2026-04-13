# Feature Research

**Domain:** Personal hybrid work attendance tracker (static web app)
**Researched:** 2026-04-13
**Confidence:** HIGH — project scope is well-defined in PROJECT.md; commercial SaaS features verified via web search

## Feature Landscape

### Table Stakes (Users Expect These)

Features the user assumes exist. Missing these = the tool doesn't solve the core problem.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Monthly calendar grid | Primary UI metaphor for any date-based tracker | LOW | Grid layout, 7-column, current month on load |
| Click/tap to set day status | The entire interaction model | LOW | Cycle through: in-office → home → time-off → WFA → back to unset |
| Color-coded status indicators | Visual at-a-glance reading of the month | LOW | Distinct color per status; must work without text labels alone |
| Average in-office days/week display | The core calculated output the tool exists to provide | MEDIUM | Formula: office-days ÷ (working-days − time-off − WFA); must exclude non-working days from denominator |
| Weekends excluded by default | Standard work-week assumption; including them skews the metric | LOW | Saturday/Sunday not counted in denominator unless toggled |
| Month navigation (prev/next) | Users need to view history and plan ahead | LOW | Prev/next arrows; display month+year label |
| Data persists across page reloads | Without this, the tool has zero value after closing the tab | LOW | localStorage keyed by month+year |

### Differentiators (Competitive Advantage)

Features that make this personal tool genuinely more useful than a spreadsheet or note.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Correct denominator logic for the average | Most ad-hoc trackers count all weekdays; excluding WFA and time-off gives an honest "pace" metric | MEDIUM | This is the core differentiator per PROJECT.md — get the formula right |
| Weekend toggle for tracking | Some hybrid workers work occasional Saturdays; toggle enables/disables them as countable days | LOW | Preference stored in cookies per PROJECT.md; applies globally not per-day |
| Work-from-anywhere (WFA) as a distinct status | WFA days are neither "in office" nor "home" — common arrangement for travelers; treating them separately avoids inflating the home-day count | LOW | Four statuses vs. the typical two or three in commercial tools |
| Today indicator | Knowing where you are in the month is immediate context | LOW | Visual highlight on current date cell |
| Running calculation visible at all times | Knowing your current pace mid-month lets you course-correct before month-end | LOW | Static summary bar or card; recalculates on every status change |

### Anti-Features (Deliberately Not Building)

Features common in SaaS tools that are wrong for a personal static tracker.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Team/multi-user views | Every commercial tool has them | Requires auth, a backend, and a database — all ruled out by constraint; adds zero value for a single-user tool | Personal scope only; share the URL to GitHub Pages if someone wants to see your setup |
| Calendar sync (Google/Outlook) | Feels like a time-saver | Read/write OAuth requires a server-side secret and a callback URL — incompatible with pure static hosting | User manually sets status each day; the tool is the calendar |
| Push/email reminders | "Reminds you to log your day" | Requires a service worker with push permissions, or a server — neither fits static constraint | Log when you remember; month navigation means you can back-fill |
| Export to PDF/CSV | Commercial tools offer this | Adds significant JS complexity for a feature that a screenshot or DevTools copy handles in seconds | Browser screenshot; or copy localStorage JSON manually if needed |
| Analytics charts / trend graphs | Pretty and marketable | A single number (avg days/week) is the whole point; charts add visual complexity without insight for personal use | The average calculation IS the analytics |
| Mobile app (PWA or native) | Better mobile UX | PWA adds service worker and manifest complexity; native requires a separate build pipeline | Responsive web layout is sufficient for occasional mobile access |
| Dark mode toggle | Common user preference | Adds CSS variable overhead and a second preference to persist; low value for a single-user tool | Use `prefers-color-scheme` media query passively if desired, no toggle needed |
| Authentication / login | "Security" | Single user, personal data only; login adds friction with zero security benefit when data never leaves the browser | No auth needed; data is localStorage, not a server |
| Server-side anything | Scalability | Violates static hosting constraint | GitHub Pages + browser storage is the entire infrastructure |

## Feature Dependencies

```
[Month navigation]
    └──requires──> [localStorage persistence]
                       (navigation to past months is useless if data wasn't saved)

[Average calculation]
    └──requires──> [Status assignment per day]
    └──requires──> [Weekend toggle preference]
                       (denominator depends on whether weekends count)

[Weekend toggle]
    └──requires──> [Cookie-based preference storage]

[Color-coded indicators]
    └──requires──> [Status assignment per day]

[Today indicator]
    └──requires──> [Calendar grid]

[WFA status]
    └──enhances──> [Average calculation]
                       (correct denominator requires WFA exclusion)
```

### Dependency Notes

- **Month navigation requires localStorage persistence:** Navigating to February is only meaningful if February's data was saved when the user was in February. Persistence must be implemented before month nav is useful.
- **Average calculation requires weekend toggle:** The denominator changes depending on whether weekends are tracked. Preference storage must be read before the calculation runs.
- **WFA status enhances average calculation:** WFA is the feature that separates this tracker's metric from a simple "office days / all weekdays" formula. It must be included in the denominator exclusion logic alongside time-off.

## MVP Definition

### Launch With (v1)

- [ ] Monthly calendar grid with current month on load — the UI surface
- [ ] Click/tap to cycle through four statuses (office, home, time-off, WFA) — the core interaction
- [ ] Color-coded status per day — required for the grid to be readable
- [ ] Weekends marked off by default, not counted — correct baseline assumption
- [ ] Average in-office days/week calculation with correct denominator — the core value prop
- [ ] Month navigation (prev/next) — needed to view history; back-filling is a primary use pattern
- [ ] localStorage persistence keyed by month — without this, every refresh loses all data
- [ ] Weekend toggle stored in cookies — project requirement; affects calculation correctness

### Add After Validation (v1.x)

- [ ] Today indicator — add once the base grid is working; trivial CSS, but not needed for v1 to be useful
- [ ] Running calculation updates on every click — could start with a "recalculate" button then refine to live updates once the formula is solid
- [ ] Keyboard navigation (arrow keys to move between days) — accessibility improvement, low effort, add after core UX is confirmed

### Future Consideration (v2+)

- [ ] Export/copy month summary — only relevant if the user wants to share data; defer until there's a use case
- [ ] Annual summary view — useful for year-end reporting to an employer; defer until monthly tracking is habitual
- [ ] Passive `prefers-color-scheme` support — cosmetic; defer until core is stable

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Calendar grid | HIGH | LOW | P1 |
| Status cycling per day | HIGH | LOW | P1 |
| Color-coded indicators | HIGH | LOW | P1 |
| Average calculation (correct denominator) | HIGH | MEDIUM | P1 |
| localStorage persistence | HIGH | LOW | P1 |
| Month navigation | HIGH | LOW | P1 |
| Weekend toggle + cookie storage | MEDIUM | LOW | P1 |
| Today indicator | MEDIUM | LOW | P2 |
| Live recalculation on click | MEDIUM | LOW | P2 |
| Keyboard navigation | LOW | LOW | P2 |
| Annual summary | MEDIUM | MEDIUM | P3 |
| Export/copy | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

Personal-use static trackers are a thin niche. Most tools are team SaaS products. Key comparators:

| Feature | Commercial SaaS (Officely, Jibble, AttendanceBot) | Hybrid Work Tracker (hybridworktracker.com) | This Project |
|---------|---------------------------------------------------|---------------------------------------------|--------------|
| Calendar view | YES — shared team calendar | YES — personal monthly calendar | YES — personal monthly grid |
| Status types | 2-3 (office / remote / leave) | 3-4 (office / home / leave / WFA) | 4 (office / home / time-off / WFA) |
| Average calculation | YES — team aggregate | YES — personal average | YES — personal, correct denominator |
| Data storage | Cloud / server | Cloud account | localStorage only |
| Auth required | YES | YES (account) | NO |
| Team features | YES — core feature | NO | NO — deliberate |
| Export | YES — PDF/CSV | YES | NO — v1 |
| Mobile app | YES | YES | NO — responsive web only |
| Static hosting | NO | NO | YES — GitHub Pages |
| Build required | YES | YES | NO — zero build step |

**Takeaway:** No existing tool is both personal-only AND static. The constraint of zero build step + GitHub Pages + localStorage-only is the unique characteristic of this project. Commercial tools offer far more features but require accounts, servers, and build pipelines that this project explicitly avoids.

## Sources

- Project requirements: `.planning/PROJECT.md`
- [Hybrid Work Attendance Monitoring in 2026 — Apploye](https://apploye.com/blog/hybridwork-monitoring-attendance/)
- [10 Best Office Attendance Tracker Apps for Hybrid Work — Officely](https://getofficely.com/blog/top-apps-in-office-attendance/)
- [25 Best Attendance Tracking Software Reviewed for 2026 — People Managing People](https://peoplemanagingpeople.com/tools/best-attendance-tracking-software/)
- [Hybrid Work Tracker](https://hybridworktracker.com/)
- [State of Hybrid Work 2025 — Owl Labs](https://owllabs.com/state-of-hybrid-work/2025) — context for why 3-day office averages are the norm users track against

---
*Feature research for: personal hybrid attendance tracker (static)*
*Researched: 2026-04-13*
