import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
import { sharedAlias } from './vitest.shared.mjs';

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: { alias: sharedAlias },
  test: { include: ['src/**/*.spec.ts'], environment: 'node', globals: true },
});
