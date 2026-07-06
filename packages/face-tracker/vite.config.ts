import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@mimicra/vrm-core': path.resolve(__dirname, '../vrm-core/src/index.ts'),
    },
  },
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
