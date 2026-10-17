/** The harness runs against the REAL Data Connect and Auth emulators (npm run test:gateway starts both). */
export const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST;
export const DC_HOST = process.env.DATA_CONNECT_EMULATOR_HOST;
export const EMULATORS_UP = Boolean(AUTH_HOST && DC_HOST);

/**
 * Without the emulators the harness skips (a developer running only unit tests). With ORU_REQUIRE_EMULATORS=1 (set by
 * tools/tests/gateway-integration.sh and CI) a missing host is a hard failure, so the harness can never go silently green.
 */
export function requireEmulatorsOrSkip(): boolean {
  if (EMULATORS_UP) return true;
  if (process.env.ORU_REQUIRE_EMULATORS === '1') throw new Error('ORU_REQUIRE_EMULATORS=1 but FIREBASE_AUTH_EMULATOR_HOST and DATA_CONNECT_EMULATOR_HOST are not both set');
  return false;
}
