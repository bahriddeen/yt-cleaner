# Architecture

This document explains the design decisions behind Aperture and the challenges
of tracking Instagram reliably. For usage, see the [README](../README.md).

## Principles

1. **Single source of truth.** The background service worker is the only writer
   of counter state. Content scripts and UIs *report* and *request*; they never
   mutate shared state directly. This makes multi-tab behaviour correct by
   construction and removes "global state spaghetti".
2. **Observers over polling.** All detection is event-driven
   (`IntersectionObserver`, `MutationObserver`, `chrome.alarms`,
   `storage.onChanged`). Nothing polls, keeping CPU near zero when idle.
3. **Pure business logic.** Counting, streaks, analytics, date math and the
   time-saved model are pure functions with no `chrome.*` dependency, so they
   are fully unit-testable and easy to reason about.
4. **One responsibility per module.** Files stay small and focused; UI is
   separated from logic; brittle Instagram specifics are quarantined in one
   config file.

## Multi-platform model

Aperture tracks Instagram, X and YouTube independently. State is keyed by
platform end to end:

- `Settings.platforms[platform]` — enabled, daily limit, counted surfaces, and
  the cleaner's hidden targets.
- `DailyState.platforms[platform]` — that platform's counter, sessions, unlocks
  and dedup set for today.
- `DayRollup` carries a `platform`; history holds one rollup per (day, platform).
- Every counter-touching message carries an explicit `platform`, and `LiveStatus`
  reports which platform it describes. The toolbar badge is set **per tab**,
  keyed to that tab's platform.

A content **adapter** (`content/platforms/<site>.ts`) encapsulates each site's
DOM specifics; the tracker, cleaner and background are otherwise
platform-agnostic. Adding a platform = one adapter + one settings default.

## The write path

Every state change flows through `background/state-store.ts`:

```
mutate(platform, mutator) →
  mutex.runExclusive(async () => {
    load settings + dailyState
    if day changed → archive ALL platforms into history, start fresh day
    mutator(ctx)                 // change one platform's day
    recompute derived (limitReached)
    persist dailyState
    broadcast(STATUS_CHANGED | DAY_RESET)   // carries the platform's status
  })
```

The **mutex** serialises concurrent messages (e.g. two tabs reporting a view at
once) so a read-modify-write can never be clobbered. **Rollover inside
`mutate`** means the daily reset is correct even if the alarm never fired
because the worker was asleep — the next interaction lazily rolls the day over.
Badge updates are per-tab and live in the message router (outside this shared
path) because a badge belongs to a tab, not to the global write path.

## Messaging protocol

`types/messages.ts` defines a discriminated union of requests and a response map
keyed by request type. `services/messaging.ts` infers the response type from the
request, so every call site is fully typed with no casts:

```ts
const status = await sendMessage({ type: 'VIEW_OBSERVED', payload });
//    ^? LiveStatus
```

Background → listeners updates use best-effort broadcasts
(`STATUS_CHANGED`, `LIMIT_REACHED`, `DAY_RESET`, `OVERRIDE_ENDED`); UIs also
subscribe to `storage.onChanged`, so they stay live without polling.

## The hard part: shifting DOM & SPA (three sites)

| Challenge | Approach |
| --- | --- |
| Obfuscated, unstable class names | Never select by class. Anchor on stable semantics per platform (`<article>`, `article[data-testid="tweet"]`, `ytd-reel-video-renderer`) and permalink hrefs. Each platform's specifics live in its adapter under `content/platforms/`. |
| "Actually viewed", not scrolled | Shared `IntersectionObserver` arms a dwell timer when an item is ≥ 60% visible; the item counts only if it stays visible ≥ 1s. Leaving early cancels the timer. |
| No double counting | Stable content id from the permalink shortcode; counted ids kept in a `Set` (per page) and persisted in `dailyState.countedIds` (across reloads). Scroll-back never recounts. |
| Infinite scroll | One debounced `MutationObserver` registers newly-added items with the shared observer. |
| SPA navigation (no reloads) | `history.pushState`/`replaceState` are patched to emit a `locationchange` event; on route change the tracker cancels pending dwells and rescans, and the overlay re-evaluates. |
| Performance / leaks | Exactly one IO and one MO; both `disconnect()`-ed on teardown; dwell timers cleared; counted items are un-observed. |
| Unknown future DOM | Debug Mode renders an on-page HUD to calibrate detection against the live page without a rebuild. |

## The block overlay

Rendered by a React app served from an extension page and embedded in a
full-viewport **iframe**. The iframe fully isolates the overlay's styles from
Instagram (no bleed either way) and gives it real `chrome.*` access. The
content-side `OverlayHost` only manages presence: it mounts/unmounts the iframe,
blurs and scroll-locks the page behind it, and bridges the one action that must
touch the top page (leaving Instagram) via `postMessage`.

## Data model (`chrome.storage.local`)

- `settings` — user preferences incl. `platforms[...]` (merged over defaults on
  read, so new keys/platforms always resolve).
- `dailyState` — `{ date, platforms: { [platform]: PlatformDay } }`, where a
  `PlatformDay` is `{ viewedCount, byType, countedIds, sessions, unlocks,
  notifiedThresholds, limitReached }`.
- `history` — immutable `DayRollup[]` (one per day+platform; rolling 120-day
  window) powering per-platform charts and streaks.
- `meta` — schema version + install time (a version bump triggers a light
  migration that backfills new platforms/keys).

## Testing strategy

Pure logic is unit-tested with Vitest (`*.test.ts` next to the code): date/
midnight math, streak calculation, statistics derivation, notification-threshold
crossing, the time-saved estimate, and DOM content-id extraction (jsdom). The
UIs are verified visually through the `preview/` harness, which mounts the real
components against a mocked `chrome.*`.

## Notable trade-offs

- **Hand-written primitives instead of Radix/shadcn packages** — smaller
  dependency surface, full control of ARIA, at the cost of writing the a11y
  behaviour ourselves.
- **CSS entrance animations for staggered content** — immune to React remounts
  (a delayed JS-timed animation can leave an element stuck hidden if it
  remounts mid-delay), and cheaper. Framer Motion is reserved for layout
  transitions (animated pills, the progress ring, the overlay entrance).
- **1-minute maintenance alarm** — the minimum robust cadence to close idle
  sessions and expire overrides promptly; still event-driven, not polling.
