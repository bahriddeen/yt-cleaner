/**
 * Typed repository over `chrome.storage.local`.
 *
 * This is the ONLY module that touches `chrome.storage` directly. Every other
 * module reads and writes domain objects through these methods, so the storage
 * shape is enforced in exactly one place.
 */
import type { DailyState, DayRollup, Settings } from '@/types';
import type { DeepPartialSettings } from '@/types';
import { PLATFORMS, type Platform } from '@/types';
import {
  HISTORY_RETENTION_DAYS,
  StorageKeys,
  type StorageMeta,
  type StorageShape,
} from './schema';
import {
  DEFAULT_PLATFORM_SETTINGS,
  DEFAULT_SETTINGS,
  SCHEMA_VERSION,
  freshDailyState,
  freshPlatformDay,
} from './defaults';
import { dateKeyDaysAgo } from '@/utils/date';

async function getRaw<K extends keyof StorageShape>(
  key: K,
): Promise<StorageShape[K]> {
  const result = await chrome.storage.local.get(key);
  return result[key] as StorageShape[K];
}

async function setRaw(partial: Partial<StorageShape>): Promise<void> {
  await chrome.storage.local.set(partial);
}

/** Merges stored settings over defaults so new keys/platforms always resolve. */
function normalizeSettings(stored: Partial<Settings> | undefined): Settings {
  const base = { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
  const platforms = { ...DEFAULT_PLATFORM_SETTINGS };
  for (const p of PLATFORMS) {
    platforms[p] = {
      ...DEFAULT_PLATFORM_SETTINGS[p],
      ...(stored?.platforms?.[p] ?? {}),
    };
  }
  base.platforms = platforms;
  return base;
}

/** Ensures a daily state has an entry for every platform. */
function normalizeDailyState(stored: DailyState | undefined): DailyState {
  if (!stored) return freshDailyState();
  const platforms = { ...stored.platforms };
  for (const p of PLATFORMS) {
    if (!platforms[p]) platforms[p] = freshPlatformDay();
  }
  return { date: stored.date, platforms };
}

export const repository = {
  /** Ensures the store is initialised with defaults on first run. */
  async init(): Promise<void> {
    const meta = await getRaw(StorageKeys.meta);
    if (meta) {
      // Light migration: make sure new platforms/keys exist.
      if (meta.schemaVersion !== SCHEMA_VERSION) {
        await this.setSettings(await this.getSettings());
        await this.setDailyState(await this.getDailyState());
        await setRaw({
          [StorageKeys.meta]: { ...meta, schemaVersion: SCHEMA_VERSION },
        });
      }
      return;
    }
    const initial: StorageMeta = {
      schemaVersion: SCHEMA_VERSION,
      installedAt: Date.now(),
    };
    await setRaw({
      [StorageKeys.meta]: initial,
      [StorageKeys.settings]: DEFAULT_SETTINGS,
      [StorageKeys.dailyState]: freshDailyState(),
      [StorageKeys.history]: [],
    });
  },

  async getSettings(): Promise<Settings> {
    return normalizeSettings(await getRaw(StorageKeys.settings));
  },

  async setSettings(settings: Settings): Promise<void> {
    await setRaw({ [StorageKeys.settings]: settings });
  },

  /** Applies a deep-partial patch, merging per-platform sub-patches. */
  async patchSettings(patch: DeepPartialSettings): Promise<Settings> {
    const current = await this.getSettings();
    const { platforms: platformPatch, ...rest } = patch;
    const next: Settings = { ...current, ...rest };
    if (platformPatch) {
      next.platforms = { ...current.platforms };
      for (const p of Object.keys(platformPatch) as Platform[]) {
        next.platforms[p] = { ...current.platforms[p], ...platformPatch[p] };
      }
    }
    await this.setSettings(next);
    return next;
  },

  async getDailyState(): Promise<DailyState> {
    return normalizeDailyState(await getRaw(StorageKeys.dailyState));
  },

  async setDailyState(state: DailyState): Promise<void> {
    await setRaw({ [StorageKeys.dailyState]: state });
  },

  async getHistory(): Promise<DayRollup[]> {
    return (await getRaw(StorageKeys.history)) ?? [];
  },

  async setHistory(history: DayRollup[]): Promise<void> {
    // Retain a rolling window by date (all platforms for each kept day).
    const cutoff = dateKeyDaysAgo(HISTORY_RETENTION_DAYS);
    const trimmed = history
      .filter((d) => d.date >= cutoff)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    await setRaw({ [StorageKeys.history]: trimmed });
  },

  /** Appends (or replaces) a day+platform rollup in history. */
  async upsertHistory(rollup: DayRollup): Promise<void> {
    const history = await this.getHistory();
    const idx = history.findIndex(
      (d) => d.date === rollup.date && d.platform === rollup.platform,
    );
    if (idx >= 0) history[idx] = rollup;
    else history.push(rollup);
    await this.setHistory(history);
  },

  async getMeta(): Promise<StorageMeta | undefined> {
    return getRaw(StorageKeys.meta);
  },

  /** Wipes all data and re-initialises with defaults. */
  async resetAll(): Promise<void> {
    await chrome.storage.local.clear();
    await this.init();
  },

  /** Subscribes to changes for a specific key. Returns an unsubscribe fn. */
  subscribe<K extends keyof StorageShape>(
    key: K,
    handler: (value: StorageShape[K]) => void,
  ): () => void {
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ): void => {
      if (areaName !== 'local') return;
      const change = changes[key as string];
      if (change) handler(change.newValue as StorageShape[K]);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  },
};

export type Repository = typeof repository;
