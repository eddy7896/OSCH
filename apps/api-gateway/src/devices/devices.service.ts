import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DATABASE, type Database } from '@oruschools/database';
import { dashed } from '../common/uuid.js';
import type { DeviceListDto } from './dto/devices.dto.js';

/** The row id is made from the token, so registering the same token twice is one row (a repeat is safe). */
export function deviceIdOf(token: string): string {
  const h = createHash('sha256').update(token).digest();
  h[6] = (h[6]! & 0x0f) | 0x50; // version 5 style: a name-based id
  h[8] = (h[8]! & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

@Injectable()
export class DevicesService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Adds this phone to the signed-in account. A token that belonged to someone else moves to this account: the phone changed hands. */
  async register(userId: string, token: string, platform: 'IOS' | 'ANDROID'): Promise<{ id: string }> {
    const id = deviceIdOf(token);
    await this.db.registerDevice({ id, userId, token, platform: platform as never });
    return { id };
  }

  /** Forgets this phone for this account (sign-out). Removing one that is not there, or someone else's, is not an error and changes nothing. */
  async remove(userId: string, token: string): Promise<void> {
    await this.db.removeDevice({ id: deviceIdOf(token), userId });
  }

  async list(userId: string): Promise<DeviceListDto> {
    const rows = (await this.db.listDevicesOfUser({ userId })).data.deviceTokens;
    return { items: rows.map((d) => ({ id: dashed(d.id), platform: d.platform, lastSeenAt: d.lastSeenAt })) };
  }
}
