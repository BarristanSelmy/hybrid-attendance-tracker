---
phase: 2
slug: calendar-and-core-loop
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x |
| **Config file** | `vitest.config.js` (exists from Phase 1) |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run --coverage` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | FR-2, FR-7, FR-8 | unit | `npx vitest run tests/app-state.test.js` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | FR-1, FR-9 | unit | `npx vitest run tests/calendar.test.js` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | FR-2, FR-3 | unit | `npx vitest run tests/app-state.test.js` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 2 | NFR-2, NFR-3 | smoke | `ls .nojekyll` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/app-state.test.js` — covers FR-2 (cycle), FR-7 (pub-sub notify), FR-8 (month navigation)
- [ ] `tests/calendar.test.js` — covers FR-1 (grid rendering), FR-9 (today indicator)

*Existing infrastructure covers framework install — vitest.config.js and package.json already exist from Phase 1.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Calendar grid adapts to mobile viewport without horizontal scroll | NFR-3 | Responsive layout requires visual browser check | Open at 320px viewport width, verify no horizontal scrollbar |
| Status colors visually distinguishable | FR-3 | Color perception is visual | Inspect all 4 status colors in browser, verify they are distinct |
| GitHub Pages loads from public URL | NFR-2 | Requires live deployment | Visit https://barristanselmy.github.io/hybrid-attendance-tracker/ after deploy |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
