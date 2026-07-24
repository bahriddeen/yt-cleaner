import { describe, expect, it, vi, afterEach } from 'vitest';
import type { DayRollup } from '@/types';
import { computeStreaks, dayWasKept } from './streak';
import { emptyByType } from '@/storage/defaults';

function day(date: string, totalViews: number, limit = 50, overrideCount = 0): DayRollup {
  return {
    date,
    platform: 'instagram',
    totalViews,
    byType: emptyByType(),
    timeOnPlatformMs: 0,
    sessionCount: 0,
    longestSessionMs: 0,
    limitReached: totalViews >= limit,
    limit,
    overrideCount,
  };
}

afterEach(() => vi.useRealTimers());

describe('dayWasKept', () => {
  it('is kept when under the limit with no overrides', () => {
    expect(dayWasKept({ totalViews: 30, limit: 50, overrideCount: 0 })).toBe(true);
  });
  it('is kept exactly at the limit', () => {
    expect(dayWasKept({ totalViews: 50, limit: 50, overrideCount: 0 })).toBe(true);
  });
  it('is broken by an override', () => {
    expect(dayWasKept({ totalViews: 20, limit: 50, overrideCount: 1 })).toBe(false);
  });
  it('is broken by exceeding the limit', () => {
    expect(dayWasKept({ totalViews: 60, limit: 50, overrideCount: 0 })).toBe(false);
  });
});

describe('computeStreaks', () => {
  it('counts consecutive kept days ending today', () => {
    vi.setSystemTime(new Date(2026, 6, 24, 12));
    const history = [
      day('2026-07-22', 10),
      day('2026-07-23', 20),
      day('2026-07-24', 30),
    ];
    const { current, best } = computeStreaks(history);
    expect(current).toBe(3);
    expect(best).toBe(3);
  });

  it('resets the current streak after a broken day', () => {
    vi.setSystemTime(new Date(2026, 6, 24, 12));
    const history = [
      day('2026-07-21', 10),
      day('2026-07-22', 90), // broke it
      day('2026-07-23', 20),
      day('2026-07-24', 30),
    ];
    const { current, best } = computeStreaks(history);
    expect(current).toBe(2);
    expect(best).toBe(2);
  });

  it('allows the streak to end yesterday when today has no data', () => {
    vi.setSystemTime(new Date(2026, 6, 24, 9));
    const history = [day('2026-07-22', 10), day('2026-07-23', 20)];
    expect(computeStreaks(history).current).toBe(2);
  });

  it('breaks the streak on a missing (gap) day', () => {
    vi.setSystemTime(new Date(2026, 6, 24, 12));
    const history = [
      day('2026-07-20', 10),
      // 21st missing entirely
      day('2026-07-22', 20),
      day('2026-07-23', 20),
      day('2026-07-24', 20),
    ];
    expect(computeStreaks(history).current).toBe(3);
  });
});
