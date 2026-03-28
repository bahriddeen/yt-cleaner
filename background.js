/**
 * YouTube Cleaner — background.js
 * Service Worker (Manifest V3)
 *
 * Initialises default settings in chrome.storage.sync on first install.
 * Also listens for messages from content.js to update the badge stat.
 */

const DEFAULTS = {
  removeShorts:          true,
  removeSidebarSections: true,
  removeCreateButton:    true,
  removeSidebarFooter:   true,
  keepMixPlaylists:      true,   // never hide Mix / auto-generated playlists
  blocklist:             [],     // array of keyword/channel strings
};

chrome.runtime.onInstalled.addListener(() => {
  // Only write keys that don't already exist (preserve user settings on update)
  chrome.storage.sync.get(Object.keys(DEFAULTS), (stored) => {
    const toWrite = {};
    for (const [key, val] of Object.entries(DEFAULTS)) {
      if (!(key in stored)) toWrite[key] = val;
    }
    if (Object.keys(toWrite).length) chrome.storage.sync.set(toWrite);
  });
});

// Receive hidden-count from content script → update badge on the toolbar icon
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'YTC_STATS' && typeof msg.hidden === 'number' && sender.tab) {
    const text = msg.hidden > 0 ? String(msg.hidden) : '';
    chrome.action.setBadgeText({ text, tabId: sender.tab.id });
    chrome.action.setBadgeBackgroundColor({ color: '#ff0000', tabId: sender.tab.id });
  }
});
