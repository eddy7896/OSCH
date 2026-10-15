import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Needs the Firebase Auth emulator and FIREBASE_AUTH_EMULATOR_HOST (see tools/tests/gateway-integration.sh once it exists).
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: { globals: true, root: './', include: ['test/**/*.integration.ts'], testTimeout: 30_000 },
});
