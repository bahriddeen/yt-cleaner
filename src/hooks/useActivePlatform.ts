import { useEffect, useState } from 'react';
import type { Platform } from '@/types';
import { PLATFORM_META, PLATFORMS } from '@/types';

/** Resolves a host to a platform (handling www/legacy variants). */
function platformForHost(host: string): Platform | null {
  for (const p of PLATFORMS) {
    if (host === PLATFORM_META[p].host || host.endsWith(`.${PLATFORM_META[p].host}`))
      return p;
  }
  if (host === 'x.com' || host === 'twitter.com') return 'x';
  return null;
}

/**
 * The platform of the currently-active tab, so the popup opens focused on the
 * site the user is looking at. Falls back to Instagram.
 */
export function useActivePlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>('instagram');

  useEffect(() => {
    let mounted = true;
    chrome.tabs
      ?.query({ active: true, currentWindow: true })
      .then((tabs) => {
        const url = tabs[0]?.url;
        if (!url || !mounted) return;
        try {
          const p = platformForHost(new URL(url).host);
          if (p) setPlatform(p);
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* tabs unavailable */
      });
    return () => {
      mounted = false;
    };
  }, []);

  return platform;
}
