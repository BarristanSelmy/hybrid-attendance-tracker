# Stack Research

**Domain:** Static single-page attendance tracker (vanilla HTML/CSS/JS)
**Researched:** 2026-04-13
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| HTML5 | Living standard | Structure, semantics | Native `<time>` element for dates, `data-*` attributes for day state, no JSX/templates needed at this scale |
| CSS3 with custom properties | Living standard | Layout and theming | CSS Grid is purpose-built for calendar grids (7-column repeat); custom properties (`--color-*`) replace a design token library |
| Vanilla ES2022+ JavaScript | ES2022 (modules optional) | Logic, state, DOM | No transpilation needed; all target browsers support `class`, `?.`, `??`, `structuredClone` |
| `localStorage` API | Browser built-in | Attendance data persistence | ~5 MB per origin; survives browser restarts; synchronous read/write is fine for this data volume |
| `document.cookie` API | Browser built-in | User preference persistence | User explicitly requested cookies for preferences; 4 KB limit is fine for a handful of key/value pairs |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| VS Code + Live Server extension | Local dev server | Avoids `file://` CORS issues during development; zero config |
| Browser DevTools | Debugging, storage inspection | Application tab shows localStorage and cookies side-by-side |
| `.nojekyll` file in repo root | Bypass GitHub Pages Jekyll processing | Required so GitHub Pages serves files as-is; without it, any `_`-prefixed file or directory is silently dropped |

### Supporting Libraries

None. This project has zero dependencies by design. Every capability required (calendar math, DOM manipulation, storage) is available natively in 2025 browsers.

## Installation

No package manager, no `npm install`. Deployment is:

```bash
# Structure
index.html        # single entry point
style.css         # all styles
app.js            # all logic (or split into modules)
.nojekyll         # prevents Jekyll processing on GitHub Pages
```

Push to `main` branch. Enable GitHub Pages from Settings > Pages, source = `main` branch, root folder. Done.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `document.cookie` for preferences | Cookie Store API | When you need async cookie access or service worker cookie reads. Cookie Store API reached Baseline 2025 (June 2025) but requires HTTPS and has an async interface that adds complexity for simple key/value prefs. Avoid for this project. |
| `new Date()` (legacy Date API) | Temporal API | When date math is complex (time zones, durations, business day calculations). Temporal is NOT Baseline — MDN explicitly warns it does not work in some widely-used browsers as of April 2026. Do not use without a polyfill, and this project has no dependencies. |
| CSS Grid for calendar layout | CSS Flexbox | Flexbox works for one dimension (a row of days). Calendar is inherently two-dimensional; Grid's `grid-template-columns: repeat(7, 1fr)` and `grid-column-start` for day offset is the canonical approach. |
| Single `index.html` entry point | Multi-page HTML | Only justified if distinct pages exist. This app is a single view; multiple HTML files add navigation complexity with no benefit. |
| ES modules via `<script type="module">` | CommonJS / bundled JS | ES modules work natively in all 2025 browsers without a bundler. Use for code organization if the single JS file grows large. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| React / Vue / Svelte | Adds a build step and dependency chain; GitHub Pages + no-build is the explicit constraint | Vanilla JS |
| npm / Node.js toolchain | Any `npm install` step breaks the "no build step, no server" requirement | Static files directly committed |
| Temporal API (no polyfill) | Not Baseline; MDN flags it as unavailable in some widely-used browsers as of 2026 | `new Date(year, month, 0).getDate()` for days-in-month; `new Date(year, month, 1).getDay()` for first-day offset |
| Cookie Store API | Baseline June 2025 means older browser versions won't have it; async interface is unnecessary overhead for simple prefs | `document.cookie` with a small helper (parse/serialize) |
| External calendar libraries (FullCalendar, vanilla-calendar-pro) | This is a bespoke status-tracker, not a general event calendar; these libraries bring drag-drop, event rendering, and timezone logic that are dead weight here | Hand-rolled CSS Grid calendar |
| `sessionStorage` for data | Session storage is wiped when the tab closes; attendance data needs to survive browser restarts | `localStorage` |

## Stack Patterns by Variant

**If the JS file grows beyond ~300 lines:**
- Split into ES modules: `calendar.js`, `storage.js`, `ui.js`
- Import via `<script type="module" src="app.js">`
- No bundler needed; native module loading works in all 2025 browsers and on GitHub Pages

**If theming (light/dark mode) is added later:**
- Add `prefers-color-scheme` media query on top of existing custom properties
- Swap `--color-*` values in a `:root[data-theme="dark"]` selector
- No additional tooling needed

**If cookie parsing becomes repetitive:**
- Write a 15-line `getCookie(name)` / `setCookie(name, value, days)` helper inline in `app.js`
- Do NOT reach for `js-cookie` library — it's unnecessary at this scale

## Key Implementation Notes

### Calendar Math with `Date`

```js
// Days in a month (e.g., Feb 2025 = 28)
const daysInMonth = new Date(year, month + 1, 0).getDate();

// Day-of-week offset for grid-column-start (Sunday = 0)
const firstDayOffset = new Date(year, month, 1).getDay();
```

Month is 0-indexed in JavaScript's `Date` constructor. Document this clearly — it's the most common off-by-one bug in calendar implementations.

### localStorage Schema

```js
// Key per month: "attendance-2025-04"
// Value: JSON object mapping day number to status string
const key = `attendance-${year}-${String(month + 1).padStart(2, '0')}`;
const data = JSON.parse(localStorage.getItem(key) ?? '{}');
```

One key per month avoids loading and re-serializing the entire dataset on every write.

### Cookie Preferences Pattern

```js
function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict`;
}
```

`SameSite=Strict` is correct for a same-origin app with no cross-site requests. `path=/` ensures the cookie is readable from any path under the GitHub Pages URL.

### CSS Grid Calendar Core

```css
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

/* Day cell starts at correct column (JS sets this as inline style) */
.day-cell:first-of-type {
  /* grid-column-start set by JS: element.style.gridColumnStart = firstDayOffset + 1 */
}
```

### GitHub Pages Deployment

The repo is already at `BarristanSelmy/hybrid-attendance-tracker`. Steps:

1. Commit `index.html`, `style.css`, `app.js`, `.nojekyll` to `main`
2. GitHub Settings > Pages > Source: `main` branch, `/ (root)`
3. Site publishes at `https://barristanselmy.github.io/hybrid-attendance-tracker/`

No Actions workflow needed. GitHub Pages serves static files from the branch root automatically.

## Version Compatibility

No dependencies, so no version matrix needed. Browser baseline target:

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| CSS Grid | 57+ | 52+ | 10.1+ | 16+ |
| `localStorage` | All | All | All | All |
| `document.cookie` | All | All | All | All |
| ES2022 (`?.`, `??`, `class`) | 94+ | 93+ | 15+ | 94+ |
| CSS custom properties | 49+ | 31+ | 9.1+ | 15+ |

All features are universally supported in browsers released after 2021. No polyfills needed.

## Sources

- [MDN: Cookie Store API](https://developer.mozilla.org/en-US/docs/Web/API/Cookie_Store_API) — Baseline 2025 status, HTTPS requirement, browser support (HIGH confidence)
- [MDN: Temporal API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal) — "Not Baseline" status, polyfill requirement confirmed (HIGH confidence)
- [CSS-Tricks: A Calendar in Three Lines of CSS](https://css-tricks.com/a-calendar-in-three-lines-of-css/) — CSS Grid calendar layout pattern (HIGH confidence)
- [GitHub Docs: Configuring a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) — Branch root deployment, no-build detection (HIGH confidence)
- [Go Make Things: Working with cookies in vanilla JS](https://gomakethings.com/working-with-cookies-in-vanilla-js/) — `document.cookie` parse/serialize patterns (MEDIUM confidence)
- [WebSearch: `.nojekyll` requirement](https://michaelcurrin.github.io/gh-pages-no-jekyll/about.html) — Required to bypass Jekyll underscore-file filtering (HIGH confidence)
- [WebSearch: localStorage vs cookies](https://www.permit.io/blog/cookies-vs-local-storage) — Storage strategy for data vs. preferences (MEDIUM confidence)

---
*Stack research for: Static hybrid attendance tracker (vanilla HTML/CSS/JS, GitHub Pages)*
*Researched: 2026-04-13*
