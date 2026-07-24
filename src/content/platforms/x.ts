/**
 * X (Twitter) adapter.
 *
 * Every timeline post is an `article[data-testid="tweet"]`. Stable ids come
 * from the status permalink (`/<user>/status/<id>`). All timeline posts count,
 * regardless of route (home, explore, profile) — the whole feed is the surface.
 */
import type { ExtractedContent, HideTargetDef, PlatformAdapter, TrackItem } from './types';
import { fallbackId } from './shared';

const STATUS_RE = /\/status\/(\d+)/;

const HIDE_TARGETS: HideTargetDef[] = [
  {
    id: 'x-sidebar',
    label: 'Hide trends & who-to-follow',
    description: 'Remove the right-hand column (Trends, Who to follow).',
    css: '[data-testid="sidebarColumn"] { display: none !important; }',
  },
  {
    id: 'x-explore-trends',
    label: 'Hide the Explore page content',
    description: 'Blank the Explore/Trending timeline to reduce rabbit holes.',
    css: 'div[aria-label="Timeline: Explore"] { display: none !important; }',
  },
];

export const xAdapter: PlatformAdapter = {
  platform: 'x',
  hideTargets: HIDE_TARGETS,

  collectItems(): TrackItem[] {
    return Array.from(
      document.querySelectorAll('article[data-testid="tweet"]'),
    ).map((el) => ({ target: el, scope: el }));
  },

  extractContent(scope: Element): ExtractedContent | null {
    const anchors = scope.querySelectorAll<HTMLAnchorElement>(
      'a[href*="/status/"]',
    );
    for (const a of anchors) {
      const match = STATUS_RE.exec(a.getAttribute('href') ?? '');
      if (match?.[1]) return { id: `x:${match[1]}`, type: 'feed' };
    }
    // Ads/promoted tweets have no status link — still count as a viewed post.
    return { id: fallbackId(scope, 'x'), type: 'feed' };
  },
};
