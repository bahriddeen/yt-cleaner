/**
 * Instagram adapter.
 *
 * Feed posts are `<article>`; reels are `<video>` on the reels route. Content
 * ids come from permalink shortcodes (`/p/…`, `/reel/…`, `/tv/…`) which survive
 * re-renders and scroll-back — the key to never double-counting.
 */
import type { ContentType } from '@/types';
import type { ExtractedContent, HideTargetDef, PlatformAdapter, TrackItem } from './types';
import { fallbackId, isViewportDominant, queryAll, scopeByLink } from './shared';

const PERMALINK_RE = /\/(p|reel|reels|tv)\/([^/?#]+)/i;

function kindToType(kind: string): ContentType {
  const k = kind.toLowerCase();
  return k === 'reel' || k === 'reels' || k === 'tv' ? 'reel' : 'feed';
}

function isReelsRoute(pathname: string): boolean {
  return pathname.startsWith('/reels') || pathname.startsWith('/reel/');
}

function isFeedRoute(pathname: string): boolean {
  return pathname === '/' || pathname.startsWith('/?');
}

const HIDE_TARGETS: HideTargetDef[] = [
  {
    id: 'ig-reels-nav',
    label: 'Hide the Reels tab',
    description: 'Remove the Reels entry from the navigation.',
    css: 'a[href="/reels/"], a[href^="/reels/"] { display: none !important; }',
  },
  {
    id: 'ig-explore-nav',
    label: 'Hide the Explore tab',
    description: 'Remove the Explore entry from the navigation.',
    css: 'a[href="/explore/"] { display: none !important; }',
  },
];

export const instagramAdapter: PlatformAdapter = {
  platform: 'instagram',
  hideTargets: HIDE_TARGETS,

  collectItems(pathname: string): TrackItem[] {
    if (isFeedRoute(pathname)) {
      return queryAll(['article']).map((el) => ({ target: el, scope: el }));
    }
    if (isReelsRoute(pathname)) {
      return queryAll(['main video', 'section video']).map((video) => ({
        target: video,
        scope: scopeByLink(video, 'a[href*="/reel/"]'),
      }));
    }
    return [];
  },

  extractContent(scope: Element, pathname: string): ExtractedContent | null {
    const anchors = scope.matches('a[href]')
      ? [scope as HTMLAnchorElement]
      : Array.from(scope.querySelectorAll<HTMLAnchorElement>('a[href]'));

    for (const a of anchors) {
      const match = PERMALINK_RE.exec(a.getAttribute('href') ?? '');
      if (match?.[1] && match[2]) {
        if (match[1].toLowerCase() === 'reels' && !/[A-Za-z0-9_-]{5,}/.test(match[2]))
          continue;
        const type = kindToType(match[1]);
        return { id: `ig:${type}:${match[2]}`, type };
      }
    }

    const looksLikeReel = isReelsRoute(pathname) || isViewportDominant(scope);
    const type: ContentType = looksLikeReel ? 'reel' : 'feed';
    if (isFeedRoute(pathname) && type === 'feed' && scope.tagName === 'ARTICLE') {
      if (!scope.querySelector('img, video')) return null;
    }
    return { id: fallbackId(scope, 'ig'), type };
  },
};
