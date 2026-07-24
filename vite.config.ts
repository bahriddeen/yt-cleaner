import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import { fileURLToPath, URL } from 'node:url';
import manifest from './src/manifest';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
  build: {
    // Instagram's CSP can be strict; keep output predictable and modern.
    target: 'esnext',
    sourcemap: false,
    rollupOptions: {
      input: {
        // HTML entry points are registered via the manifest; extra pages here.
      },
    },
  },
});
