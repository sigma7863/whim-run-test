import { defineConfig } from 'vite';

// Static, dependency-light SPA. `base: './'` keeps asset URLs relative so the
// build can be dropped onto any static host (Cloudflare Pages, Netlify, etc.)
// without rewriting paths.
export default defineConfig({
  base: './',
  server: { port: 5173 },
  preview: { port: 4173, strictPort: true },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split the large, stable three.js core into its own chunk so app code
        // changes don't bust its long-lived browser cache.
        manualChunks: { three: ['three'] },
      },
    },
  },
});
