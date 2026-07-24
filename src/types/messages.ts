/**
 * Typed messaging protocol between content scripts, the popup/options UIs and
 * the background service worker.
 *
 * The background worker is the ONLY writer of counter state. Every request that
 * touches a platform's counter carries an explicit `platform`, so the worker
 * can keep each platform's state independent and consistent across tabs.
 */
import type { ContentType, DailyState, DayRollup, Settings, Statistics } from './domain';
import type { Platform } from './platform';

/** A single observed view reported by the content tracker. */
export interface ViewObservation {
  platform: Platform;
  /** Stable content identifier (permalink shortcode or generated id). */
  contentId: string;
  type: ContentType;
  observedAt: number;
}

/** Snapshot the content script and popup use to render live status. */
export interface LiveStatus {
  platform: Platform;
  date: string;
  viewedCount: number;
  limit: number;
  remaining: number;
  limitReached: boolean;
  /**
   * Authoritative block decision, computed by the background:
   * `enabled && blockAfterLimit && limitReached && !overrideActive`.
   */
  blocked: boolean;
  /** True when an override grant is currently active. */
  overrideActive: boolean;
  overrideExpiresAt: number | null;
  byType: Record<ContentType, number>;
}

/** Discriminated union of all request messages. */
export type RequestMessage =
  | { type: 'VIEW_OBSERVED'; payload: ViewObservation }
  | { type: 'SESSION_START'; platform: Platform }
  | { type: 'SESSION_HEARTBEAT'; platform: Platform }
  | { type: 'SESSION_END'; platform: Platform }
  | { type: 'GET_STATUS'; platform: Platform }
  | { type: 'GET_ALL_STATUS' }
  | { type: 'GET_SETTINGS' }
  | { type: 'GET_STATISTICS'; platform: Platform }
  | { type: 'GET_STATE' }
  | { type: 'UPDATE_SETTINGS'; payload: DeepPartialSettings }
  | { type: 'GRANT_OVERRIDE'; platform: Platform }
  | { type: 'RESET_TODAY'; platform: Platform }
  | { type: 'RESET_ALL' }
  | { type: 'IMPORT_DATA'; payload: ImportPayload }
  | { type: 'EXPORT_DATA' };

/** A partial settings update that may include partial per-platform patches. */
export type DeepPartialSettings = Partial<
  Omit<Settings, 'platforms'>
> & {
  platforms?: Partial<
    Record<Platform, Partial<Settings['platforms'][Platform]>>
  >;
};

/** Response map keyed by request `type`. */
export interface ResponseMap {
  VIEW_OBSERVED: LiveStatus;
  SESSION_START: { ok: true };
  SESSION_HEARTBEAT: { ok: true };
  SESSION_END: { ok: true };
  GET_STATUS: LiveStatus;
  GET_ALL_STATUS: Record<Platform, LiveStatus>;
  GET_SETTINGS: Settings;
  GET_STATISTICS: Statistics;
  GET_STATE: { settings: Settings; state: DailyState };
  UPDATE_SETTINGS: Settings;
  GRANT_OVERRIDE: LiveStatus;
  RESET_TODAY: LiveStatus;
  RESET_ALL: { ok: true };
  IMPORT_DATA: { ok: true };
  EXPORT_DATA: ExportPayload;
}

export type ResponseFor<T extends RequestMessage['type']> = ResponseMap[T];

/** Shape used by export/import. */
export interface ExportPayload {
  version: number;
  exportedAt: number;
  settings: Settings;
  dailyState: DailyState;
  history: DayRollup[];
}

export type ImportPayload = Partial<ExportPayload>;

/**
 * Broadcast events pushed FROM the background TO listeners (no response).
 * Status-bearing events include the platform they concern.
 */
export type BroadcastMessage =
  | { type: 'STATUS_CHANGED'; payload: LiveStatus }
  | { type: 'LIMIT_REACHED'; payload: LiveStatus }
  | { type: 'DAY_RESET'; payload: LiveStatus }
  | { type: 'OVERRIDE_ENDED'; platform: Platform };
