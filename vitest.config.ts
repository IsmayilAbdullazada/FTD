import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  resolve: { alias: { '@': path.resolve('src') } },
  test: { include: ['src/**/*.test.{ts,tsx}'], environment: 'jsdom' },
});
