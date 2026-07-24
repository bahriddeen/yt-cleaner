/**
 * SPA navigation detection (platform-agnostic).
 *
 * These sites never reload — they swap views via the History API. We patch
 * `pushState`/`replaceState` (once) to emit a synthetic `locationchange` event,
 * and also listen to `popstate`. Consumers subscribe to pathname changes;
 * route *classification* belongs to each platform adapter.
 */
const EVENT = 'aperture:locationchange';
let patched = false;

/** Patches the History API to broadcast navigation. Idempotent. */
function ensurePatched(): void {
  if (patched) return;
  patched = true;

  const emit = (): void => {
    window.dispatchEvent(new Event(EVENT));
  };

  for (const method of ['pushState', 'replaceState'] as const) {
    const original = history[method];
    history[method] = function (
      this: History,
      ...args: Parameters<History['pushState']>
    ): void {
      original.apply(this, args);
      emit();
    };
  }

  window.addEventListener('popstate', emit);
}

export class SpaRouter {
  private currentPath: string;
  private listeners = new Set<(path: string) => void>();
  private readonly handler = () => this.check();

  constructor() {
    ensurePatched();
    this.currentPath = location.pathname;
  }

  start(): void {
    window.addEventListener(EVENT, this.handler);
    window.addEventListener('popstate', this.handler);
  }

  stop(): void {
    window.removeEventListener(EVENT, this.handler);
    window.removeEventListener('popstate', this.handler);
    this.listeners.clear();
  }

  get path(): string {
    return this.currentPath;
  }

  /** Subscribes to pathname changes. Returns an unsubscribe fn. */
  onChange(fn: (path: string) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private check(): void {
    const path = location.pathname;
    if (path === this.currentPath) return;
    this.currentPath = path;
    for (const fn of this.listeners) fn(path);
  }
}
