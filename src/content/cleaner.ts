/**
 * The cleaner: visually hides distracting surfaces (Shorts, feeds, sidebars)
 * by injecting a single `<style>` element built from the active platform's
 * enabled hide targets. Toggling is instant — no reload — because we simply
 * rewrite the stylesheet's contents.
 */
import type { PlatformAdapter } from './platforms/types';

const STYLE_ID = 'aperture-cleaner-style';

export class Cleaner {
  private styleEl: HTMLStyleElement | null = null;

  constructor(private readonly adapter: PlatformAdapter) {}

  /** Applies the CSS for the given set of enabled hide-target ids. */
  apply(enabledIds: string[]): void {
    const css = this.adapter.hideTargets
      .filter((t) => enabledIds.includes(t.id))
      .map((t) => t.css)
      .join('\n');

    if (!css) {
      this.remove();
      return;
    }
    const el = this.ensureStyle();
    el.textContent = css;
  }

  /** Removes the injected stylesheet. */
  remove(): void {
    this.styleEl?.remove();
    this.styleEl = null;
  }

  private ensureStyle(): HTMLStyleElement {
    if (this.styleEl && this.styleEl.isConnected) return this.styleEl;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    (document.head ?? document.documentElement).appendChild(el);
    this.styleEl = el;
    return el;
  }
}
