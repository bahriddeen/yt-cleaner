/**
 * Platform identity and per-platform configuration.
 *
 * Aperture tracks several doom-scroll platforms independently: each has its own
 * daily limit, counter, streak and block screen. Adding a new platform is a
 * matter of adding an id here, a settings default, and a content adapter.
 */
import type { ContentType } from './domain';

/** Supported platforms. */
export type Platform = 'instagram' | 'x' | 'youtube';

/** All platforms, in display order. */
export const PLATFORMS: readonly Platform[] = ['instagram', 'x', 'youtube'] as const;

/** Human-facing metadata for a platform. */
export interface PlatformMeta {
  id: Platform;
  /** Display name used across the UIs and block screen. */
  name: string;
  /** Host this platform lives on (for matching + display). */
  host: string;
}

export const PLATFORM_META: Record<Platform, PlatformMeta> = {
  instagram: { id: 'instagram', name: 'Instagram', host: 'www.instagram.com' },
  x: { id: 'x', name: 'X', host: 'x.com' },
  youtube: { id: 'youtube', name: 'YouTube', host: 'www.youtube.com' },
};

/** Per-platform user configuration. */
export interface PlatformSettings {
  /** Whether Aperture tracks this platform at all. */
  enabled: boolean;
  /** Maximum unique views permitted per day on this platform. */
  dailyLimit: number;
  /** Which content categories count toward the limit. */
  countSurfaces: ContentType[];
  /** Ids of hide targets (cleaner) currently enabled for this platform. */
  hidden: string[];
}
