/**
 * Elegant, minimal threshold notifications (50% / 75% / 90% / 100% by default).
 * Each threshold fires at most once per day; dedup state lives in
 * `dailyState.notifiedThresholds`.
 */
import type { LiveStatus, Settings } from '@/types';
import { PLATFORM_META } from '@/types';
import { ratio } from '@/utils/format';

const ICON = 'public/icons/icon-128.png';

interface Copy {
  title: string;
  message: string;
}

/** Warm, non-nagging copy per threshold. */
function copyFor(percent: number, status: LiveStatus): Copy {
  const name = PLATFORM_META[status.platform].name;
  switch (percent) {
    case 100:
      return {
        title: `You've reached today's ${name} limit`,
        message: `${status.viewedCount} / ${status.limit} views. Time well reclaimed — see you tomorrow.`,
      };
    case 90:
      return {
        title: 'Almost there',
        message: `${status.remaining} views left today. A good moment to pause.`,
      };
    case 75:
      return {
        title: 'Three-quarters through',
        message: `${status.viewedCount} of ${status.limit} views used today.`,
      };
    default:
      return {
        title: 'Halfway to your limit',
        message: `${status.viewedCount} of ${status.limit} views used. Scroll with intention.`,
      };
  }
}

/**
 * Returns the thresholds newly crossed by the current count that have not yet
 * fired today. Pure — the caller records and fires them.
 */
export function crossedThresholds(
  status: LiveStatus,
  thresholds: number[],
  alreadyFired: number[],
): number[] {
  const pct = ratio(status.viewedCount, status.limit) * 100;
  return thresholds
    .filter((t) => pct >= t && !alreadyFired.includes(t))
    .sort((a, b) => a - b);
}

/** Fires a single notification for a threshold. */
export function fireThresholdNotification(
  percent: number,
  status: LiveStatus,
  settings: Settings,
): void {
  if (!settings.notificationsEnabled) return;
  const { title, message } = copyFor(percent, status);
  try {
    chrome.notifications.create(`aperture-${status.platform}-${percent}-${status.date}`, {
      type: 'basic',
      iconUrl: ICON,
      title,
      message,
      priority: percent >= 100 ? 2 : 0,
      silent: !settings.playSound,
    });
  } catch (error) {
    console.warn('[Aperture] notification failed', error);
  }
}
