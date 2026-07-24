/**
 * Core domain models shared across every runtime context.
 * These types are the single source of truth for the extension's data shapes.
 */
import type { Platform, PlatformSettings } from './platform';

/** The kinds of content Aperture recognises (categories shared across platforms). */
export type ContentType = 'feed' | 'reel' | 'story';

/** Theme preference. `system` follows the OS setting. */
export type ThemeMode = 'light' | 'dark' | 'system';

/** Selectable accent palettes (see globals.css `[data-accent]`). */
export type AccentColor =
  | 'violet'
  | 'blue'
  | 'emerald'
  | 'rose'
  | 'amber'
  | 'cyan';

/** User-configurable settings. Persisted under the `settings` key. */
export interface Settings {
  /** Per-platform configuration (limit, enabled, surfaces, cleaner). */
  platforms: Record<Platform, PlatformSettings>;

  // ── Behavior (global) ────────────────────────────────────
  blockAfterLimit: boolean;
  blurBackground: boolean;
  playSound: boolean;
  showMotivationalQuote: boolean;
  /** Require an explicit confirmation before a temporary override. */
  confirmBeforeOverride: boolean;

  // ── Notifications (global) ───────────────────────────────
  notificationsEnabled: boolean;
  /** Progress percentages (0–100) at which to notify. */
  notifyThresholds: number[];

  // ── Appearance (global) ──────────────────────────────────
  theme: ThemeMode;
  accent: AccentColor;

  // ── Advanced (global) ────────────────────────────────────
  debugMode: boolean;

  /** Length of a temporary override grant, in minutes. */
  overrideMinutes: number;
}

/** A single browsing session on a platform. */
export interface Session {
  id: string;
  startedAt: number;
  /** `null` while the session is still active. */
  endedAt: number | null;
  /** Unique views recorded during this session. */
  viewedCount: number;
  /** Last heartbeat/activity timestamp — used to close abandoned sessions. */
  lastActiveAt: number;
}

/** A temporary override grant that briefly disables blocking. */
export interface UnlockRecord {
  id: string;
  grantedAt: number;
  expiresAt: number;
  durationMinutes: number;
}

/** Mutable state for one platform, for the current local day. */
export interface PlatformDay {
  /** Total unique views today. */
  viewedCount: number;
  /** Per-type breakdown of today's views. */
  byType: Record<ContentType, number>;
  /** Content IDs already counted today (dedup set, persisted as array). */
  countedIds: string[];
  /** Sessions recorded today. */
  sessions: Session[];
  /** Override grants issued today. */
  unlocks: UnlockRecord[];
  /** Whether the daily limit has been reached today. */
  limitReached: boolean;
  /** Notification thresholds (percent) already fired today, for dedup. */
  notifiedThresholds: number[];
}

/** Mutable state for the current local day, across all platforms. */
export interface DailyState {
  /** Local calendar day, `YYYY-MM-DD`. */
  date: string;
  /** Per-platform day state. */
  platforms: Record<Platform, PlatformDay>;
}

/** An immutable end-of-day summary for a single platform. */
export interface DayRollup {
  date: string;
  platform: Platform;
  totalViews: number;
  byType: Record<ContentType, number>;
  /** Measured time spent on the platform, milliseconds. */
  timeOnPlatformMs: number;
  sessionCount: number;
  longestSessionMs: number;
  limitReached: boolean;
  limit: number;
  overrideCount: number;
}

/** Derived analytics for a single platform. */
export interface Statistics {
  platform: Platform;
  todayViews: number;
  weekViews: number;
  monthViews: number;
  averageSessionMs: number;
  longestSessionMs: number;
  averageViewsPerSession: number;
  /** Estimated time saved, milliseconds. */
  timeSavedMs: number;
  currentStreak: number;
  bestStreak: number;
  /** Per-day series for charts (chronological). */
  dailySeries: DayRollup[];
}
