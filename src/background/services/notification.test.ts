import { describe, expect, it } from 'vitest';
import type { LiveStatus } from '@/types';
import { crossedThresholds } from './notification';

function status(viewedCount: number, limit: number): LiveStatus {
  return {
    platform: 'instagram',
    date: '2026-07-24',
    viewedCount,
    limit,
    remaining: Math.max(0, limit - viewedCount),
    limitReached: viewedCount >= limit,
    blocked: false,
    overrideActive: false,
    overrideExpiresAt: null,
    byType: { feed: viewedCount, reel: 0, story: 0 },
  };
}

const THRESHOLDS = [50, 75, 90, 100];

describe('crossedThresholds', () => {
  it('fires thresholds at or below the current percentage', () => {
    expect(crossedThresholds(status(38, 50), THRESHOLDS, [])).toEqual([50, 75]);
  });

  it('does not re-fire already-fired thresholds', () => {
    expect(crossedThresholds(status(38, 50), THRESHOLDS, [50])).toEqual([75]);
  });

  it('returns empty below the lowest threshold', () => {
    expect(crossedThresholds(status(10, 50), THRESHOLDS, [])).toEqual([]);
  });

  it('fires 100 when the limit is reached', () => {
    expect(crossedThresholds(status(50, 50), THRESHOLDS, [50, 75, 90])).toEqual([
      100,
    ]);
  });

  it('returns thresholds sorted ascending', () => {
    const result = crossedThresholds(status(50, 50), THRESHOLDS, []);
    expect(result).toEqual([50, 75, 90, 100]);
  });
});
