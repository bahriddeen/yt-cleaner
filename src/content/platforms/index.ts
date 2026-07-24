/** Platform adapter registry. */
import type { Platform } from '@/types';
import type { PlatformAdapter } from './types';
import { instagramAdapter } from './instagram';
import { xAdapter } from './x';
import { youtubeAdapter } from './youtube';

const ADAPTERS: PlatformAdapter[] = [instagramAdapter, xAdapter, youtubeAdapter];

/** Host → platform. Handles www/legacy variants. */
export function platformForHost(host: string): Platform | null {
  if (host === 'www.instagram.com' || host === 'instagram.com') return 'instagram';
  if (host === 'x.com' || host === 'www.x.com' || host === 'twitter.com')
    return 'x';
  if (host === 'www.youtube.com' || host === 'youtube.com' || host === 'm.youtube.com')
    return 'youtube';
  return null;
}

/** Returns the adapter for the current host, or `null` if unsupported. */
export function adapterForHost(host: string): PlatformAdapter | null {
  const platform = platformForHost(host);
  return platform ? getAdapter(platform) : null;
}

/** Returns the adapter for a platform. */
export function getAdapter(platform: Platform): PlatformAdapter {
  const found = ADAPTERS.find((a) => a.platform === platform);
  if (!found) throw new Error(`No adapter for platform: ${platform}`);
  return found;
}

export type { PlatformAdapter } from './types';
