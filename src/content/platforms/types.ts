/**
 * The contract every platform adapter implements.
 *
 * An adapter fully encapsulates one platform's brittle DOM knowledge: which
 * elements are trackable, how to derive a stable content id, and which surfaces
 * the "cleaner" can hide. The ViewTracker and cleaner are otherwise
 * platform-agnostic, so supporting a new site means adding one adapter.
 */
import type { ContentType, Platform } from '@/types';

/** An element to observe for visibility, plus the element used to derive its id. */
export interface TrackItem {
  target: Element;
  scope: Element;
}

/** A resolved content identity. */
export interface ExtractedContent {
  id: string;
  type: ContentType;
}

/** A hide-able surface offered by the cleaner. */
export interface HideTargetDef {
  /** Stable id stored in `settings.platforms[p].hidden`. */
  id: string;
  label: string;
  description: string;
  /** CSS applied when this target is enabled. */
  css: string;
}

export interface PlatformAdapter {
  readonly platform: Platform;
  /** Candidate trackable items for the current DOM given the pathname. */
  collectItems(pathname: string): TrackItem[];
  /** Stable id + category for a scope element; `null` if not trackable. */
  extractContent(scope: Element, pathname: string): ExtractedContent | null;
  /** Cleaner hide targets this platform supports. */
  readonly hideTargets: readonly HideTargetDef[];
}
