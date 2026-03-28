/**
 * YouTube Cleaner — popup.js
 * Runs inside popup.html.
 * Reads/writes settings to chrome.storage.sync.
 * Requests live stats from the active YouTube tab.
 */

'use strict';

const TOGGLE_IDS = [
  'removeShorts',
  'keepMixPlaylists',
  'removeSidebarSections',
  'removeSidebarFooter',
  'removeCreateButton',
];

const DEFAULTS = {
  removeShorts:          true,
  keepMixPlaylists:      true,
  removeSidebarSections: true,
  removeSidebarFooter:   true,
  removeCreateButton:    true,
  blocklist:             [],
};

/* ── helpers ── */

const flash = () => {
  const el = document.getElementById('savedFlash');
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1500);
};

const saveSettings = () => {
  const settings = {};
  for (const id of TOGGLE_IDS) {
    settings[id] = document.getElementById(id).checked;
  }
  settings.blocklist = currentBlocklist;
  chrome.storage.sync.set(settings, flash);
};

/* ── blocklist ── */

let currentBlocklist = [];

const renderTags = () => {
  const container = document.getElementById('blocklistTags');
  container.innerHTML = '';
  for (const term of currentBlocklist) {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.innerHTML = `${escHtml(term)}<span class="tag-remove" data-term="${escHtml(term)}">×</span>`;
    container.appendChild(tag);
  }
};

const escHtml = (s) =>
  s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

document.getElementById('blocklistTags').addEventListener('click', (e) => {
  if (!e.target.classList.contains('tag-remove')) return;
  const term = e.target.dataset.term;
  currentBlocklist = currentBlocklist.filter(t => t !== term);
  renderTags();
  saveSettings();
});

document.getElementById('blocklistAdd').addEventListener('click', () => {
  addBlocklistTerm();
});

document.getElementById('blocklistInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addBlocklistTerm();
});

const addBlocklistTerm = () => {
  const input = document.getElementById('blocklistInput');
  const val = input.value.trim().toLowerCase();
  if (!val || currentBlocklist.includes(val)) { input.value = ''; return; }
  currentBlocklist.push(val);
  input.value = '';
  renderTags();
  saveSettings();
};

/* ── stats ── */

const loadStats = () => {
  // Ask the active tab's content script for its current stats
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;
    chrome.tabs.sendMessage(tabs[0].id, { type: 'YTC_GET_STATS' }, (resp) => {
      if (chrome.runtime.lastError || !resp) return;
      document.getElementById('statHidden').textContent  = resp.hidden  ?? 0;
      document.getElementById('statShorts').textContent  = resp.shorts  ?? 0;
      document.getElementById('statBlocked').textContent = resp.blocked ?? 0;
    });
  });
};

/* ── init ── */

chrome.storage.sync.get(Object.keys(DEFAULTS), (stored) => {
  const settings = { ...DEFAULTS, ...stored };

  for (const id of TOGGLE_IDS) {
    const el = document.getElementById(id);
    el.checked = settings[id];
    el.addEventListener('change', saveSettings);
  }

  currentBlocklist = Array.isArray(settings.blocklist) ? settings.blocklist : [];
  renderTags();
  loadStats();
});

/* ── reset ── */

document.getElementById('resetBtn').addEventListener('click', () => {
  if (!confirm('Reset all settings to defaults?')) return;
  currentBlocklist = [...DEFAULTS.blocklist];
  chrome.storage.sync.set(DEFAULTS, () => {
    for (const id of TOGGLE_IDS) {
      document.getElementById(id).checked = DEFAULTS[id];
    }
    renderTags();
    flash();
  });
});
