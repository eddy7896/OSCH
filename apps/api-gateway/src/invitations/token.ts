import { createHash, randomBytes } from 'node:crypto';

/** 32 random bytes as base64url: 256 bits, 43 characters. Shown to the inviter once; only its hash is stored. */
export const newInvitationToken = (): string => randomBytes(32).toString('base64url');
export const INVITATION_TOKEN = /^[A-Za-z0-9_-]{43}$/;
export const hashInvitationToken = (token: string): string => createHash('sha256').update(token).digest('hex');
