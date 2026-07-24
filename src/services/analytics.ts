/**
 * Analytics: pure derivations over stored data, per platform.
 *
 * Everything here is a pure function of its inputs (no `chrome.*`, no clock
 * except an injectable `now`), which makes the whole module unit-testable.
 */
import type { DayRollup, PlatformDay, Session, Statistics } from '@/types';
import type { Platform } from '@/types';
import { emptyByType } from '@/storage/defaults';
import { dateKeyDaysAgo } from '@/utils/date';
import { dayTimeSavedMs } from '@/utils/estimates';
import { computeStreaks } from '@/utils/streak';

/** Duration of a session; open sessions are measured up to `now`. */
export function sessionDuration(session: Session, now: number): number {
  const end = session.endedAt ?? now;
  return Math.max(0, end - session.startedAt);
}

/** Total measured time across a list of sessions. */
export function totalSessionTime(sessions: Session[], now: number): number {
  return sessions.reduce((sum, s) => sum + sessionDuration(s, now), 0);
}

/**
 * Builds an immutable day rollup from a platform's live day state. Used both
 * for end-of-day archival and for including "today" in analytics.
 */
export function rollupFromPlatformDay(
  day: PlatformDay,
  platform: Platform,
  date: string,
  limit: number,
  now: number,
): DayRollup {
  const longest = day.sessions.reduce(
    (max, s) => Math.max(max, sessionDuration(s, now)),
    0,
  );
  return {
    date,
    platform,
    totalViews: day.viewedCount,
    byType: { ...day.byType },
    timeOnPlatformMs: totalSessionTime(day.sessions, now),
    sessionCount: day.sessions.length,
    longestSessionMs: longest,
    limitReached: day.limitReached,
    limit,
    overrideCount: day.unlocks.length,
  };
}

/** Sums the views of rollups whose date is within the last `days` days. */
function viewsWithin(days: number, rollups: DayRollup[], now: number): number {
  const cutoff = dateKeyDaysAgo(days - 1, new Date(now));
  return rollups
    .filter((r) => r.date >= cutoff)
    .reduce((sum, r) => sum + r.totalViews, 0);
}

/**
 * Computes statistics for a single platform from history and its live day.
 * `history` may contain all platforms; it is filtered here. Today is derived
 * from `day` (history should not already contain today for this platform).
 */
export function computeStatistics(
  history: DayRollup[],
  day: PlatformDay,
  platform: Platform,
  date: string,
  limit: number,
  now: number = Date.now(),
): Statistics {
  const platformHistory = history.filter((r) => r.platform === platform);
  const todayRollup = rollupFromPlatformDay(day, platform, date, limit, now);

  const merged = new Map<string, DayRollup>();
  for (const r of platformHistory) merged.set(r.date, r);
  merged.set(todayRollup.date, todayRollup);
  const series = [...merged.values()].sort((a, b) => (a.date < b.date ? -1 : 1));

  const totalSessions = series.reduce((s, r) => s + r.sessionCount, 0);
  const totalTime = series.reduce((s, r) => s + r.timeOnPlatformMs, 0);
  const totalViews = series.reduce((s, r) => s + r.totalViews, 0);
  const longest = series.reduce((m, r) => Math.max(m, r.longestSessionMs), 0);
  const timeSaved = series.reduce(
    (s, r) => s + dayTimeSavedMs(r.limitReached, r.limit),
    0,
  );

  const { current, best } = computeStreaks(platformHistory, {
    date: todayRollup.date,
    totalViews: todayRollup.totalViews,
    limit: todayRollup.limit,
    overrideCount: todayRollup.overrideCount,
  });

  return {
    platform,
    todayViews: todayRollup.totalViews,
    weekViews: viewsWithin(7, series, now),
    monthViews: viewsWithin(30, series, now),
    averageSessionMs: totalSessions > 0 ? totalTime / totalSessions : 0,
    longestSessionMs: longest,
    averageViewsPerSession: totalSessions > 0 ? totalViews / totalSessions : 0,
    timeSavedMs: timeSaved,
    currentStreak: current,
    bestStreak: best,
    dailySeries: series,
  };
}

/** Returns a zero-filled 7-day series ending today, for empty-state charts. */
export function emptyWeekSeries(
  platform: Platform,
  now: number = Date.now(),
): DayRollup[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = dateKeyDaysAgo(6 - i, new Date(now));
    return {
      date,
      platform,
      totalViews: 0,
      byType: emptyByType(),
      timeOnPlatformMs: 0,
      sessionCount: 0,
      longestSessionMs: 0,
      limitReached: false,
      limit: 0,
      overrideCount: 0,
    };
  });
}
