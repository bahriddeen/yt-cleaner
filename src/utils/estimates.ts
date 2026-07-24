/**
 * Estimation model for "time saved".
 *
 * We cannot know how long a user *would* have scrolled, so time saved is an
 * explicit, documented estimate rather than a hidden magic number. On days the
 * limit is reached we assume the user would otherwise have kept scrolling for
 * an additional fraction of their limit. Constants live here so the model is
 * transparent and tunable in one place.
 */

/** Estimated seconds a person spends dwelling on a single post/reel. */
export const AVG_SECONDS_PER_VIEW = 9;

/**
 * On a day the limit is reached, the estimated *extra* views the user would
 * have consumed had they not been stopped, expressed as a multiple of the
 * limit. 0.75 == "you'd likely have scrolled ~75% more before stopping".
 */
export const OVERFLOW_FACTOR = 0.75;

/** Estimated time saved (ms) for a single day. */
export function dayTimeSavedMs(limitReached: boolean, limit: number): number {
  if (!limitReached) return 0;
  const avoidedViews = limit * OVERFLOW_FACTOR;
  return avoidedViews * AVG_SECONDS_PER_VIEW * 1000;
}
