/**
 * Cross-platform content-tracking constants. Platform-specific selectors live
 * in each adapter under `content/platforms/`.
 */

/** Dwell/visibility thresholds that define an "actually viewed" item. */
export const VIEW_RULES = {
  /** Fraction of the element that must be visible. */
  visibilityRatio: 0.6,
  /** Continuous milliseconds it must remain visible to count. */
  dwellMs: 1000,
} as const;

/** IntersectionObserver thresholds — a spread so we get crossing callbacks. */
export const IO_THRESHOLDS = [0, 0.3, 0.6, 0.9, 1] as const;

/** A video occupying at least this fraction of the viewport is a short/reel. */
export const REEL_VIEWPORT_FRACTION = 0.55;

/** Debounce (ms) for coalescing MutationObserver bursts. */
export const MUTATION_DEBOUNCE_MS = 250;

/** How often the content script sends a session heartbeat. */
export const HEARTBEAT_INTERVAL_MS = 30_000;
