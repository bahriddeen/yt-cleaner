/** Presentation helpers for numbers and durations. */

/** Human-friendly duration, e.g. `1h 24m`, `3m`, `12s`, `0m`. */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0m';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

/**
 * Duration split into value/unit pairs for large typographic displays.
 * e.g. 5_400_000 → `[{ value: 1, unit: 'h' }, { value: 30, unit: 'm' }]`.
 */
export function durationParts(ms: number): { value: number; unit: string }[] {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return [
      { value: hours, unit: 'h' },
      { value: minutes, unit: 'm' },
    ];
  }
  return [{ value: minutes, unit: 'm' }];
}

/** Compact number, e.g. `1.2k`, `18`. */
export function formatCompact(n: number): string {
  return new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
}

/** Clamps a number into an inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Ratio (0–1) of used against a limit, guarding divide-by-zero. */
export function ratio(used: number, limit: number): number {
  if (limit <= 0) return used > 0 ? 1 : 0;
  return clamp(used / limit, 0, 1);
}
