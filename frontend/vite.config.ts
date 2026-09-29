import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * The dev server proxies the API and uploaded media so the browser only ever
 * talks to one origin — no CORS, no hard-coded hostnames in client code.
 */
const target = process.env.VITE_PROXY_TARGET ?? 'http://127.0.0.1:5000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': { target, changeOrigin: true },
      '/uploads': { target, changeOrigin: true },
    },
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
    proxy: {
      '/api': { target, changeOrigin: true },
      '/uploads': { target, changeOrigin: true },
    },
  },
  build: {
    // Admin screens (and their charts) are lazy-loaded in `App.tsx`, so the
    // storefront bundle never pays for them.
    chunkSizeWarningLimit: 900,
  },
});
