import { defineConfig } from 'vite';

// Separate build for the isolated VR section. The main app build (vite.config.ts)
// only bundles index.html and never imports src/vr, so it is unaffected.
export default defineConfig({
  base: './',
  server: { port: 3000, open: false, host: true },
  build: {
    target: 'esnext',
    outDir: 'dist-vr',
    rollupOptions: { input: 'vr.html' }
  }
});
