/**
 * Local-time date helpers.
 *
 * All day boundaries in this extension are the user's LOCAL midnight, never
 * UTC. Using local time keeps the "resets at midnight" promise intuitive
 * regardless of timezone.
 */

/** Returns the local calendar day as `YYYY-MM-DD`. */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** A `Date` at 00:00:00.000 local time for the given day. */
export function startOfLocalDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Milliseconds from `from` until the next local midnight. */
export function msUntilNextLocalMidnight(from: Date = new Date()): number {
  const next = startOfLocalDay(from);
  next.setDate(next.getDate() + 1);
  return next.getTime() - from.getTime();
}

/** Timestamp (ms) of the next local midnight — used to schedule alarms. */
export function nextLocalMidnightTimestamp(from: Date = new Date()): number {
  return from.getTime() + msUntilNextLocalMidnight(from);
}

/** True when both timestamps fall on the same local calendar day. */
export function isSameLocalDay(a: number, b: number): boolean {
  return localDateKey(new Date(a)) === localDateKey(new Date(b));
}

/** The `YYYY-MM-DD` key `n` days before `date`. */
export function dateKeyDaysAgo(n: number, date: Date = new Date()): string {
  const d = new Date(date);
  d.setDate(d.getDate() - n);
  return localDateKey(d);
}

/** Difference in whole local days between two date keys (`a - b`). */
export function dayKeyDelta(a: string, b: string): number {
  const da = parseKey(a).getTime();
  const db = parseKey(b).getTime();
  return Math.round((da - db) / 86_400_000);
}

/** Parses a `YYYY-MM-DD` key into a local `Date` at midnight. */
export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/**
 * Formats a millisecond duration as a compact countdown, e.g. `08h 17m`.
 * Falls back to minutes/seconds when under an hour.
 */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00h 00m';
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${pad(hours)}h ${pad(minutes)}m`;
  }
  const seconds = Math.floor((ms % 60_000) / 1000);
  return `${pad(minutes)}m ${pad(seconds)}s`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Short weekday label for a date key, e.g. `Mon`. */
export function weekdayLabel(key: string): string {
  return parseKey(key).toLocaleDateString(undefined, { weekday: 'short' });
}

/** Short month/day label, e.g. `Jul 24`. */
export function monthDayLabel(key: string): string {
  return parseKey(key).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}
