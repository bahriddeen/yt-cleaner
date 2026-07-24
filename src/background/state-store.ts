/**
 * The single write path for daily state.
 *
 * Every mutation flows through `mutate(platform, …)`, which (1) runs
 * exclusively via a mutex so concurrent tabs can't clobber each other,
 * (2) performs day rollover for ALL platforms if the local day changed,
 * (3) applies the caller's mutation to one platform's day, (4) persists, and
 * (5) broadcasts the new status. Badge updates are per-tab and handled by the
 * message router, so they live outside this shared path.
 */
import type { DailyState, LiveStatus, PlatformDay, Settings } from '@/types';
import { PLATFORMS, type Platform } from '@/types';
import { repository } from '@/storage/repository';
import { freshDailyState } from '@/storage/defaults';
import { rollupFromPlatformDay } from '@/services/analytics';
import { broadcast } from '@/services/messaging';
import { localDateKey } from '@/utils/date';
import { Mutex } from '@/utils/mutex';

const mutex = new Mutex();

/** Context handed to a mutation callback. */
export interface MutationContext {
  day: PlatformDay;
  platform: Platform;
  /** Local day key of the state being mutated. */
  date: string;
  settings: Settings;
  now: number;
}

/** Builds the immutable live-status snapshot for a platform. */
export function buildStatus(
  day: PlatformDay,
  platform: Platform,
  date: string,
  settings: Settings,
  now: number,
): LiveStatus {
  const cfg = settings.platforms[platform];
  const remaining = Math.max(0, cfg.dailyLimit - day.viewedCount);
  const activeUnlock = day.unlocks
    .filter((u) => u.expiresAt > now)
    .sort((a, b) => b.expiresAt - a.expiresAt)[0];
  const overrideActive = Boolean(activeUnlock);
  return {
    platform,
    date,
    viewedCount: day.viewedCount,
    limit: cfg.dailyLimit,
    remaining,
    limitReached: day.limitReached,
    blocked:
      cfg.enabled &&
      settings.blockAfterLimit &&
      day.limitReached &&
      !overrideActive,
    overrideActive,
    overrideExpiresAt: activeUnlock?.expiresAt ?? null,
    byType: { ...day.byType },
  };
}

/**
 * Archives the previous day (all platforms) into history and returns a fresh
 * state for today. Only archives platform-days that had activity.
 */
async function rollOver(
  previous: DailyState,
  settings: Settings,
  now: number,
): Promise<DailyState> {
  for (const platform of PLATFORMS) {
    const day = previous.platforms[platform];
    const hadActivity = day.viewedCount > 0 || day.sessions.length > 0;
    if (!hadActivity) continue;
    const closed: PlatformDay = {
      ...day,
      sessions: day.sessions.map((s) =>
        s.endedAt === null ? { ...s, endedAt: s.lastActiveAt } : s,
      ),
    };
    const rollup = rollupFromPlatformDay(
      closed,
      platform,
      previous.date,
      settings.platforms[platform].dailyLimit,
      now,
    );
    await repository.upsertHistory(rollup);
  }
  return freshDailyState(localDateKey(new Date(now)));
}

/**
 * Runs a mutation exclusively against one platform's day. Derived state
 * (`limitReached`) is recomputed here so callers can't forget it.
 */
export async function mutate(
  platform: Platform,
  mutator: (ctx: MutationContext) => void | Promise<void>,
): Promise<LiveStatus> {
  return mutex.runExclusive(async () => {
    const now = Date.now();
    const settings = await repository.getSettings();
    let state = await repository.getDailyState();

    const today = localDateKey(new Date(now));
    let didReset = false;
    if (state.date !== today) {
      state = await rollOver(state, settings, now);
      didReset = true;
    }

    const day = state.platforms[platform];
    await mutator({ day, platform, date: state.date, settings, now });

    day.limitReached = day.viewedCount >= settings.platforms[platform].dailyLimit;

    await repository.setDailyState(state);
    const status = buildStatus(day, platform, state.date, settings, now);

    broadcast(
      didReset
        ? { type: 'DAY_RESET', payload: status }
        : { type: 'STATUS_CHANGED', payload: status },
    );
    return status;
  });
}

/** Reads a platform's current status (still rolls over if the day is stale). */
export async function readStatus(platform: Platform): Promise<LiveStatus> {
  return mutate(platform, () => {
    /* no-op: mutate handles rollover */
  });
}
