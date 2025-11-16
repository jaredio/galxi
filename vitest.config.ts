import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
    },
    exclude: [
      ...configDefaults.exclude,
      'playwright/**',
    ],
  },
});
