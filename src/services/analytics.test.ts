import { describe, expect, it } from 'vitest';
import type { DayRollup, PlatformDay, Session } from '@/types';
import {
  computeStatistics,
  rollupFromPlatformDay,
  sessionDuration,
  totalSessionTime,
} from './analytics';
import { emptyByType } from '@/storage/defaults';

const NOW = new Date(2026, 6, 24, 12).getTime();
const DATE = '2026-07-24';

function session(startOffset: number, durationMs: number | null, views = 0): Session {
  const startedAt = NOW - startOffset;
  return {
    id: `s${startOffset}`,
    startedAt,
    endedAt: durationMs === null ? null : startedAt + durationMs,
    viewedCount: views,
    lastActiveAt: durationMs === null ? NOW : startedAt + durationMs,
  };
}

function day(overrides: Partial<PlatformDay> = {}): PlatformDay {
  return {
    viewedCount: 0,
    byType: emptyByType(),
    countedIds: [],
    sessions: [],
    unlocks: [],
    limitReached: false,
    notifiedThresholds: [],
    ...overrides,
  };
}

describe('sessionDuration', () => {
  it('measures closed sessions', () => {
    expect(sessionDuration(session(60_000, 30_000), NOW)).toBe(30_000);
  });
  it('measures open sessions up to now', () => {
    expect(sessionDuration(session(60_000, null), NOW)).toBe(60_000);
  });
});

describe('totalSessionTime', () => {
  it('sums multiple sessions', () => {
    const sessions = [session(120_000, 30_000), session(60_000, 20_000)];
    expect(totalSessionTime(sessions, NOW)).toBe(50_000);
  });
});

describe('rollupFromPlatformDay', () => {
  it('summarises the day including longest session', () => {
    const d = day({
      viewedCount: 12,
      byType: { feed: 8, reel: 4, story: 0 },
      sessions: [session(600_000, 300_000, 8), session(120_000, 60_000, 4)],
    });
    const rollup = rollupFromPlatformDay(d, 'instagram', DATE, 50, NOW);
    expect(rollup.platform).toBe('instagram');
    expect(rollup.totalViews).toBe(12);
    expect(rollup.sessionCount).toBe(2);
    expect(rollup.longestSessionMs).toBe(300_000);
    expect(rollup.timeOnPlatformMs).toBe(360_000);
    expect(rollup.limit).toBe(50);
  });
});

describe('computeStatistics', () => {
  const history: DayRollup[] = [
    {
      date: '2026-07-23',
      platform: 'instagram',
      totalViews: 40,
      byType: { feed: 40, reel: 0, story: 0 },
      timeOnPlatformMs: 600_000,
      sessionCount: 2,
      longestSessionMs: 400_000,
      limitReached: false,
      limit: 50,
      overrideCount: 0,
    },
    // A different platform's day that must NOT leak into instagram stats.
    {
      date: '2026-07-23',
      platform: 'x',
      totalViews: 999,
      byType: { feed: 999, reel: 0, story: 0 },
      timeOnPlatformMs: 1,
      sessionCount: 1,
      longestSessionMs: 1,
      limitReached: true,
      limit: 100,
      overrideCount: 0,
    },
  ];

  it('includes today derived from live state and filters by platform', () => {
    const today = day({
      viewedCount: 10,
      byType: { feed: 6, reel: 4, story: 0 },
      sessions: [session(300_000, 120_000, 10)],
    });
    const stats = computeStatistics(history, today, 'instagram', DATE, 50, NOW);
    expect(stats.platform).toBe('instagram');
    expect(stats.todayViews).toBe(10);
    expect(stats.weekViews).toBe(50); // 40 (ig history) + 10 today; x excluded
    expect(stats.dailySeries).toHaveLength(2);
  });

  it('averages sessions across history and today', () => {
    const today = day({ viewedCount: 6, sessions: [session(120_000, 60_000, 6)] });
    const stats = computeStatistics(history, today, 'instagram', DATE, 50, NOW);
    expect(stats.averageSessionMs).toBeCloseTo(660_000 / 3);
    expect(stats.longestSessionMs).toBe(400_000);
  });

  it('handles an empty history and empty state gracefully', () => {
    const stats = computeStatistics([], day(), 'youtube', DATE, 30, NOW);
    expect(stats.averageSessionMs).toBe(0);
    expect(stats.averageViewsPerSession).toBe(0);
    expect(stats.weekViews).toBe(0);
  });
});
