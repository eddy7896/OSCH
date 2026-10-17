import { SkipThrottle } from '@nestjs/throttler';
import { THROTTLER_SKIP } from '../permission/route-decision.check.js';

describe('throttle skip key', () => {
  it('matches what @SkipThrottle() writes, because the route table (and the OpenAPI 429s) read it directly', () => {
    @SkipThrottle({ ip: true, user: true })
    class Exempt {}
    expect(Reflect.getMetadata(`${THROTTLER_SKIP}ip`, Exempt)).toBe(true);
    expect(Reflect.getMetadata(`${THROTTLER_SKIP}user`, Exempt)).toBe(true);
    expect(Reflect.getMetadata(`${THROTTLER_SKIP}default`, Exempt)).toBeUndefined(); // a bare @SkipThrottle() would only write this one
  });
});
