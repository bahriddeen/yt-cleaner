/**
 * Content-script entry point (runs on every supported platform).
 *
 * Resolves the platform from the host, then wires the SPA router, adapter-driven
 * view tracker, session lifecycle, cleaner and block overlay together, keeping
 * them in sync with the authoritative per-platform status from the background.
 */
import type { ContentType, LiveStatus, Platform, Settings } from '@/types';
import { sendMessage, sendMessageSafe, onBroadcast } from '@/services/messaging';
import { repository } from '@/storage/repository';
import { SpaRouter } from './spa-router';
import { ViewTracker, type DebugEvent } from './view-tracker';
import { OverlayHost } from './overlay-host';
import { DebugHud } from './debug-hud';
import { Cleaner } from './cleaner';
import { adapterForHost, type PlatformAdapter } from './platforms';
import { HEARTBEAT_INTERVAL_MS } from './config';

class ContentController {
  private readonly router = new SpaRouter();
  private settings: Settings | null = null;
  private tracker: ViewTracker | null = null;
  private overlay: OverlayHost | null = null;
  private hud: DebugHud | null = null;
  private heartbeatTimer: number | null = null;
  private blocked = false;

  constructor(
    private readonly platform: Platform,
    private readonly adapter: PlatformAdapter,
  ) {}

  async init(): Promise<void> {
    this.settings = await this.fetchSettings();

    this.cleaner = new Cleaner(this.adapter);
    this.applyCleaner();

    this.overlay = new OverlayHost({
      platform: this.platform,
      blurBackground: this.settings.blurBackground,
    });

    this.router.start();
    this.router.onChange((path) => this.hud?.setRoute(path));

    this.setupDebugHud();
    this.watchSettings();
    this.watchBroadcasts();
    this.watchLifecycle();

    await sendMessage({ type: 'SESSION_START', platform: this.platform });
    const status = await sendMessage({ type: 'GET_STATUS', platform: this.platform });
    this.applyStatus(status);
    this.startHeartbeat();
  }

  private cleaner!: Cleaner;

  // ── Status & blocking ────────────────────────────────────────────────────

  private applyStatus(status: LiveStatus): void {
    if (status.platform !== this.platform) return;
    if (status.blocked) this.enterBlocked();
    else this.exitBlocked();
  }

  private enterBlocked(): void {
    if (this.blocked) return;
    this.blocked = true;
    this.stopTracking();
    this.overlay?.show();
  }

  private exitBlocked(): void {
    const wasBlocked = this.blocked;
    this.blocked = false;
    this.overlay?.hide();
    if (!this.tracker && this.platformEnabled()) this.startTracking();
    if (wasBlocked) sendMessageSafe({ type: 'SESSION_HEARTBEAT', platform: this.platform });
  }

  // ── Tracking lifecycle ─────────────────────────────────────────────────────

  private startTracking(): void {
    if (this.tracker || !this.platformEnabled()) return;
    this.tracker = new ViewTracker({
      adapter: this.adapter,
      router: this.router,
      isTypeEnabled: (type) => this.isTypeEnabled(type),
      onView: (obs) => this.reportView(obs),
      onDebug: (event) => this.onDebug(event),
    });
    this.tracker.start();
  }

  private stopTracking(): void {
    this.tracker?.stop();
    this.tracker = null;
  }

  private platformEnabled(): boolean {
    return this.settings?.platforms[this.platform].enabled ?? false;
  }

  private isTypeEnabled(type: ContentType): boolean {
    const cfg = this.settings?.platforms[this.platform];
    return Boolean(cfg?.enabled && cfg.countSurfaces.includes(type));
  }

  private async reportView(obs: {
    contentId: string;
    type: ContentType;
    observedAt: number;
  }): Promise<void> {
    try {
      const status = await sendMessage({
        type: 'VIEW_OBSERVED',
        payload: { ...obs, platform: this.platform },
      });
      this.applyStatus(status);
    } catch {
      /* worker asleep / context invalidated — next observation retries */
    }
  }

  // ── Session heartbeat ──────────────────────────────────────────────────────

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = self.setInterval(() => {
      if (document.visibilityState === 'visible' && !this.blocked) {
        sendMessageSafe({ type: 'SESSION_HEARTBEAT', platform: this.platform });
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  // ── Reactivity ─────────────────────────────────────────────────────────────

  private watchBroadcasts(): void {
    onBroadcast((message) => {
      switch (message.type) {
        case 'STATUS_CHANGED':
        case 'LIMIT_REACHED':
        case 'DAY_RESET':
          this.applyStatus(message.payload);
          break;
        case 'OVERRIDE_ENDED':
          if (message.platform === this.platform) {
            void sendMessage({ type: 'GET_STATUS', platform: this.platform }).then(
              (s) => this.applyStatus(s),
            );
          }
          break;
      }
    });
  }

  private watchSettings(): void {
    repository.subscribe('settings', (next) => {
      if (!next) return;
      this.settings = next;
      this.overlay?.updateOptions({
        platform: this.platform,
        blurBackground: next.blurBackground,
      });
      this.applyCleaner();
      this.setupDebugHud();
      // React to enable/disable of this platform.
      if (!this.platformEnabled()) this.stopTracking();
      else if (!this.blocked && !this.tracker) this.startTracking();
    });
  }

  private applyCleaner(): void {
    const hidden = this.settings?.platforms[this.platform].hidden ?? [];
    this.cleaner.apply(hidden);
  }

  private watchLifecycle(): void {
    const end = (): void =>
      sendMessageSafe({ type: 'SESSION_END', platform: this.platform });
    window.addEventListener('pagehide', end);
    window.addEventListener('beforeunload', end);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !this.blocked) {
        sendMessageSafe({ type: 'SESSION_HEARTBEAT', platform: this.platform });
      }
    });
  }

  // ── Debug HUD ──────────────────────────────────────────────────────────────

  private setupDebugHud(): void {
    const enabled = this.settings?.debugMode ?? false;
    if (enabled && !this.hud) {
      this.hud = new DebugHud();
      this.hud.mount();
      this.hud.setRoute(`${this.platform} ${this.router.path}`);
    } else if (!enabled && this.hud) {
      this.hud.unmount();
      this.hud = null;
    }
  }

  private onDebug(event: DebugEvent): void {
    this.hud?.record(event);
  }

  private async fetchSettings(): Promise<Settings> {
    try {
      return await sendMessage({ type: 'GET_SETTINGS' });
    } catch {
      return repository.getSettings();
    }
  }
}

// Resolve the platform for this host and boot once.
const adapter = adapterForHost(location.host);
const loadedFlag = '__apertureLoaded';
if (
  adapter &&
  !(window as unknown as Record<string, boolean>)[loadedFlag]
) {
  (window as unknown as Record<string, boolean>)[loadedFlag] = true;
  const controller = new ContentController(adapter.platform, adapter);
  void controller.init();
}
