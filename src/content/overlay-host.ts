/**
 * Overlay host (content-script side).
 *
 * The block screen is rendered by a React app served from an extension page and
 * embedded here in a full-viewport iframe. Using an iframe fully isolates the
 * overlay's styles from Instagram (no bleed in either direction) and gives the
 * overlay real `chrome.*` access as an extension-origin document.
 *
 * This host only manages *presence*: it mounts/unmounts the iframe, blurs and
 * scroll-locks the underlying page, and bridges the few actions that need to
 * touch the top-level page (e.g. leaving Instagram).
 */
import type { Platform } from '@/types';

const CONTAINER_ID = 'aperture-overlay-root';
const MAX_Z = '2147483647';

export interface OverlayHostOptions {
  /** The platform this overlay is blocking. */
  platform: Platform;
  /** Whether to blur the page content behind the overlay. */
  blurBackground: boolean;
}

export class OverlayHost {
  private container: HTMLDivElement | null = null;
  private previousBodyOverflow = '';
  private readonly messageHandler = (e: MessageEvent) => this.onMessage(e);

  constructor(private options: OverlayHostOptions) {
    window.addEventListener('message', this.messageHandler);
  }

  get isShown(): boolean {
    return this.container !== null;
  }

  updateOptions(options: OverlayHostOptions): void {
    this.options = options;
    if (this.isShown) this.applyBackgroundEffects(true);
  }

  /** Mounts the overlay iframe if not already present. */
  show(): void {
    if (this.container) return;

    const container = document.createElement('div');
    container.id = CONTAINER_ID;
    Object.assign(container.style, {
      position: 'fixed',
      inset: '0',
      zIndex: MAX_Z,
      border: 'none',
      margin: '0',
      padding: '0',
    } satisfies Partial<CSSStyleDeclaration>);
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-modal', 'true');
    container.setAttribute('aria-label', 'Daily Instagram limit reached');

    const iframe = document.createElement('iframe');
    iframe.src = `${chrome.runtime.getURL('src/overlay/index.html')}?platform=${this.options.platform}`;
    iframe.setAttribute('title', 'Aperture — daily limit reached');
    Object.assign(iframe.style, {
      width: '100%',
      height: '100%',
      border: 'none',
      colorScheme: 'normal',
    } satisfies Partial<CSSStyleDeclaration>);
    container.appendChild(iframe);

    // Attach to <html>, not <body>, so blurring <body> doesn't blur the overlay.
    document.documentElement.appendChild(container);
    this.container = container;

    this.applyBackgroundEffects(true);
  }

  /** Unmounts the overlay and restores the page. */
  hide(): void {
    if (!this.container) return;
    this.container.remove();
    this.container = null;
    this.applyBackgroundEffects(false);
  }

  /** Removes the overlay and detaches listeners. */
  destroy(): void {
    this.hide();
    window.removeEventListener('message', this.messageHandler);
  }

  private applyBackgroundEffects(active: boolean): void {
    const body = document.body;
    if (!body) return;
    if (active) {
      this.previousBodyOverflow ||= body.style.overflow;
      body.style.overflow = 'hidden';
      body.style.filter = this.options.blurBackground ? 'blur(18px)' : '';
      body.style.transition = 'filter 400ms ease';
    } else {
      body.style.overflow = this.previousBodyOverflow;
      body.style.filter = '';
      this.previousBodyOverflow = '';
    }
  }

  private onMessage(event: MessageEvent): void {
    const data = event.data as { source?: string; action?: string } | null;
    if (!data || data.source !== 'aperture-overlay') return;

    switch (data.action) {
      case 'close-instagram':
        // Gently leave Instagram.
        window.location.replace('about:blank');
        break;
      default:
        break;
    }
  }
}
