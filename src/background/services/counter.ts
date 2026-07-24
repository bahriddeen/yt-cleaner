/**
 * CounterService: the domain operations that change a platform's daily counter.
 *
 * All mutations go through the state-store's `mutate()`, so this module never
 * touches storage directly — it only expresses *what* changes for which platform.
 */
import type { ContentType, LiveStatus, Settings, ViewObservation } from '@/types';
import type { Platform } from '@/types';
import { emptyByType } from '@/storage/defaults';
import { broadcast } from '@/services/messaging';
import { shortId } from '@/utils/id';
import { buildStatus, mutate, readStatus } from '../state-store';
import { crossedThresholds, fireThresholdNotification } from './notification';
import { recordViewOnSession } from './session';

/** Whether counting is enabled for a content type on a platform. */
function typeEnabled(
  type: ContentType,
  platform: Platform,
  settings: Settings,
): boolean {
  const cfg = settings.platforms[platform];
  return cfg.enabled && cfg.countSurfaces.includes(type);
}

export const counterService = {
  /**
   * Records a single observed view for a platform. De-duplicates by content id,
   * respects per-surface toggles, updates the active session, and fires
   * threshold notifications + a LIMIT_REACHED broadcast exactly once.
   */
  async recordView(obs: ViewObservation): Promise<LiveStatus> {
    let firedThresholds: number[] = [];
    let settingsSnapshot: Settings | null = null;
    let newlyReachedLimit = false;

    const status = await mutate(obs.platform, ({ day, platform, date, settings, now }) => {
      settingsSnapshot = settings;

      if (!typeEnabled(obs.type, platform, settings)) return;
      if (day.countedIds.includes(obs.contentId)) return;

      const limit = settings.platforms[platform].dailyLimit;
      const wasReached = day.viewedCount >= limit;

      day.countedIds.push(obs.contentId);
      day.viewedCount += 1;
      day.byType[obs.type] += 1;
      recordViewOnSession(day, now);

      newlyReachedLimit = !wasReached && day.viewedCount >= limit;

      const provisional = buildStatus(day, platform, date, settings, now);
      const toFire = crossedThresholds(
        provisional,
        settings.notifyThresholds,
        day.notifiedThresholds,
      );
      if (toFire.length > 0) {
        day.notifiedThresholds.push(...toFire);
        firedThresholds = toFire;
      }
    });

    if (settingsSnapshot) {
      for (const t of firedThresholds) {
        fireThresholdNotification(t, status, settingsSnapshot);
      }
    }
    if (newlyReachedLimit) {
      broadcast({ type: 'LIMIT_REACHED', payload: status });
    }
    return status;
  },

  getStatus(platform: Platform): Promise<LiveStatus> {
    return readStatus(platform);
  },

  /** Grants a temporary override that suspends blocking for a while. */
  async grantOverride(platform: Platform): Promise<LiveStatus> {
    return mutate(platform, ({ day, settings, now }) => {
      const durationMs = settings.overrideMinutes * 60_000;
      day.unlocks.push({
        id: shortId('unlock'),
        grantedAt: now,
        expiresAt: now + durationMs,
        durationMinutes: settings.overrideMinutes,
      });
    });
  },

  /** Resets a platform's view counter to zero, preserving sessions & history. */
  async resetToday(platform: Platform): Promise<LiveStatus> {
    return mutate(platform, ({ day }) => {
      day.viewedCount = 0;
      day.byType = emptyByType();
      day.countedIds = [];
      day.limitReached = false;
      day.notifiedThresholds = [];
      day.unlocks = [];
    });
  },
};
