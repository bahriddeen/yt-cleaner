/**
 * Streak calculation.
 *
 * A day counts toward a streak when the user honoured their limit — i.e. they
 * either stayed under it, or hit it and let the block stand. Concretely: any
 * recorded day where views did not exceed the limit is a "kept" day. The
 * current streak counts consecutive kept days ending today (or yesterday, so a
 * streak isn't lost simply because today hasn't started).
 */
import type { DayRollup } from '@/types';
import { dayKeyDelta, localDateKey } from './date';

interface KeptDay {
  date: string;
  kept: boolean;
}

/** Whether a day honoured the limit. */
export function dayWasKept(day: {
  totalViews: number;
  limit: number;
  overrideCount: number;
}): boolean {
  // Honoured the limit: did not exceed it and did not override out of it.
  return day.totalViews <= day.limit && day.overrideCount === 0;
}

/**
 * Computes current and best streaks from historical rollups plus an optional
 * live "today" record.
 */
export function computeStreaks(
  history: DayRollup[],
  today?: { date: string; totalViews: number; limit: number; overrideCount: number },
): { current: number; best: number } {
  const map = new Map<string, KeptDay>();
  for (const d of history) {
    map.set(d.date, { date: d.date, kept: dayWasKept(d) });
  }
  if (today) {
    map.set(today.date, { date: today.date, kept: dayWasKept(today) });
  }

  const days = [...map.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  if (days.length === 0) return { current: 0, best: 0 };

  // Best streak: longest run of consecutive kept days.
  let best = 0;
  let run = 0;
  let prevDate: string | null = null;
  for (const day of days) {
    const consecutive = prevDate !== null && dayKeyDelta(day.date, prevDate) === 1;
    if (day.kept) {
      run = consecutive ? run + 1 : 1;
    } else {
      run = 0;
    }
    best = Math.max(best, run);
    prevDate = day.date;
  }

  // Current streak: walk backward from today (or yesterday) while kept.
  const todayKey = localDateKey();
  let current = 0;
  let cursor = todayKey;
  // Allow the streak to "end" yesterday if today has no activity yet.
  if (!map.has(todayKey)) {
    cursor = shiftDay(todayKey, -1);
  }
  while (map.has(cursor) && map.get(cursor)!.kept) {
    current += 1;
    cursor = shiftDay(cursor, -1);
  }

  return { current, best };
}

function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + delta);
  return localDateKey(date);
}
