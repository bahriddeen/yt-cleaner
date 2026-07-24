/**
 * Per-platform "surfaces" the user can choose to count. The category
 * (`ContentType`) is what the counter tracks; the label/description are UI copy.
 * Single source of truth for the options General tab.
 */
import type { ContentType, Platform } from '@/types';

export interface SurfaceOption {
  type: ContentType;
  label: string;
  description: string;
}

export const PLATFORM_SURFACES: Record<Platform, SurfaceOption[]> = {
  instagram: [
    {
      type: 'feed',
      label: 'Feed posts',
      description: 'Photos and videos in your home and profile feeds.',
    },
    {
      type: 'reel',
      label: 'Reels',
      description: 'Short-form videos in the reels tab and inline.',
    },
    {
      type: 'story',
      label: 'Stories',
      description: 'Story counting is experimental and off by default.',
    },
  ],
  x: [
    {
      type: 'feed',
      label: 'Timeline posts',
      description: 'Every post you scroll past in your timeline.',
    },
  ],
  youtube: [
    {
      type: 'reel',
      label: 'Shorts',
      description: 'Vertical short-form videos in the Shorts feed.',
    },
  ],
};

/** Suggested min/max for a platform's daily-limit slider. */
export const LIMIT_RANGE: Record<Platform, { min: number; max: number; step: number }> = {
  instagram: { min: 5, max: 500, step: 5 },
  x: { min: 5, max: 400, step: 5 },
  youtube: { min: 3, max: 100, step: 1 },
};
