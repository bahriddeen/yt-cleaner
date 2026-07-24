/**
 * YouTube adapter.
 *
 * Counts Shorts only — the Shorts player (`/shorts/…`) is YouTube's endless
 * short-form feed. Each `ytd-reel-video-renderer` is one short; ids come from
 * its `/shorts/<id>` link. The cleaner's hide targets are inspired by
 * yt-cleaner (anchored on YouTube's stable `ytd-*` custom elements).
 */
import type { ExtractedContent, HideTargetDef, PlatformAdapter, TrackItem } from './types';
import { fallbackId } from './shared';

const SHORTS_RE = /\/shorts\/([^/?#]+)/;

function isShortsRoute(pathname: string): boolean {
  return pathname.startsWith('/shorts');
}

const HIDE_TARGETS: HideTargetDef[] = [
  {
    id: 'yt-shorts',
    label: 'Hide Shorts everywhere',
    description: 'Remove Shorts shelves, sidebar entries and feed items.',
    css: `
      ytd-reel-shelf-renderer,
      ytd-rich-shelf-renderer[is-shorts],
      ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts]),
      ytd-guide-entry-renderer:has(a[title="Shorts"]),
      ytd-mini-guide-entry-renderer[aria-label="Shorts"],
      ytd-rich-item-renderer:has(a[href^="/shorts"]),
      a[href^="/shorts"] { display: none !important; }
    `,
  },
  {
    id: 'yt-home-feed',
    label: 'Hide the home feed',
    description: 'Blank the recommendation grid on the home page.',
    css: 'ytd-browse[page-subtype="home"] ytd-rich-grid-renderer { display: none !important; }',
  },
  {
    id: 'yt-comments',
    label: 'Hide comments',
    description: 'Remove the comments section under videos.',
    css: '#comments { display: none !important; }',
  },
  {
    id: 'yt-related',
    label: 'Hide related videos',
    description: 'Remove the up-next / related sidebar on watch pages.',
    css: '#related, #secondary { display: none !important; }',
  },
];

export const youtubeAdapter: PlatformAdapter = {
  platform: 'youtube',
  hideTargets: HIDE_TARGETS,

  collectItems(pathname: string): TrackItem[] {
    if (!isShortsRoute(pathname)) return [];
    return Array.from(
      document.querySelectorAll('ytd-reel-video-renderer'),
    ).map((el) => ({ target: el, scope: el }));
  },

  extractContent(scope: Element, pathname: string): ExtractedContent | null {
    const link = scope.querySelector<HTMLAnchorElement>('a[href*="/shorts/"]');
    const match = SHORTS_RE.exec(link?.getAttribute('href') ?? pathname);
    if (match?.[1]) return { id: `yt:${match[1]}`, type: 'reel' };
    return { id: fallbackId(scope, 'yt'), type: 'reel' };
  },
};
