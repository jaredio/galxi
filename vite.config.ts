import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          d3: ['d3'],
        },
      },
    },
  },
});
