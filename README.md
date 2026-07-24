# Aperture — Daily Limit for Instagram, X & YouTube

A premium Manifest V3 browser extension that helps you reduce doom-scrolling by
limiting how many **posts, reels and shorts you actually view** each day across
**Instagram, X (Twitter) and YouTube**. Each platform has its own daily limit;
when you reach it, that site is replaced by a calm, full-screen block screen
until the next local midnight — unless you intentionally take a short override.

Built to feel like a product from Arc, Raycast, Linear or Notion — not a
typical browser extension.

<p align="center">
  <em>3 platforms · true "viewed" counting · per-site limits &amp; streaks ·
  optional cleaner · analytics · glassmorphic UI · light/dark · six accents</em>
</p>

---

## Platforms & what counts

| Platform | Counts | Cleaner (optional hide) |
| --- | --- | --- |
| **Instagram** | Feed posts + Reels (Stories experimental) | Reels tab, Explore tab |
| **X** (x.com / twitter.com) | All timeline posts | Trends & who-to-follow, Explore |
| **YouTube** | Shorts | Shorts everywhere, home feed, comments, related |

## Highlights

- **Per-platform limits.** Instagram, X and YouTube each get their own daily
  limit, counter, streak, statistics and block screen. The toolbar badge shows
  the remaining count for whichever platform's tab you're on.
- **Counts what you actually view**, not scroll events. An item counts only
  after it is ≥ 60% visible for ≥ 1 continuous second, and never counts twice.
- **Optional cleaner** (inspired by yt-cleaner): per-platform toggles to hide
  Shorts, recommendation feeds, comments and sidebars entirely — instant, no
  reload.
- **Full-screen block overlay** with an animated aurora, a large progress ring,
  a live reset countdown and a considered override flow — no ugly modals, no
  `alert()`.
- **SaaS-style popup dashboard** with a platform switcher: circular progress,
  time saved, streak, time on site today, reset countdown and quick actions.
- **Complete settings dashboard**: per-platform limits + surfaces + cleaner,
  blocking behaviour, notifications, theme + accent, per-platform statistics
  with charts, and export/import.
- **Local, private, event-driven.** All data lives in `chrome.storage.local`.
  No servers, no tracking. Observers over polling; midnight reset via
  `chrome.alarms` even when every tab is closed.

## Tech stack

Manifest V3 · TypeScript (strict) · React 18 · Vite 6 · Tailwind CSS ·
Framer Motion · Recharts · `@crxjs/vite-plugin` · Chrome Storage / Alarms /
Runtime / Notifications · IntersectionObserver · MutationObserver.

> **On shadcn/ui:** the component layer follows shadcn's conventions (the `cn`
> helper, `cva` variants, the same component API) but the primitives are
> hand-written with native ARIA semantics instead of pulling in Radix. This
> keeps the dependency surface small and the accessibility behaviour fully under
> our control, in line with the project's "no unnecessary dependencies" rule.

---

## Install & run (unpacked)

```bash
npm install
npm run build          # type-checks, then builds to dist/
```

Then load it in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select the generated `dist/` folder
4. Open [instagram.com](https://www.instagram.com) and start scrolling

### Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server with HMR for the extension |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Run the Vitest unit suite |
| `npm run preview:ui` | Design harness — renders the popup, options and block screen in a normal browser tab with a mocked `chrome.*` (see `preview/`) |
| `node scripts/generate-icons.mjs` | Regenerate the PNG app icons |

The **UI preview** (`npm run preview:ui`, then open `http://localhost:5199`)
renders each surface with realistic sample data. Append `?surface=popup`,
`?surface=options` or `?surface=overlay` to view a single screen.

---

## Architecture

Four runtime contexts communicate over typed `chrome.runtime` messages. The
**background service worker is the single source of truth** — content scripts
report observations, they never mutate counter state directly. This keeps two
open Instagram tabs perfectly consistent.

```
┌─────────── content script (instagram.com · x.com · youtube.com) ───────────────┐
│  PlatformAdapter · SpaRouter · ViewTracker (IO + MutationObserver) ·           │
│  Cleaner · OverlayHost (iframe) · DebugHud                                      │
│              │ VIEW_OBSERVED / SESSION_* messages (carry platform)              │
└────────────────────────┼───────────────────────────────────────────────────────┘
                         ▼
┌──────────────────── background service worker (source of truth) ───────────────┐
│  state-store (mutex + rollover) → CounterService · SessionService ·            │
│  BadgeService · NotificationService · AlarmService · data-io                   │
│  repository → chrome.storage.local                                             │
└────────────────────────┬───────────────────────────────────────────────────────┘
             storage.onChanged / broadcasts │
     ┌───────────────────┬──────────────────┴───────────┐
     ▼                   ▼                               ▼
   Popup               Options                      Block overlay
 (dashboard)          (settings)                    (React, in iframe)
```

### Directory layout

```
src/
  background/          service worker + state-store (single write path)
    services/          counter, session, badge, notification, alarm, data-io
  content/             tracker, spa-router, overlay-host, cleaner, debug-hud
    platforms/         instagram / x / youtube adapters + registry
  overlay/             full-screen block screen (React)
  popup/               SaaS dashboard with platform switcher (React)
  options/             settings dashboard (React)
  components/          ProgressRing, StatCard, PlatformSwitcher, charts, ui/ …
  config/              per-platform surfaces + limit ranges
  hooks/               useSettings, useStatus, useAllStatus, useStatistics, …
  services/            typed messaging bus, analytics (pure)
  storage/             schema, defaults, typed repository
  theme/               design tokens (globals.css) + ThemeProvider
  types/               domain, platform, message protocol
  utils/               date, format, streak, estimates, mutex, …
```

Every module has one responsibility; UI is separated from business logic; the
analytics and counting logic is pure and unit-tested.

---

## How detection works

Each platform is a single-page app with obfuscated, ever-changing class names,
so Aperture deliberately **never selects by CSS class**. Each platform's brittle
DOM knowledge is isolated in a small **adapter** under
`src/content/platforms/`; the tracker and cleaner are otherwise
platform-agnostic, so supporting a new site means adding one adapter.

- **Anchors on stable semantics.** Instagram: `<article>` (feed) / `<video>`
  (reels). X: `article[data-testid="tweet"]`. YouTube: `ytd-reel-video-renderer`
  on the `/shorts/…` route.
- **Stable content ids** come from permalinks (`/p/…`, `/reel/…`, `/status/…`,
  `/shorts/…`), which survive re-renders and scroll-back — the key to never
  double-counting. When no permalink exists, a stable per-element fallback id is
  assigned via a `WeakMap`.
- **"Actually viewed"** is enforced with a single shared `IntersectionObserver`
  plus a per-element dwell timer: an item must stay ≥ 60% visible for ≥ 1s. Scroll
  past quickly and it never counts.
- **Infinite scroll** is handled by one debounced `MutationObserver` that
  registers newly-loaded items. Observers are `disconnect()`-ed on teardown and
  re-scanned on SPA navigation — no polling, no leaks.
- **Cleaner.** Each adapter also declares hide targets (CSS); the cleaner injects
  one `<style>` for the enabled targets, toggled instantly with no reload.

Because these DOMs shift over time, enable **Debug Mode** (Settings → Advanced)
to see a live on-page HUD of the current platform, route, counted total and
recent detection events, then tune the relevant adapter if needed.

### Daily reset

The current day lives in `dailyState`; at local midnight a `chrome.alarms` job
archives it into `history` (updating streaks) and starts a fresh day. If the
worker was asleep, the next interaction performs the same rollover lazily, so the
reset is never missed.

---

## Settings

**General** — per-platform (switcher): enable tracking, daily limit, which
surfaces count, and the cleaner's hide toggles.
**Behavior** — block after limit, blur background, motivational message, confirm
before override, override length, notifications + thresholds, sound (global).
**Appearance** — light / dark / system, and six accent colours.
**Statistics** — per-platform (switcher): KPIs, week/month charts, split chart,
export JSON / import settings.
**Advanced** — Debug Mode and a guarded "reset all data".

## Analytics & "time saved"

Time saved is an **explicit, documented estimate** (see
`src/utils/estimates.ts`), not a hidden number: on days you hit the limit we
assume you'd otherwise have scrolled `OVERFLOW_FACTOR` more, at
`AVG_SECONDS_PER_VIEW` each. Tune both constants in one place.

## Accessibility

Keyboard-operable controls (switches, sliders, tabs, segmented groups with arrow
keys), ARIA roles throughout, focus-visible rings, `prefers-reduced-motion`
support (entrance animations use CSS fill-mode so nothing is ever stuck hidden),
and `forced-colors` high-contrast handling.

## Privacy

100% local. Host permissions are scoped to the three supported sites only
(`instagram.com`, `x.com` / `twitter.com`, `youtube.com`). No analytics, no
network calls, no accounts.

## Testing

```bash
npm run test
```

Vitest covers the pure logic that matters: local-midnight date math, streak
calculation, statistics/rollup derivation, notification-threshold crossing, the
time-saved model, and DOM-based content-id extraction.

## License

MIT
