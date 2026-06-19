import { defineConfig } from 'vite';

// Static, dependency-light SPA. `base: './'` keeps asset URLs relative so the
// build can be dropped onto any static host (Cloudflare Pages, Netlify, etc.)
// without rewriting paths.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
