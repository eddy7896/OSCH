import { defineConfig } from 'vitest/config';

// Needs the Data Connect emulator and DATA_CONNECT_EMULATOR_HOST; run through `npm run test:database` at the repo root.
export default defineConfig({ test: { globals: true, include: ['test/**/*.integration.ts'], testTimeout: 30_000, fileParallelism: false } });
