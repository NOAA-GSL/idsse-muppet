/* --------------------------------------------------------------------------------
 * Created on Fri Jan 24 2025
 *
 * Copyright (c) 2025 Colorado State University. All rights reserved. (1)
 * Copyright (c) 2025 Regents of the University of Colorado. All rights reserved. (2)

 * Contributors:
 *     Mackenzie Grimes (1)
 *     Mike Rabellino (2)
 *
 * --------------------------------------------------------------------------------
 */

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
