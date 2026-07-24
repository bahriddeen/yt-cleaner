/**
 * ViewTracker — counts uniquely *viewed* items on any supported platform.
 *
 * Platform-agnostic: it asks the injected `PlatformAdapter` which elements are
 * trackable and how to identify them. Counting rule: an item counts once it has
 * been ≥ `visibilityRatio` visible for a continuous `dwellMs`; scrolling back to
 * an already-counted item never recounts it.
 *
 * One shared IntersectionObserver + one debounced MutationObserver; everything
 * is torn down in `stop()` and re-scanned on SPA navigation — no leaks, no
 * polling.
 */
import type { ContentType, ViewObservation } from '@/types';
import type { PlatformAdapter } from './platforms/types';
import type { SpaRouter } from './spa-router';
import {
  IO_THRESHOLDS,
  MUTATION_DEBOUNCE_MS,
  VIEW_RULES,
} from './config';

export interface DebugEvent {
  kind: 'registered' | 'counted' | 'skipped';
  id?: string;
  type?: ContentType;
  reason?: string;
  total: number;
}

export interface ViewTrackerOptions {
  adapter: PlatformAdapter;
  router: SpaRouter;
  /** Reports a counted view (without the platform, added by the caller). */
  onView: (observation: Omit<ViewObservation, 'platform'>) => void;
  /** Live check of whether a content type should be counted. */
  isTypeEnabled: (type: ContentType) => boolean;
  onDebug?: (event: DebugEvent) => void;
}

interface Registered {
  scope: Element;
}

export class ViewTracker {
  private io: IntersectionObserver | null = null;
  private mo: MutationObserver | null = null;
  private readonly registered = new WeakSet<Element>();
  private readonly items = new Map<Element, Registered>();
  private readonly dwellTimers = new Map<Element, number>();
  private readonly countedIds = new Set<string>();
  private mutationTimer: number | null = null;
  private running = false;

  constructor(private readonly opts: ViewTrackerOptions) {}

  start(): void {
    if (this.running) return;
    this.running = true;

    this.io = new IntersectionObserver(this.handleIntersections, {
      threshold: IO_THRESHOLDS as unknown as number[],
    });
    this.mo = new MutationObserver(() => this.scheduleScan());
    this.mo.observe(document.body, { childList: true, subtree: true });

    this.opts.router.onChange(() => this.handleRouteChange());
    this.scan();
  }

  stop(): void {
    this.running = false;
    this.io?.disconnect();
    this.mo?.disconnect();
    this.io = null;
    this.mo = null;
    for (const timer of this.dwellTimers.values()) clearTimeout(timer);
    this.dwellTimers.clear();
    this.items.clear();
    if (this.mutationTimer) clearTimeout(this.mutationTimer);
  }

  get count(): number {
    return this.countedIds.size;
  }

  // ── Internal ───────────────────────────────────────────────────────────

  private handleRouteChange(): void {
    for (const timer of this.dwellTimers.values()) clearTimeout(timer);
    this.dwellTimers.clear();
    this.scan();
  }

  private scheduleScan(): void {
    if (this.mutationTimer) return;
    this.mutationTimer = self.setTimeout(() => {
      this.mutationTimer = null;
      this.scan();
    }, MUTATION_DEBOUNCE_MS);
  }

  private scan(): void {
    if (!this.io) return;
    const items = this.opts.adapter.collectItems(this.opts.router.path);
    for (const item of items) {
      if (this.registered.has(item.target)) continue;
      this.registered.add(item.target);
      this.items.set(item.target, { scope: item.scope });
      this.io.observe(item.target);
      this.opts.onDebug?.({ kind: 'registered', total: this.countedIds.size });
    }
  }

  private readonly handleIntersections: IntersectionObserverCallback = (
    entries,
  ) => {
    for (const entry of entries) {
      const visible =
        entry.isIntersecting &&
        entry.intersectionRatio >= VIEW_RULES.visibilityRatio;
      if (visible) this.armDwell(entry.target);
      else this.cancelDwell(entry.target);
    }
  };

  private armDwell(target: Element): void {
    if (this.dwellTimers.has(target)) return;
    const timer = self.setTimeout(() => {
      this.dwellTimers.delete(target);
      this.commit(target);
    }, VIEW_RULES.dwellMs);
    this.dwellTimers.set(target, timer);
  }

  private cancelDwell(target: Element): void {
    const timer = this.dwellTimers.get(target);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.dwellTimers.delete(target);
    }
  }

  private commit(target: Element): void {
    const item = this.items.get(target);
    if (!item) return;

    const content = this.opts.adapter.extractContent(
      item.scope,
      this.opts.router.path,
    );
    if (!content) {
      this.opts.onDebug?.({
        kind: 'skipped',
        reason: 'no-content-id',
        total: this.countedIds.size,
      });
      return;
    }
    if (this.countedIds.has(content.id)) return;
    if (!this.opts.isTypeEnabled(content.type)) {
      this.opts.onDebug?.({
        kind: 'skipped',
        id: content.id,
        type: content.type,
        reason: 'type-disabled',
        total: this.countedIds.size,
      });
      return;
    }

    this.countedIds.add(content.id);
    this.io?.unobserve(target);
    this.items.delete(target);

    this.opts.onView({
      contentId: content.id,
      type: content.type,
      observedAt: Date.now(),
    });
    this.opts.onDebug?.({
      kind: 'counted',
      id: content.id,
      type: content.type,
      total: this.countedIds.size,
    });
  }
}
