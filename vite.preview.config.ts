import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * Standalone config for the visual preview harness (no crxjs). Renders the real
 * popup/options/overlay with a mocked `chrome.*` for design review only.
 */
export default defineConfig({
  root: fileURLToPath(new URL('./preview', import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: { port: 5199, strictPort: true },
});
