import type { ContentType, DailyState, PlatformDay, Settings } from '@/types';
import type { Platform, PlatformSettings } from '@/types';
import { PLATFORMS } from '@/types';
import { localDateKey } from '@/utils/date';

/** Zeroed per-type counter. */
export function emptyByType(): Record<ContentType, number> {
  return { feed: 0, reel: 0, story: 0 };
}

/** Default per-platform configuration. */
export const DEFAULT_PLATFORM_SETTINGS: Record<Platform, PlatformSettings> = {
  instagram: {
    enabled: true,
    dailyLimit: 150,
    countSurfaces: ['feed', 'reel'],
    hidden: [],
  },
  x: {
    enabled: true,
    dailyLimit: 100,
    countSurfaces: ['feed'],
    hidden: [],
  },
  youtube: {
    enabled: true,
    dailyLimit: 30,
    countSurfaces: ['reel'], // Shorts only
    hidden: [],
  },
};

/** Default user settings — sensible, calm defaults. */
export const DEFAULT_SETTINGS: Settings = {
  platforms: DEFAULT_PLATFORM_SETTINGS,

  blockAfterLimit: true,
  blurBackground: true,
  playSound: false,
  showMotivationalQuote: true,
  confirmBeforeOverride: true,

  notificationsEnabled: true,
  notifyThresholds: [50, 75, 90, 100],

  theme: 'system',
  accent: 'violet',

  debugMode: false,

  overrideMinutes: 10,
};

/** A fresh per-platform day. */
export function freshPlatformDay(): PlatformDay {
  return {
    viewedCount: 0,
    byType: emptyByType(),
    countedIds: [],
    sessions: [],
    unlocks: [],
    limitReached: false,
    notifiedThresholds: [],
  };
}

/** A fresh daily state for the given (local) day, across all platforms. */
export function freshDailyState(date: string = localDateKey()): DailyState {
  return {
    date,
    platforms: PLATFORMS.reduce(
      (acc, p) => {
        acc[p] = freshPlatformDay();
        return acc;
      },
      {} as DailyState['platforms'],
    ),
  };
}

/** Current on-disk schema version — bump on breaking storage changes. */
export const SCHEMA_VERSION = 2;
