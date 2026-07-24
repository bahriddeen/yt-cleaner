/**
 * Alarm scheduling.
 *
 * Two alarms, both event-driven (no in-page polling):
 * - `midnight-reset` fires at the next local midnight to roll ALL platforms over
 *   even if every tab is closed. It reschedules itself for the next midnight.
 * - `maintenance` fires each minute to close idle sessions and re-evaluate
 *   override expiry per platform, keeping badges and any open overlay in sync.
 */
import { PLATFORMS } from '@/types';
import { nextLocalMidnightTimestamp } from '@/utils/date';
import { broadcast } from '@/services/messaging';
import { mutate, readStatus } from '../state-store';
import { reapStaleSessions } from './session';

const MIDNIGHT_ALARM = 'aperture:midnight-reset';
const MAINTENANCE_ALARM = 'aperture:maintenance';

/** (Re)schedules the midnight alarm for the next local midnight. */
export function scheduleMidnight(): void {
  chrome.alarms.create(MIDNIGHT_ALARM, {
    when: nextLocalMidnightTimestamp() + 1_000,
  });
}

/** Sets up all alarms. Safe to call on every worker startup. */
export function setupAlarms(): void {
  scheduleMidnight();
  chrome.alarms.create(MAINTENANCE_ALARM, { periodInMinutes: 1 });
}

/** Handles a fired alarm. */
export async function handleAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
  if (alarm.name === MIDNIGHT_ALARM) {
    // Any platform read triggers rollover of ALL platforms in the state-store.
    await readStatus(PLATFORMS[0]!);
    scheduleMidnight();
    return;
  }

  if (alarm.name === MAINTENANCE_ALARM) {
    for (const platform of PLATFORMS) {
      let overrideJustEnded = false;
      await mutate(platform, ({ day, now }) => {
        const hadActiveOverride = day.unlocks.some((u) => u.expiresAt > now);
        reapStaleSessions(day, now);
        const stillActive = day.unlocks.some((u) => u.expiresAt > now);
        overrideJustEnded =
          hadActiveOverride && !stillActive && day.limitReached;
      });
      if (overrideJustEnded) broadcast({ type: 'OVERRIDE_ENDED', platform });
    }
  }
}
