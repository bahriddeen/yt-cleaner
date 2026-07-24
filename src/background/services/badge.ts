/**
 * Toolbar badge. Because each tab may be a different platform, the badge is
 * set PER TAB (keyed to that tab's platform status). It shows remaining views
 * and shifts green → orange → red as the limit approaches, then `LIMIT`.
 */
import type { LiveStatus } from '@/types';
import { ratio } from '@/utils/format';

const COLORS = {
  green: '#16a34a',
  orange: '#f59e0b',
  red: '#ef4444',
} as const;

/** Chooses a badge colour from the used ratio. */
function badgeColor(used: number, limit: number): string {
  const r = ratio(used, limit);
  if (r >= 1) return COLORS.red;
  if (r >= 0.75) return COLORS.orange;
  return COLORS.green;
}

/** Reflects a platform's status on the toolbar badge for a specific tab. */
export async function updateBadge(
  status: LiveStatus,
  tabId?: number,
): Promise<void> {
  const { remaining, limit, viewedCount, blocked } = status;
  const text = blocked || remaining <= 0 ? 'LIMIT' : String(remaining);
  const color = blocked ? COLORS.red : badgeColor(viewedCount, limit);

  const target = tabId !== undefined ? { tabId } : {};
  try {
    await Promise.all([
      chrome.action.setBadgeText({ text, ...target }),
      chrome.action.setBadgeBackgroundColor({ color, ...target }),
      chrome.action.setBadgeTextColor?.({ color: '#ffffff', ...target }) ??
        Promise.resolve(),
    ]);
  } catch {
    /* tab may have closed between compute and set — ignore */
  }
}

/** Clears the badge (used on reset-all). */
export async function clearBadge(): Promise<void> {
  await chrome.action.setBadgeText({ text: '' });
}
