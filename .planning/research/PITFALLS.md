# Pitfalls Research

**Domain:** Static single-page calendar/attendance tracker (vanilla JS, localStorage, GitHub Pages)
**Researched:** 2026-04-13
**Confidence:** HIGH for date handling and localStorage; MEDIUM for GitHub Pages CDN behaviour; HIGH for calculation logic

## Critical Pitfalls

### Pitfall 1: ISO Date String Parses as UTC, Displays as Previous Day

**What goes wrong:**
`new Date("2025-12-01")` is treated as midnight UTC. Users in UTC-offset timezones (Americas, parts of Europe) see the date render as the previous calendar day. Stored localStorage keys like `"2025-12-01"` match the intended date, but any code that creates a `Date` object from that string for display or comparison produces the wrong day.

**Why it happens:**
The ECMAScript spec mandates that date-only ISO strings (YYYY-MM-DD) are parsed as UTC, while date-time strings default to local time. Developers naturally reach for `new Date(isoString)` not knowing it has this split behaviour.

**How to avoid:**
Never use `new Date("YYYY-MM-DD")` when you need a local date. Use the numeric constructor instead:
```js
// Safe: creates the date in local time
const d = new Date(2025, 11, 1); // month is 0-indexed

// Or parse the ISO string manually
const [y, m, day] = "2025-12-01".split("-").map(Number);
const d = new Date(y, m - 1, day);
```
Use ISO strings only as opaque storage keys, not as Date constructor arguments.

**Warning signs:**
- Users in negative UTC offsets report calendar showing wrong day
- Day 1 of a month appears as last day of the previous month
- Unit tests pass in UTC CI but fail locally in e.g. EST

**Phase to address:**
Foundation / core data model — must be fixed before any calendar rendering is written.

---

### Pitfall 2: Average Calculation Uses Wrong Denominator

**What goes wrong:**
The headline feature — "average in-office days per week" — produces nonsense numbers if the denominator is calculated incorrectly. Common mistakes:
- Dividing total in-office days by calendar weeks (includes weekends, time-off days)
- Not excluding future days from the current month (inflates denominator before month ends)
- Counting WFA days as "worked days" when they should be excluded from both numerator and denominator
- Using calendar weeks (always 4.3 weeks/month) instead of counting actual elapsed workweeks

**Why it happens:**
The correct formula (`in-office days / (elapsed workdays - time-off - WFA)`) has a non-obvious denominator. Developers often simplify to `in-office / total workdays in month`, which includes days not yet logged.

**How to avoid:**
Be explicit in code comments and implementation:
- Denominator = days where a status was explicitly set AND status is not time-off AND status is not WFA
- Do not include future (unset) days in either numerator or denominator
- If the current month is in progress, only count days up to and including today

**Warning signs:**
- Average displays as a fraction much lower than expected mid-month
- Average jumps discontinuously at month boundaries
- Average counts 0/week on days with only WFA or time-off entries

**Phase to address:**
Core calculation logic — must be verified with explicit unit tests before UI is wired up.

---

### Pitfall 3: localStorage Data Lost on Schema Change Without Migration

**What goes wrong:**
App ships with one data shape (e.g., `{ "2025-12-01": "office" }`). A later change (e.g., adding a `notes` field, renaming a status string) means old data silently parses to `undefined` or crashes `JSON.parse`. Users who had months of data lose everything or see a broken UI.

**Why it happens:**
localStorage has no schema enforcement. Developers add fields or rename values during development without writing migration code, because it "works after clearing storage" locally.

**How to avoid:**
- Store a `schemaVersion` key in localStorage alongside data from day one
- On startup, read the version and run migrations before any other reads
- Keep migrations as a small, sequential array of functions: `migrations[0]` upgrades v0→v1, etc.
- Status strings should be constants defined once, not inline literals repeated throughout

**Warning signs:**
- Any PR that changes localStorage key names or status string values without a migration function
- App throws on `JSON.parse` after deploy

**Phase to address:**
Foundation — define the data schema and version key before writing any persistence code.

---

### Pitfall 4: Stale Assets Served from GitHub Pages CDN After Deploy

**What goes wrong:**
GitHub Pages caches assets aggressively at its CDN edge. After pushing a fix or update, users (and the developer) continue to see the old version for minutes to hours. The HTML is fresh but references the cached old CSS/JS, causing broken styling or logic.

**Why it happens:**
No-build-step projects have no asset fingerprinting (content hash in filenames). GitHub Pages sets `Cache-Control: max-age=600` on most assets, and CDN edge nodes cache independently. Clearing browser cache does not clear CDN caches.

**How to avoid:**
- Append a manual query string version to `<link>` and `<script>` tags: `style.css?v=2`
- Increment `?v=N` in `index.html` whenever CSS or JS changes
- This is the only no-build-step cache-busting option available on GitHub Pages
- Accept 5–10 minute CDN propagation delay as a known operational constraint

**Warning signs:**
- "It works in incognito but not in my normal browser" — browser cache issue
- "It works for me but not others" — CDN edge cache issue
- Console errors about missing properties that were just added

**Phase to address:**
Initial GitHub Pages deployment setup — establish the versioning convention before any iterative changes.

---

### Pitfall 5: Unhandled localStorage Exceptions Silently Break the App

**What goes wrong:**
`localStorage.setItem()` throws a `DOMException` (QuotaExceededError) when storage is full. `JSON.parse()` throws when stored data is corrupted (manually edited, truncated by browser). Both are synchronous exceptions that, if uncaught, prevent the entire app from loading or saving.

**Why it happens:**
Developers write `localStorage.setItem(key, JSON.stringify(data))` without try/catch because it "always works" during development. Production environments have private browsing mode (where storage quota is near-zero), extensions that corrupt storage, and users who manually edit dev tools storage.

**How to avoid:**
- Wrap all `localStorage.getItem` + `JSON.parse` in try/catch; fall back to an empty default state
- Wrap all `localStorage.setItem` in try/catch; surface a non-blocking UI warning on quota failure
- Validate the parsed shape before using it — check for expected keys, not just "parsed without error"

**Warning signs:**
- App loads blank/broken in private browsing
- Users report "all my data disappeared" — likely a parse error that reset state
- Console shows uncaught DOMException

**Phase to address:**
Foundation — implement safe read/write helpers before any other localStorage usage.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Inline status strings (`"office"`, `"home"`) spread through code | Faster first draft | Renaming breaks localStorage data; hard to find all usages | Never — define constants from the start |
| No `schemaVersion` in localStorage | Simpler initial code | First schema change forces users to clear storage or breaks silently | Never for a shipped app |
| `new Date(isoString)` for local date math | Concise code | Off-by-one rendering bug in all negative UTC timezones | Never — use numeric constructor |
| Manual `?v=1` cache-busting query param | No build tooling needed | Must remember to increment on every CSS/JS change | Acceptable for v1 no-build approach |
| Storing all months in one localStorage key | Single read on load | Grows unboundedly; harder to migrate partial data | Acceptable for personal single-user tool at this scale |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| GitHub Pages deployment | Forgetting that `index.html` must be at repo root (or `/docs`) | Keep `index.html` at repo root; configure Pages to serve from `main` branch root |
| GitHub Pages + custom domain | Pushing CNAME file manually then having it overwritten by branch deploys | Commit `CNAME` file to repo root so it persists across deploys |
| Cookies for preferences | Setting cookies with `document.cookie = "key=value"` without `SameSite` or `Secure` attributes | Always set `SameSite=Strict; Secure` on GitHub Pages (HTTPS is guaranteed); omit `HttpOnly` since JS must read them |
| localStorage across tabs | Concurrent tab writes can partially corrupt state if app rewrites the full object mid-navigation | Use `storage` event listener to sync tabs; or accept single-tab model explicitly |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Rewriting entire localStorage blob on every click | Not noticeable with 1 year of data (~365 keys × small object) | At this scale, fine — avoid premature optimisation | Would only matter at 10+ years of daily data, well beyond personal use |
| Re-rendering the entire calendar DOM on every state change | Janky click response on low-end mobile | Use targeted DOM updates: only re-render the clicked day cell and the stats display | Noticeable at 31 cells if each is rebuilt with complex innerHTML |
| Parsing all 12 months of localStorage on every month navigation | Not noticeable for personal use | Lazy-parse only the displayed month on navigation | Not a real concern at this scale |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing sensitive workplace data in localStorage of a shared computer | Other users or browser extensions can read it | This is a personal tool — document in README that it is intended for single-user personal browsers only; no mitigation needed at v1 |
| Setting cookies without `Secure` flag on HTTPS | Cookie sent over HTTP if user somehow navigates to HTTP variant | GitHub Pages always serves HTTPS; still best practice to set `Secure` flag explicitly |
| No cookie `SameSite` attribute | Modern browsers default to `Lax` — sufficient for this app, but explicit is better | Set `SameSite=Strict` since the app is not embedded in iframes |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visual feedback that a click was registered | User double-clicks, toggling status back | Brief CSS transition or animation on status change confirms the action |
| Average stat displays before any data entered (shows 0 or NaN) | Confusing on first visit | Show "—" or "No data yet" when denominator is zero |
| Month navigation shows future months with no data as "0% office" | Misleading — implies attendance was logged | Distinguish "no data logged" from "logged as home"; future months should show empty cells |
| Weekend toggle changes don't retroactively warn about existing weekend data | User toggled weekends off but had clicked some Saturday entries — those silently become "invisible" to the calculation | Warn user or visually grey out weekend cells when toggle is off, so they understand those days are excluded |
| Status cycle order is non-obvious on first use | User can't guess what the next click will produce | Display a legend; use a consistent visual cycle order |

---

## "Looks Done But Isn't" Checklist

- [ ] **Average calculation:** Verify denominator excludes future unset days — check mid-month where half the days are blank
- [ ] **Timezone safety:** Open the app at midnight in a UTC-5 timezone and verify "today" highlights the correct day
- [ ] **localStorage recovery:** Manually corrupt the localStorage value in DevTools and reload — app should load with empty state, not crash
- [ ] **Cache busting:** After incrementing `?v=N` and deploying, confirm the new JS/CSS loads without hard refresh
- [ ] **Weekend toggle:** Verify that toggling weekends off/on does not alter the stored status for weekend days, only hides them from calculation
- [ ] **Empty month:** Navigate to a month with no data — average stat should show "—" not "NaN" or "Infinity"
- [ ] **Full month edge case:** Navigate to a past month where every day is logged — average should compute correctly across week boundaries

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Timezone date bug ships to production | MEDIUM | Fix the date constructor usage; add migration that re-keys any mis-stored entries (may not be possible without knowing user's timezone at time of storage) |
| Wrong average formula ships | LOW | Formula is pure JS, no stored data shape change needed; fix and redeploy |
| localStorage schema change breaks existing data | HIGH | Must write a version-aware migration; if version key was not stored, must attempt heuristic detection of old shape |
| CDN serves stale assets | LOW | Increment `?v=N` in index.html and push; resolves within ~10 minutes |
| Unhandled parse exception clears all data | HIGH | No recovery if data is gone; add try/catch prospectively; cannot recover already-lost user data |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| ISO date string timezone bug | Foundation — data model and date utilities | Test date rendering in a spoofed UTC-5 environment or with `TZ=America/New_York` |
| Wrong average denominator | Core calculation logic | Unit test matrix: mid-month, all WFA, all time-off, mixed statuses |
| No localStorage schema version | Foundation — persistence layer | Code review: confirm `schemaVersion` key is written on first save |
| Stale GitHub Pages CDN assets | Initial deployment phase | Deploy a visible CSS change, verify it appears without hard refresh after 10 min |
| Uncaught localStorage exceptions | Foundation — persistence layer | Test in Firefox private window (near-zero quota) and with manually corrupted storage |
| NaN/Infinity in average display | UI / stats display phase | Navigate to an empty month and a month with only time-off entries |

---

## Sources

- [A Complete Guide to JavaScript Dates (and why your date is off by 1 day) — DEV Community](https://dev.to/zachgoll/a-complete-guide-to-javascript-dates-and-why-your-date-is-off-by-1-day-fi1)
- [Why JavaScript new Date() Returns Different Results for yyyy-mm-dd vs yyyy/mm/dd — javaspring.net](https://www.javaspring.net/blog/different-result-for-yyyy-mm-dd-and-yyyy-mm-dd-in-javascript-when-passed-to-new-date/)
- [The JavaScript Date Time Zone Gotcha That Trips Up Everyone — DEV Community](https://dev.to/davo_man/the-javascript-date-time-zone-gotcha-that-trips-up-everyone-20lf)
- [Using localStorage in Modern Applications — RxDB](https://rxdb.info/articles/localstorage.html)
- [localStorage in JavaScript: A complete guide — LogRocket](https://blog.logrocket.com/localstorage-javascript-complete-guide/)
- [Data corruption prevention — StudyRaid](https://app.studyraid.com/en/read/12378/399705/data-corruption-prevention)
- [Simple frontend data migration — Jan Monschke](https://janmonschke.com/simple-frontend-data-migration/)
- [Configuring a publishing source for your GitHub Pages site — GitHub Docs](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Why Isn't My GitHub Page Updating? — codestudy.net](https://www.codestudy.net/blog/why-does-my-github-page-not-update-its-content/)
- [Simple media cache-busting with GitHub Pages — Chris Lamb](https://chris-lamb.co.uk/posts/simple-media-cachebusting-with-github-pages)
- [Secure cookie configuration — MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Cookies)
- [Back to Basics: Explore the Edge Cases or Date Math will Get You — Scott Hanselman](https://www.hanselman.com/blog/back-to-basics-explore-the-edge-cases-or-date-math-will-get-you)

---
*Pitfalls research for: static hybrid attendance tracker (vanilla JS + localStorage + GitHub Pages)*
*Researched: 2026-04-13*
