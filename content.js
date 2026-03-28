(() => {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
     SETTINGS
     ═══════════════════════════════════════════════════════════════ */

  let settings = {
    removeShorts: true,
    keepMixPlaylists: true,
    removeSidebarSections: true,
    removeSidebarFooter: true,
    removeCreateButton: true,
    blocklist: [],
  };

  chrome.storage.sync.get(Object.keys(settings), (stored) => {
    settings = { ...settings, ...stored };
    updateStaticCSS();
    cleanup();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    for (const [key, { newValue }] of Object.entries(changes)) settings[key] = newValue;
    // Reset all processed caches so cards are re-evaluated with new settings
    processedFeedCards = new WeakSet();
    processedSearchCards = new WeakSet();
    updateStaticCSS();
    cleanup();
  });

  /* ═══════════════════════════════════════════════════════════════
     SESSION STATS
     ═══════════════════════════════════════════════════════════════ */

  const stats = { hidden: 0, shorts: 0, blocked: 0 };

  const bumpStat = (key) => {
    stats[key]++;
    try {
      chrome.runtime.sendMessage({
        type: 'YTC_STATS',
        hidden: stats.hidden + stats.shorts + stats.blocked,
      }).catch(() => { });
    } catch (e) {
      // Ignored: extension context invalidated (reloaded extension without refreshing page)
    }
  };

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'YTC_GET_STATS') { sendResponse({ ...stats }); return true; }
  });

  /* ═══════════════════════════════════════════════════════════════
     1. DYNAMIC CSS
     ═══════════════════════════════════════════════════════════════ */

  let styleEl = null;

  const buildCSS = () => {
    const rules = [];

    if (settings.removeShorts) {
      rules.push(
        // Home feed shelves & horizontal lists
        'ytd-reel-shelf-renderer',
        'ytd-rich-shelf-renderer[is-shorts]',
        // Sidebar reel items
        'ytd-reel-item-renderer',
        'ytm-reel-item-renderer',
        // Top nav chips bar
        'ytd-feed-filter-chip-bar-renderer',
        // Detailed shorts renderers
        'ytd-shorts-lockup-view-model',
        'ytm-shorts-lockup-view-model',
        'ytm-shorts-lockup-view-model-v2',
        'grid-shelf-view-model:has(ytm-shorts-lockup-view-model)',
        'grid-shelf-view-model:has(ytm-shorts-lockup-view-model-v2)',
        'grid-shelf-view-model:has(a[href*="/shorts/"])',
        // Checking for /shorts/ links OR the SHORTS overlay in various items
        'yt-lockup-view-model:has(a[href*="/shorts/"])',
        'yt-lockup-view-model:has([overlay-style="SHORTS"])',
        'ytd-video-renderer:has(a[href*="/shorts/"])',
        'ytd-video-renderer:has([overlay-style="SHORTS"])',
        'ytd-compact-video-renderer:has(a[href*="/shorts/"])',
        'ytd-compact-video-renderer:has([overlay-style="SHORTS"])',
        'ytd-grid-video-renderer:has(a[href*="/shorts/"])',
        'ytd-grid-video-renderer:has([overlay-style="SHORTS"])',
        'ytd-rich-item-renderer:has(a[href*="/shorts/"])',
        'ytd-rich-item-renderer:has([overlay-style="SHORTS"])'
      );
    }

    if (settings.removeCreateButton) {
      rules.push(
        'ytd-topbar-menu-button-renderer',
        '#masthead #buttons ytd-button-renderer',
        'button[aria-label*="Create"]'
      );
    }

    if (settings.removeSidebarFooter) {
      rules.push(
        'ytd-guide-renderer #footer',
        '#guide-footer',
        'ytd-guide-signin-promo-renderer',
        '#app-drawer-footer-container',
        'app-drawer-footer-container'
      );
    }

    return rules.length ? `${rules.join(',\n')} { display: none !important; }` : '';
  };

  const updateStaticCSS = () => {
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'yt-cleaner-styles';
      (document.head || document.documentElement).appendChild(styleEl);
    }
    styleEl.textContent = buildCSS();
  };

  updateStaticCSS();

  /* ═══════════════════════════════════════════════════════════════
     PENDING CARD CSS — hides cards until evaluated (prevents flash)
     ═══════════════════════════════════════════════════════════════ */

  const pendingStyle = document.createElement('style');
  pendingStyle.textContent = `
    .ytc-pending { opacity: 0 !important; pointer-events: none !important; }
    .ytc-ok      { opacity: 1 !important; }
  `;
  (document.head || document.documentElement).appendChild(pendingStyle);

  /* ═══════════════════════════════════════════════════════════════
     2. HELPERS
     ═══════════════════════════════════════════════════════════════ */

  const normalise = (str) => (str || '').trim().toLowerCase();

  const removeAll = (sel, root = document) =>
    root.querySelectorAll(sel).forEach(el => el.remove());

  /* ═══════════════════════════════════════════════════════════════
     3. SHORTS REMOVAL
     ═══════════════════════════════════════════════════════════════ */

  const removeShorts = () => {
    if (!settings.removeShorts) return;

    // ── Home & General feed ──
    // Shelves containing shorts
    document.querySelectorAll('ytd-rich-shelf-renderer, ytd-reel-shelf-renderer, grid-shelf-view-model').forEach(shelf => {
      const t = shelf.querySelector('#title, #title-text, .yt-shelf-header-layout__title');
      const isShortsShelf =
        shelf.hasAttribute('is-shorts') ||
        (t && /shorts/i.test(t.textContent)) ||
        shelf.querySelector('ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2');
      if (isShortsShelf) { shelf.remove(); bumpStat('shorts'); }
    });

    // ── Any Element linking to shorts ──
    document.querySelectorAll(
      'ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, yt-lockup-view-model, ytd-shorts-lockup-view-model, ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2'
    ).forEach(item => {
      if (
        item.tagName.toLowerCase().includes('shorts-lockup') ||
        item.querySelector('a[href*="/shorts/"]') ||
        item.querySelector('[overlay-style="SHORTS"]')
      ) {
        item.remove();
        bumpStat('shorts');
      }
    });

    // Shorts badge label fallback
    document.querySelectorAll('ytd-video-renderer, yt-lockup-view-model').forEach(item => {
      const badge = item.querySelector('ytd-badge-supported-renderer yt-formatted-string, .badge-style-type-simple');
      if (badge && /^\s*shorts\s*$/i.test(badge.textContent)) { item.remove(); bumpStat('shorts'); }
    });

    // ── Sidebar guide entries ──
    document.querySelectorAll('ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer').forEach(entry => {
      const label = entry.querySelector('.title, yt-formatted-string');
      // Look for the "Shorts" text in the sidebar item
      if (label && /^\s*shorts\s*$/i.test(label.textContent)) entry.remove();
      // Or look for a direct link to the shorts URL
      else if (entry.querySelector('a[href^="/shorts"]')) entry.remove();
    });
  };

  /* ═══════════════════════════════════════════════════════════════
     4. SIDEBAR SECTION + FOOTER CLEANUP
     ═══════════════════════════════════════════════════════════════ */

  const SECTIONS_TO_REMOVE =
    /explore|trending|more from youtube|gaming|live|fashion|learning|spotlight/i;

  const FOOTER_ENTRY_TERMS =
    /report history|about|press|copyright|contact us|creators|advertise|developers|terms|privacy|policy & safety|how youtube works|test new features/i;

  const removeSidebarSections = () => {
    // 1. Unconditionally remove empty guide sections (no title, no items)
    document.querySelectorAll('ytd-guide-section-renderer').forEach(section => {
      const heading = section.querySelector('#guide-section-title, .title');
      const items = section.querySelector('#items');
      const isEmptyHeading = !heading || !heading.textContent.trim();
      const isEmptyItems = !items || items.children.length === 0;

      if (isEmptyHeading && isEmptyItems) {
        section.remove();
      }
    });

    if (settings.removeSidebarSections) {
      document.querySelectorAll('ytd-guide-section-renderer').forEach(section => {
        const heading = section.querySelector('#guide-section-title, .title');
        const text = heading?.textContent || '';
        if (SECTIONS_TO_REMOVE.test(text)) { section.remove(); return; }
      });
      document.querySelectorAll('ytd-guide-section-renderer ytd-guide-collapsible-section-entry-renderer')
        .forEach(el => el.remove());
    }

    if (settings.removeSidebarFooter) {
      removeAll('#guide-footer, ytd-guide-signin-promo-renderer, #app-drawer-footer-container');

      document.querySelectorAll('ytd-guide-entry-renderer').forEach(entry => {
        const label = entry.querySelector('.title, yt-formatted-string, #endpoint');
        if (label && FOOTER_ENTRY_TERMS.test(label.textContent)) entry.remove();
      });

      document.querySelectorAll('ytd-guide-section-renderer').forEach(section => {
        const heading = section.querySelector('#guide-section-title, .title');
        if (!heading?.textContent?.trim()) {
          const hasFooter = [...section.querySelectorAll('a')]
            .some(a => FOOTER_ENTRY_TERMS.test(a.textContent));
          if (hasFooter) section.remove();
        }
      });
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     5. TOP NAV
     ═══════════════════════════════════════════════════════════════ */

  const removeTopNavItems = () => {
    if (!settings.removeCreateButton) return;
    document.querySelectorAll('#buttons ytd-button-renderer, ytd-topbar-menu-button-renderer').forEach(btn => {
      const label = (
        btn.getAttribute('aria-label') ||
        btn.querySelector('[aria-label]')?.getAttribute('aria-label') ||
        btn.querySelector('button')?.getAttribute('aria-label') || ''
      );
      if (/create/i.test(label)) btn.remove();
    });
  };

  /* ═══════════════════════════════════════════════════════════════
     6. BLOCKLIST MATCHER
     ═══════════════════════════════════════════════════════════════ */

  const matchesBlocklist = (el) => {
    if (!settings.blocklist?.length) return false;

    const titleEl = el.querySelector(
      '#video-title, #title, h3, yt-formatted-string#video-title, span#video-title, a#video-title'
    );
    const channelEl =
      el.querySelector('ytd-channel-name yt-formatted-string') ||
      el.querySelector('#channel-name yt-formatted-string') ||
      el.querySelector('ytd-channel-name a') ||
      el.querySelector('#channel-name a');

    const haystack = normalise(
      (titleEl?.textContent || '') + ' ' +
      (channelEl?.textContent || '')
    );

    if (!haystack.trim()) return false;
    return settings.blocklist.some(term => haystack.includes(normalise(term)));
  };

  /* ═══════════════════════════════════════════════════════════════
     7. SEARCH RESULTS + SUGGESTIONS
     ═══════════════════════════════════════════════════════════════ */

  let processedSearchCards = new WeakSet();

  const filterSearchResults = () => {
    if (!settings.blocklist?.length && !settings.removeShorts) return;

    document.querySelectorAll(
      'ytd-video-renderer, ' +
      'ytd-channel-renderer, ' +
      'ytd-playlist-renderer, ' +
      'ytd-radio-renderer, ' +
      'ytd-compact-video-renderer, ' +
      'ytd-grid-video-renderer, ' +
      'yt-lockup-view-model, ' +
      'ytd-shorts-lockup-view-model, ' +
      'ytm-shorts-lockup-view-model, ' +
      'ytm-shorts-lockup-view-model-v2'
    ).forEach(item => {
      if (processedSearchCards.has(item)) return;

      if (settings.removeShorts) {
        const isShort =
          item.tagName.toLowerCase().includes('shorts-lockup') ||
          item.querySelector('a[href*="/shorts/"]') ||
          item.querySelector('[overlay-style="SHORTS"]') ||
          (() => {
            const badge = item.querySelector('ytd-badge-supported-renderer yt-formatted-string, .badge-style-type-simple');
            return badge && /^\s*shorts\s*$/i.test(badge.textContent);
          })();

        if (isShort) {
          item.remove();
          bumpStat('shorts');
          return;
        }
      }

      if (settings.blocklist?.length && matchesBlocklist(item)) {
        item.style.setProperty('display', 'none', 'important');
        processedSearchCards.add(item);
        bumpStat('blocked');
        return;
      }

      processedSearchCards.add(item);
    });

    document.querySelectorAll(
      'ytd-search-suggestion-renderer, ytd-suggestion-renderer, yt-suggestion-list-item-view-model'
    ).forEach(item => {
      if (processedSearchCards.has(item)) return;
      if (settings.blocklist?.length && matchesBlocklist(item)) {
        item.style.setProperty('display', 'none', 'important');
      }
      processedSearchCards.add(item);
    });
  };

  /* ═══════════════════════════════════════════════════════════════
     8. HOME FEED — BLOCKLIST
     ═══════════════════════════════════════════════════════════════ */

  const isHomeFeed = () =>
    location.pathname === '/' || location.pathname.startsWith('/feed/');

  const isMixCard = (item) => {
    const badge = item.querySelector('ytd-badge-supported-renderer .badge-style-type-simple');
    if (badge && /mix/i.test(badge.textContent)) return true;
    const title = item.querySelector('#video-title, #title');
    if (title && /^mix\b/i.test(title.textContent.trim())) return true;
    if (item.querySelector('[playlist-type="AUTOMIX"]')) return true;
    return false;
  };

  let processedFeedCards = new WeakSet();

  const filterHomeFeed = () => {
    if (!isHomeFeed()) return;
    const hasBlocklist = (settings.blocklist?.length ?? 0) > 0;

    // If no blocklist is active, we just clear pending states
    if (!hasBlocklist) {
      document.querySelectorAll('.ytc-pending').forEach(el => {
        el.classList.remove('ytc-pending'); el.classList.add('ytc-ok');
      });
      return;
    }

    document.querySelectorAll('ytd-rich-item-renderer, yt-lockup-view-model').forEach(item => {
      if (!processedFeedCards.has(item) && !item.classList.contains('ytc-ok')) {
        item.classList.add('ytc-pending');
      }
      if (processedFeedCards.has(item)) return;

      if (item.querySelector('ytd-ad-slot-renderer, #ad-badge, [layout-type="AD"]')) {
        item.classList.remove('ytc-pending'); item.classList.add('ytc-ok');
        processedFeedCards.add(item); return;
      }

      if (settings.removeShorts) {
        if (
          item.tagName.toLowerCase().includes('shorts-lockup') ||
          item.querySelector('a[href*="/shorts/"]') ||
          item.querySelector('[overlay-style="SHORTS"]')
        ) {
          item.remove(); bumpStat('shorts'); return;
        }
      }

      if (settings.keepMixPlaylists && isMixCard(item)) {
        item.classList.remove('ytc-pending'); item.classList.add('ytc-ok');
        processedFeedCards.add(item); return;
      }

      if (hasBlocklist && matchesBlocklist(item)) {
        item.classList.remove('ytc-pending');
        item.style.setProperty('display', 'none', 'important');
        processedFeedCards.add(item); bumpStat('blocked'); return;
      }

      item.classList.remove('ytc-pending'); item.classList.add('ytc-ok');
      processedFeedCards.add(item);
    });
  };

  /* ═══════════════════════════════════════════════════════════════
     9. MASTER CLEANUP & OBSERVER
     ═══════════════════════════════════════════════════════════════ */

  const cleanup = () => {
    removeShorts();
    removeSidebarSections();
    removeTopNavItems();
    filterHomeFeed();
    filterSearchResults();
  };

  let observerRunning = false;
  let cleanupRaf = null;
  const observer = new MutationObserver(() => {
    if (cleanupRaf) cancelAnimationFrame(cleanupRaf);
    cleanupRaf = requestAnimationFrame(cleanup);
  });

  const startObserver = () => {
    if (observerRunning) return;
    observer.observe(document.body, { childList: true, subtree: true });
    observerRunning = true;
  };

  if (document.body) { cleanup(); startObserver(); }

  if (!document.body) {
    const bodyWatcher = new MutationObserver(() => {
      if (document.body) { bodyWatcher.disconnect(); cleanup(); startObserver(); }
    });
    bodyWatcher.observe(document.documentElement, { childList: true });
  }

  document.addEventListener('DOMContentLoaded', cleanup);

  document.addEventListener('yt-navigate-start', () => {
    processedFeedCards = new WeakSet();
    processedSearchCards = new WeakSet();
  });

  document.addEventListener('yt-navigate-finish', cleanup);

})();
