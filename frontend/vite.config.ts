import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/** The browser talks only to the Vite origin; API, media, and Socket.IO are proxied server-side. */
const target = process.env.VITE_PROXY_TARGET ?? 'http://127.0.0.1:5000';
const proxy = {
  '/api': { target, changeOrigin: true },
  '/uploads': { target, changeOrigin: true },
  '/socket.io': { target, changeOrigin: true, ws: true },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    proxy,
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
    proxy,
  },
  build: {
    // Admin screens and charts are lazy-loaded; shoppers do not download them.
    chunkSizeWarningLimit: 900,
  },
});
