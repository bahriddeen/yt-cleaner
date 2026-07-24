/**
 * Background service worker — the extension's brain and single source of truth.
 *
 * Routes typed messages from content scripts and UIs to platform-aware domain
 * services, handles midnight rollover + maintenance alarms, and keeps each
 * tab's badge in sync with its platform. It holds no long-lived in-memory
 * state: everything authoritative lives in `chrome.storage.local`.
 */
import type { LiveStatus, RequestMessage, ResponseMap } from '@/types';
import { PLATFORMS, PLATFORM_META, type Platform } from '@/types';
import { repository } from '@/storage/repository';
import { computeStatistics } from '@/services/analytics';
import { onMessage } from '@/services/messaging';
import { mutate, readStatus } from './state-store';
import { counterService } from './services/counter';
import { endSession, heartbeat, startSession } from './services/session';
import { setupAlarms, handleAlarm } from './services/alarm';
import { clearBadge, updateBadge } from './services/badge';
import { exportData, importData } from './services/data-io';

// ── Lifecycle ──────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  await repository.init();
  setupAlarms();
  await refreshAllTabBadges();
});

chrome.runtime.onStartup.addListener(async () => {
  await repository.init();
  setupAlarms();
  await refreshAllTabBadges();
});

setupAlarms();

chrome.alarms.onAlarm.addListener((alarm) => void handleAlarm(alarm));

/** Maps a tab URL to the platform it belongs to, if any. */
function platformForUrl(url: string | undefined): Platform | null {
  if (!url) return null;
  try {
    const host = new URL(url).host;
    for (const p of PLATFORMS) {
      if (host === PLATFORM_META[p].host || host.endsWith(`.${PLATFORM_META[p].host}`))
        return p;
    }
    // x.com may appear without www; twitter.com legacy.
    if (host === 'x.com' || host === 'twitter.com' || host === 'www.x.com')
      return 'x';
  } catch {
    /* invalid url */
  }
  return null;
}

/** Sets the badge for every currently-open platform tab. */
async function refreshAllTabBadges(): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      const platform = platformForUrl(tab.url);
      if (platform && tab.id !== undefined) {
        const status = await readStatus(platform);
        await updateBadge(status, tab.id);
      }
    }
  } catch {
    /* tabs API unavailable — ignore */
  }
}

// ── Message routing ──────────────────────────────────────────────────────────

onMessage(async (message: RequestMessage, sender) => {
  const tabId = sender.tab?.id;

  /** Updates the sender tab's badge from a status, best-effort. */
  const withBadge = async (status: LiveStatus): Promise<LiveStatus> => {
    if (tabId !== undefined) await updateBadge(status, tabId);
    return status;
  };

  switch (message.type) {
    case 'VIEW_OBSERVED':
      return withBadge(await counterService.recordView(message.payload));

    case 'GET_STATUS':
      return withBadge(await counterService.getStatus(message.platform));

    case 'GET_ALL_STATUS': {
      const entries = await Promise.all(
        PLATFORMS.map(async (p) => [p, await readStatus(p)] as const),
      );
      return Object.fromEntries(entries) as ResponseMap['GET_ALL_STATUS'];
    }

    case 'SESSION_START':
      await mutate(message.platform, ({ day, now }) => startSession(day, now));
      return { ok: true } satisfies ResponseMap['SESSION_START'];

    case 'SESSION_HEARTBEAT':
      await mutate(message.platform, ({ day, now }) => heartbeat(day, now));
      return { ok: true } satisfies ResponseMap['SESSION_HEARTBEAT'];

    case 'SESSION_END':
      await mutate(message.platform, ({ day, now }) => endSession(day, now));
      return { ok: true } satisfies ResponseMap['SESSION_END'];

    case 'GET_SETTINGS':
      return repository.getSettings();

    case 'GET_STATE': {
      const [settings, state] = await Promise.all([
        repository.getSettings(),
        repository.getDailyState(),
      ]);
      return { settings, state };
    }

    case 'GET_STATISTICS': {
      const [history, state, settings] = await Promise.all([
        repository.getHistory(),
        repository.getDailyState(),
        repository.getSettings(),
      ]);
      return computeStatistics(
        history,
        state.platforms[message.platform],
        message.platform,
        state.date,
        settings.platforms[message.platform].dailyLimit,
      );
    }

    case 'UPDATE_SETTINGS': {
      const settings = await repository.patchSettings(message.payload);
      await refreshAllTabBadges();
      return settings;
    }

    case 'GRANT_OVERRIDE':
      return withBadge(await counterService.grantOverride(message.platform));

    case 'RESET_TODAY':
      return withBadge(await counterService.resetToday(message.platform));

    case 'RESET_ALL':
      await repository.resetAll();
      await clearBadge();
      await refreshAllTabBadges();
      return { ok: true } satisfies ResponseMap['RESET_ALL'];

    case 'EXPORT_DATA':
      return exportData();

    case 'IMPORT_DATA':
      await importData(message.payload);
      await refreshAllTabBadges();
      return { ok: true } satisfies ResponseMap['IMPORT_DATA'];

    default: {
      const _never: never = message;
      throw new Error(`Unknown message: ${JSON.stringify(_never)}`);
    }
  }
});
