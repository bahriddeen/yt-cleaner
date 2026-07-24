import { describe, expect, it } from 'vitest';
import {
  dayKeyDelta,
  formatCountdown,
  isSameLocalDay,
  localDateKey,
  msUntilNextLocalMidnight,
  parseKey,
} from './date';

describe('localDateKey', () => {
  it('formats a date as YYYY-MM-DD in local time', () => {
    const d = new Date(2026, 6, 24, 15, 30); // 24 Jul 2026, local
    expect(localDateKey(d)).toBe('2026-07-24');
  });

  it('zero-pads month and day', () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('msUntilNextLocalMidnight', () => {
  it('returns time until the next local midnight', () => {
    const at = new Date(2026, 6, 24, 23, 0, 0); // 23:00
    expect(msUntilNextLocalMidnight(at)).toBe(60 * 60 * 1000);
  });

  it('is a full day just after midnight', () => {
    const at = new Date(2026, 6, 24, 0, 0, 0);
    expect(msUntilNextLocalMidnight(at)).toBe(24 * 60 * 60 * 1000);
  });
});

describe('isSameLocalDay', () => {
  it('recognises timestamps on the same day', () => {
    const a = new Date(2026, 6, 24, 1).getTime();
    const b = new Date(2026, 6, 24, 23).getTime();
    expect(isSameLocalDay(a, b)).toBe(true);
  });

  it('separates adjacent days', () => {
    const a = new Date(2026, 6, 24, 23, 59).getTime();
    const b = new Date(2026, 6, 25, 0, 1).getTime();
    expect(isSameLocalDay(a, b)).toBe(false);
  });
});

describe('dayKeyDelta', () => {
  it('computes whole-day differences', () => {
    expect(dayKeyDelta('2026-07-25', '2026-07-24')).toBe(1);
    expect(dayKeyDelta('2026-07-24', '2026-07-25')).toBe(-1);
    expect(dayKeyDelta('2026-08-01', '2026-07-31')).toBe(1);
  });
});

describe('parseKey', () => {
  it('round-trips with localDateKey', () => {
    expect(localDateKey(parseKey('2026-07-24'))).toBe('2026-07-24');
  });
});

describe('formatCountdown', () => {
  it('formats hours and minutes', () => {
    expect(formatCountdown(8 * 3600_000 + 17 * 60_000)).toBe('08h 17m');
  });

  it('drops to minutes/seconds under an hour', () => {
    expect(formatCountdown(3 * 60_000 + 5_000)).toBe('03m 05s');
  });

  it('clamps negatives to zero', () => {
    expect(formatCountdown(-1000)).toBe('00h 00m');
  });
});
