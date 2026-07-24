import type { DailyState, DayRollup, Settings } from '@/types';

/** Keys used in `chrome.storage.local`. */
export const StorageKeys = {
  settings: 'settings',
  dailyState: 'dailyState',
  history: 'history',
  meta: 'meta',
} as const;

/** Persisted metadata. */
export interface StorageMeta {
  schemaVersion: number;
  installedAt: number;
}

/** The full persisted shape. All fields optional until initialised. */
export interface StorageShape {
  [StorageKeys.settings]?: Settings;
  [StorageKeys.dailyState]?: DailyState;
  [StorageKeys.history]?: DayRollup[];
  [StorageKeys.meta]?: StorageMeta;
}

/** Number of days of history to retain (rolling window). */
export const HISTORY_RETENTION_DAYS = 120;
