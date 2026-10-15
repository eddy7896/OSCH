import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    // CI runs the whole monorepo in parallel; booting a Nest app per file can exceed the 10 s default hook timeout under load.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    root: './',
    include: ['**/*.e2e-spec.ts'],
  },
});
