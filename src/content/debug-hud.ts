/**
 * A tiny, dependency-free heads-up display shown when Debug Mode is enabled.
 * It surfaces what the tracker is doing on the live page so detection can be
 * calibrated against Instagram's real (and shifting) DOM without a rebuild.
 */
import type { DebugEvent } from './view-tracker';

const HUD_ID = 'aperture-debug-hud';

export class DebugHud {
  private el: HTMLDivElement | null = null;
  private log: string[] = [];
  private route = '';
  private counted = 0;

  mount(): void {
    if (this.el) return;
    const el = document.createElement('div');
    el.id = HUD_ID;
    Object.assign(el.style, {
      position: 'fixed',
      bottom: '16px',
      left: '16px',
      zIndex: '2147483646',
      width: '260px',
      maxHeight: '320px',
      overflow: 'hidden',
      padding: '12px 14px',
      borderRadius: '14px',
      background: 'rgba(12,12,16,0.82)',
      backdropFilter: 'blur(12px)',
      color: '#e5e7eb',
      font: '11px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      border: '1px solid rgba(255,255,255,0.08)',
      pointerEvents: 'none',
      whiteSpace: 'pre-wrap',
    } satisfies Partial<CSSStyleDeclaration>);
    document.documentElement.appendChild(el);
    this.el = el;
    this.render();
  }

  unmount(): void {
    this.el?.remove();
    this.el = null;
  }

  setRoute(route: string): void {
    this.route = route;
    this.render();
  }

  record(event: DebugEvent): void {
    this.counted = event.total;
    if (event.kind === 'counted') {
      this.push(`✓ ${event.type} ${short(event.id)}`);
    } else if (event.kind === 'skipped') {
      this.push(`· skip ${event.reason ?? ''} ${short(event.id)}`.trim());
    }
    this.render();
  }

  private push(line: string): void {
    this.log.unshift(line);
    this.log = this.log.slice(0, 8);
  }

  private render(): void {
    if (!this.el) return;
    this.el.textContent =
      `⬤ Aperture debug\n` +
      `route: ${this.route}\n` +
      `counted: ${this.counted}\n` +
      `────────────\n` +
      this.log.join('\n');
  }
}

function short(id?: string): string {
  if (!id) return '';
  return id.length > 20 ? `${id.slice(0, 20)}…` : id;
}
