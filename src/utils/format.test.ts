import { describe, expect, it } from 'vitest';
import { clamp, formatDuration, durationParts, ratio } from './format';
import { dayTimeSavedMs, AVG_SECONDS_PER_VIEW, OVERFLOW_FACTOR } from './estimates';

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(90 * 60_000)).toBe('1h 30m');
  });
  it('formats minutes only', () => {
    expect(formatDuration(5 * 60_000)).toBe('5m');
  });
  it('formats seconds under a minute', () => {
    expect(formatDuration(12_000)).toBe('12s');
  });
  it('returns 0m for non-positive input', () => {
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(-5)).toBe('0m');
  });
});

describe('durationParts', () => {
  it('splits into hours and minutes', () => {
    expect(durationParts(90 * 60_000)).toEqual([
      { value: 1, unit: 'h' },
      { value: 30, unit: 'm' },
    ]);
  });
  it('returns just minutes under an hour', () => {
    expect(durationParts(45 * 60_000)).toEqual([{ value: 45, unit: 'm' }]);
  });
});

describe('ratio', () => {
  it('computes a bounded ratio', () => {
    expect(ratio(25, 50)).toBe(0.5);
    expect(ratio(75, 50)).toBe(1);
  });
  it('guards divide-by-zero', () => {
    expect(ratio(0, 0)).toBe(0);
    expect(ratio(5, 0)).toBe(1);
  });
});

describe('clamp', () => {
  it('bounds values', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe('dayTimeSavedMs', () => {
  it('is zero when the limit was not reached', () => {
    expect(dayTimeSavedMs(false, 50)).toBe(0);
  });
  it('estimates saved time from the overflow model', () => {
    const expected = 50 * OVERFLOW_FACTOR * AVG_SECONDS_PER_VIEW * 1000;
    expect(dayTimeSavedMs(true, 50)).toBe(expected);
  });
});
