import { describe, expect, it, beforeEach } from 'vitest';
import { instagramAdapter } from './instagram';
import { xAdapter } from './x';
import { youtubeAdapter } from './youtube';

function el(html: string): Element {
  const container = document.createElement('div');
  container.innerHTML = html.trim();
  return container.firstElementChild as Element;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('instagramAdapter', () => {
  it('extracts a stable feed id from a /p/ permalink', () => {
    const a = el('<article><a href="/p/ABC123def/">link</a></article>');
    expect(instagramAdapter.extractContent(a, '/')).toEqual({
      id: 'ig:feed:ABC123def',
      type: 'feed',
    });
  });

  it('classifies /reel/ permalinks as reels', () => {
    const a = el('<article><a href="/reel/XYZ789/">reel</a></article>');
    expect(instagramAdapter.extractContent(a, '/')?.type).toBe('reel');
  });

  it('skips feed articles with no permalink and no media', () => {
    const a = el('<article><div>suggested</div></article>');
    expect(instagramAdapter.extractContent(a, '/')).toBeNull();
  });

  it('gives the same fallback id for the same element', () => {
    const a = el('<article><img src="x"/></article>');
    expect(instagramAdapter.extractContent(a, '/')).toEqual(
      instagramAdapter.extractContent(a, '/'),
    );
  });
});

describe('xAdapter', () => {
  it('extracts a status id from a tweet', () => {
    const a = el(
      '<article data-testid="tweet"><a href="/jack/status/1789012345">t</a></article>',
    );
    expect(xAdapter.extractContent(a, '/home')).toEqual({
      id: 'x:1789012345',
      type: 'feed',
    });
  });

  it('counts a tweet without a status link as a feed view (fallback)', () => {
    const a = el('<article data-testid="tweet"><span>promoted</span></article>');
    const result = xAdapter.extractContent(a, '/home');
    expect(result?.type).toBe('feed');
    expect(result?.id).toMatch(/^x:/);
  });
});

describe('youtubeAdapter', () => {
  it('only collects items on the shorts route', () => {
    document.body.innerHTML =
      '<ytd-reel-video-renderer></ytd-reel-video-renderer>';
    expect(youtubeAdapter.collectItems('/').length).toBe(0);
    expect(youtubeAdapter.collectItems('/shorts/abc').length).toBe(1);
  });

  it('extracts a shorts id from a /shorts/ link', () => {
    const r = el('<div><a href="/shorts/dQw4w9WgXcQ">s</a></div>');
    expect(youtubeAdapter.extractContent(r, '/shorts/dQw4w9WgXcQ')).toEqual({
      id: 'yt:dQw4w9WgXcQ',
      type: 'reel',
    });
  });

  it('falls back to the route id when no link is present', () => {
    const r = el('<div></div>');
    expect(youtubeAdapter.extractContent(r, '/shorts/xyz123')).toEqual({
      id: 'yt:xyz123',
      type: 'reel',
    });
  });
});
