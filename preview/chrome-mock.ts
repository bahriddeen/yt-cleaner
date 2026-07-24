/**
 * In-memory `chrome.*` mock for the visual preview harness ONLY.
 * Renders the real popup/options/overlay with realistic multi-platform sample
 * data outside an extension. Not shipped in the build.
 */
import type {
  DayRollup,
  LiveStatus,
  PlatformDay,
  Settings,
  Statistics,
} from '@/types';
import { PLATFORMS, type Platform } from '@/types';
import { DEFAULT_SETTINGS, emptyByType, freshPlatformDay } from '@/storage/defaults';
import { computeStatistics } from '@/services/analytics';
import { localDateKey, dateKeyDaysAgo } from '@/utils/date';

let settings: Settings = structuredClone(DEFAULT_SETTINGS);

const TODAY = localDateKey();

// Per-platform sample "today" and 29 days of history.
const days: Record<Platform, PlatformDay> = {
  instagram: mkDay(128, { feed: 78, reel: 50 }),
  x: mkDay(72, { feed: 72 }),
  youtube: mkDay(24, { reel: 24 }),
};

const history: DayRollup[] = PLATFORMS.flatMap((p) =>
  Array.from({ length: 29 }, (_, i) => {
    const date = dateKeyDaysAgo(29 - i);
    const limit = settings.platforms[p].dailyLimit;
    const views = Math.round(
      limit * 0.5 + Math.sin(i / 1.6 + p.length) * limit * 0.5 + Math.random() * limit * 0.35,
    );
    const clamped = Math.max(0, Math.min(views, Math.round(limit * 1.2)));
    return {
      date,
      platform: p,
      totalViews: clamped,
      byType: {
        feed: p === 'youtube' ? 0 : clamped,
        reel: p === 'youtube' ? clamped : Math.round(clamped * 0.3),
        story: 0,
      },
      timeOnPlatformMs: clamped * 9000,
      sessionCount: 1 + (i % 3),
      longestSessionMs: (10 + (i % 20)) * 60_000,
      limitReached: clamped >= limit,
      limit,
      overrideCount: 0,
    };
  }),
);

function mkDay(views: number, byType: Partial<Record<string, number>>): PlatformDay {
  return {
    ...freshPlatformDay(),
    viewedCount: views,
    byType: { ...emptyByType(), ...byType } as PlatformDay['byType'],
    sessions: [
      {
        id: 's1',
        startedAt: Date.now() - 40 * 60_000,
        endedAt: Date.now() - 10 * 60_000,
        viewedCount: views,
        lastActiveAt: Date.now() - 10 * 60_000,
      },
    ],
  };
}

function statusFor(platform: Platform): LiveStatus {
  const day = days[platform];
  const cfg = settings.platforms[platform];
  const remaining = Math.max(0, cfg.dailyLimit - day.viewedCount);
  return {
    platform,
    date: TODAY,
    viewedCount: day.viewedCount,
    limit: cfg.dailyLimit,
    remaining,
    limitReached: day.viewedCount >= cfg.dailyLimit,
    blocked: cfg.enabled && settings.blockAfterLimit && day.viewedCount >= cfg.dailyLimit,
    overrideActive: false,
    overrideExpiresAt: null,
    byType: day.byType,
  };
}

function statsFor(platform: Platform): Statistics {
  return computeStatistics(
    history,
    days[platform],
    platform,
    TODAY,
    settings.platforms[platform].dailyLimit,
  );
}

function respond(message: { type: string; platform?: Platform; payload?: unknown }): unknown {
  const p = message.platform ?? 'instagram';
  switch (message.type) {
    case 'GET_SETTINGS':
      return settings;
    case 'GET_STATUS':
      return statusFor(p);
    case 'GET_ALL_STATUS':
      return Object.fromEntries(PLATFORMS.map((pl) => [pl, statusFor(pl)]));
    case 'GET_STATISTICS':
      return statsFor(p);
    case 'GET_STATE':
      return { settings, state: { date: TODAY, platforms: days } };
    case 'UPDATE_SETTINGS': {
      const patch = message.payload as Record<string, unknown>;
      const { platforms, ...rest } = patch as {
        platforms?: Record<Platform, Partial<Settings['platforms'][Platform]>>;
      } & Record<string, unknown>;
      settings = { ...settings, ...rest } as Settings;
      if (platforms) {
        for (const pl of Object.keys(platforms) as Platform[]) {
          settings.platforms[pl] = { ...settings.platforms[pl], ...platforms[pl] };
        }
      }
      return settings;
    }
    case 'RESET_TODAY':
      days[p].viewedCount = 0;
      return statusFor(p);
    case 'GRANT_OVERRIDE':
      return statusFor(p);
    default:
      return { ok: true };
  }
}

export function installChromeMock(): void {
  (window as unknown as { chrome: unknown }).chrome = {
    runtime: {
      sendMessage: (message: { type: string }) => Promise.resolve(respond(message)),
      openOptionsPage: () => window.open('?surface=options', '_blank'),
      getURL: (path: string) => path,
      onMessage: { addListener: () => {}, removeListener: () => {} },
      id: 'preview',
    },
    storage: {
      local: { get: () => Promise.resolve({}), set: () => Promise.resolve(), clear: () => Promise.resolve() },
      onChanged: { addListener: () => {}, removeListener: () => {} },
    },
    tabs: {
      query: () => Promise.resolve([{ url: 'https://www.instagram.com/' }]),
    },
    action: {
      setBadgeText: () => Promise.resolve(),
      setBadgeBackgroundColor: () => Promise.resolve(),
    },
  };
}
