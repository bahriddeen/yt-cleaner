/**
 * Session tracking (per platform-day).
 *
 * A session begins when a platform loads and ends on unload, on explicit end,
 * or when no heartbeat arrives within the idle window (covers crashed/closed
 * tabs). These functions are pure mutators over a `PlatformDay`; the message
 * handlers wrap them in the state-store's `mutate()`.
 */
import type { PlatformDay, Session } from '@/types';
import { shortId } from '@/utils/id';

/** Idle window after which a heartbeat-less session is considered ended. */
export const SESSION_IDLE_MS = 90_000;

/** The most recent still-open session, if any. */
export function activeSession(day: PlatformDay): Session | undefined {
  for (let i = day.sessions.length - 1; i >= 0; i--) {
    if (day.sessions[i]!.endedAt === null) return day.sessions[i];
  }
  return undefined;
}

/** Closes any open sessions, ending them at their last activity time. */
export function endOpenSessions(day: PlatformDay, now: number): void {
  for (const s of day.sessions) {
    if (s.endedAt === null) s.endedAt = Math.max(s.startedAt, s.lastActiveAt, now);
  }
}

/**
 * Starts a session. If one is already open (e.g. a second tab) we keep it and
 * just refresh its heartbeat, to avoid inflating the session count.
 */
export function startSession(day: PlatformDay, now: number): void {
  reapStaleSessions(day, now);
  const open = activeSession(day);
  if (open) {
    open.lastActiveAt = now;
    return;
  }
  const session: Session = {
    id: shortId('sess'),
    startedAt: now,
    endedAt: null,
    viewedCount: 0,
    lastActiveAt: now,
  };
  day.sessions.push(session);
}

/** Refreshes the active session's heartbeat. */
export function heartbeat(day: PlatformDay, now: number): void {
  reapStaleSessions(day, now);
  const open = activeSession(day);
  if (open) open.lastActiveAt = now;
  else startSession(day, now);
}

/** Ends the active session explicitly (e.g. tab closed / navigated away). */
export function endSession(day: PlatformDay, now: number): void {
  const open = activeSession(day);
  if (open) open.endedAt = Math.max(open.startedAt, now);
}

/** Records a view against the active session. */
export function recordViewOnSession(day: PlatformDay, now: number): void {
  const open = activeSession(day) ?? (startSession(day, now), activeSession(day));
  if (open) {
    open.viewedCount += 1;
    open.lastActiveAt = now;
  }
}

/** Closes sessions whose last heartbeat is older than the idle window. */
export function reapStaleSessions(day: PlatformDay, now: number): void {
  for (const s of day.sessions) {
    if (s.endedAt === null && now - s.lastActiveAt > SESSION_IDLE_MS) {
      s.endedAt = s.lastActiveAt;
    }
  }
}
