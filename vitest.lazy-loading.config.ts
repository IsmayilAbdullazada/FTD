import { defineConfig } from 'vitest/config';
import base from './vitest.config.ts';

// Keep this greater than Vitest's unchanged 5-second per-test timeout.
// Workspace loading belongs to collection, not an active test's act() scope.
const importDelayMs = 6_000;

export default defineConfig({
  ...base,
  plugins: [
    {
      name: 'slow-app-workspace-imports',
      enforce: 'pre',
      transform(code, id) {
        const normalized = id.replaceAll('\\', '/').split('?')[0];
        if (
          !/\/src\/features\/(auth|discussions|knowledge)\/index\.ts$/.test(
            normalized,
          )
        )
          return;
        return {
          code: `await new Promise(resolve => setTimeout(resolve, ${importDelayMs}));\n${code}`,
          map: null,
        };
      },
    },
  ],
  test: {
    ...base.test,
    include: ['src/app/App.test.tsx'],
    maxWorkers: 1,
  },
});
