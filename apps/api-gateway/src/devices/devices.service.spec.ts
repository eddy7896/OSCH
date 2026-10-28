import { describe, expect, it } from 'vitest';
import { deviceIdOf } from './devices.service.js';

describe('deviceIdOf', () => {
  it('is the same uuid for the same token and a different one for another', () => {
    const a = deviceIdOf('fcm-token-one:APA91b');
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(deviceIdOf('fcm-token-one:APA91b')).toBe(a);
    expect(deviceIdOf('fcm-token-two:APA91b')).not.toBe(a);
  });
});
