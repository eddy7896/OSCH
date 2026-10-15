import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`.
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    // CI runs the whole monorepo in parallel; booting a Nest app per file can exceed the 10 s default hook timeout under load.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    root: './',
    include: ['**/*.spec.ts'],
  },
});
