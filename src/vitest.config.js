import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    restoreMocks: true,
    environment: 'jsdom', // runs lightweight DOM during unit tests
    deps: {
      // test-utils not used at this time
      inline: [/vite-test-utils/, 'vitest-canvas-mock'],
    },
    // For this config, check https://github.com/vitest-dev/vitest/issues/740
    threads: false,
    environmentOptions: {
      jsdom: {
        resources: 'usable',
      },
    },
  },
});
