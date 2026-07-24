/** Helpers shared by platform adapters. */
import { REEL_VIEWPORT_FRACTION } from '../config';

let fallbackCounter = 0;
const fallbackIds = new WeakMap<Element, string>();

/** Assigns (or reuses) a stable fallback id keyed to element identity. */
export function fallbackId(el: Element, prefix = 'el'): string {
  let id = fallbackIds.get(el);
  if (!id) {
    id = `${prefix}:${++fallbackCounter}`;
    fallbackIds.set(el, id);
  }
  return id;
}

/** Runs several selectors and returns the de-duplicated union of matches. */
export function queryAll(selectors: readonly string[]): Element[] {
  const found = new Set<Element>();
  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach((el) => found.add(el));
  }
  return [...found];
}

/** Whether an element visually dominates the viewport (short/reel heuristic). */
export function isViewportDominant(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.height === 0) return false;
  return rect.height >= window.innerHeight * REEL_VIEWPORT_FRACTION;
}

/**
 * Resolves the tightest ancestor (within `maxDepth`) of `el` that contains a
 * link matching `linkSelector`; falls back to the element's parent. Keeps
 * per-item ids from collapsing into one another.
 */
export function scopeByLink(
  el: Element,
  linkSelector: string,
  maxDepth = 5,
): Element {
  let node: Element | null = el;
  for (let depth = 0; depth < maxDepth && node; depth++) {
    if (node.querySelector(linkSelector)) return node;
    node = node.parentElement;
  }
  return el.parentElement ?? el;
}
