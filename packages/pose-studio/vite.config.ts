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
  server: {
    port: 5180,
  },
});
