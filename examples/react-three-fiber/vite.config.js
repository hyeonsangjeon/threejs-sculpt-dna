import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    // The reused Brick source sits beside this app and has its own install.
    // Force every import through this app's React/Three runtime.
    dedupe: ['react', 'react-dom', 'three', '@react-three/fiber'],
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    // R3F plus the full Three.js renderer is 1.08 MB minified / ~294 kB gzip.
    // Keep the measured runtime isolated while still warning on larger growth.
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      output: {
        manualChunks(moduleId) {
          if (moduleId.includes('/brick-output/')) return 'brick-factory';
          if (moduleId.includes('/node_modules/three/')) return 'three-runtime';
          if (
            moduleId.includes('/node_modules/@react-three/')
            || moduleId.includes('/node_modules/three-stdlib/')
          ) return 'react-three-runtime';
          if (
            moduleId.includes('/node_modules/react/')
            || moduleId.includes('/node_modules/react-dom/')
            || moduleId.includes('/node_modules/scheduler/')
          ) return 'react-runtime';
          return undefined;
        },
      },
    },
  },
});
