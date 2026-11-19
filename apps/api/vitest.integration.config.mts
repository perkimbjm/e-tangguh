import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
import { sharedAlias } from './vitest.shared.mjs';

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: { alias: sharedAlias },
  test: {
    include: ['test/**/*.int.spec.ts'],
    environment: 'node',
    globals: true,
    globalSetup: ['test/support/global-setup.ts'],
    setupFiles: ['test/support/env.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
