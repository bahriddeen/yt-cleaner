import { useEffect, useState } from 'react';
import { msUntilNextLocalMidnight } from '@/utils/date';

/**
 * Ticks the time remaining until the next local midnight (the daily reset).
 * Updates once per second; the interval is cleared on unmount.
 */
export function useCountdown(intervalMs = 1000): number {
  const [remaining, setRemaining] = useState(() => msUntilNextLocalMidnight());

  useEffect(() => {
    const tick = (): void => setRemaining(msUntilNextLocalMidnight());
    tick();
    const id = window.setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return remaining;
}
