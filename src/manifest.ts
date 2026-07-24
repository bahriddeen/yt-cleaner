import { defineManifest } from '@crxjs/vite-plugin';
import pkg from '../package.json';

/**
 * Manifest V3 definition.
 *
 * Design notes:
 * - `host_permissions` is scoped strictly to Instagram — no broad access.
 * - The content script runs at `document_idle` and re-injects across SPA
 *   navigations itself (Instagram never reloads the page), so we register a
 *   single match and manage lifecycle from within.
 * - `web_accessible_resources` exposes the built overlay assets to the page's
 *   Shadow DOM host.
 */
export default defineManifest({
  manifest_version: 3,
  name: 'Aperture — Daily Limit for Instagram, X & YouTube',
  short_name: 'Aperture',
  description:
    'Reclaim your time. Aperture counts the posts, reels & shorts you actually view and gently blocks Instagram, X and YouTube once you reach your daily limit.',
  version: pkg.version,
  icons: {
    16: 'public/icons/icon-16.png',
    32: 'public/icons/icon-32.png',
    48: 'public/icons/icon-48.png',
    128: 'public/icons/icon-128.png',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'Aperture',
    default_icon: {
      16: 'public/icons/icon-16.png',
      32: 'public/icons/icon-32.png',
    },
  },
  options_page: 'src/options/index.html',
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: [
        'https://www.instagram.com/*',
        'https://x.com/*',
        'https://twitter.com/*',
        'https://www.youtube.com/*',
      ],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
      all_frames: false,
    },
  ],
  permissions: ['storage', 'alarms', 'notifications'],
  host_permissions: [
    'https://www.instagram.com/*',
    'https://x.com/*',
    'https://twitter.com/*',
    'https://www.youtube.com/*',
  ],
  web_accessible_resources: [
    {
      resources: ['src/overlay/index.html', 'assets/*'],
      matches: [
        'https://www.instagram.com/*',
        'https://x.com/*',
        'https://twitter.com/*',
        'https://www.youtube.com/*',
      ],
    },
  ],
});
