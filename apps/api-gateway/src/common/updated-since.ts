import { applyDecorators } from '@nestjs/common';
import { IsISO8601, IsOptional, MaxLength } from 'class-validator';

/**
 * `updatedSince` on a list a phone pulls (P4-S1): only what changed at or after this moment, so a phone does not fetch a whole list
 * each time. The moment is one the server gave in `next` (the database's clock, never the phone's: offline-sync rule 4).
 */
export const UpdatedSince = () => applyDecorators(IsOptional(), IsISO8601({ strict: true }), MaxLength(40));

/**
 * The moment to ask from next time: the newest change among the rows, floored to the millisecond so that a row can be listed again
 * (harmless: a phone replaces a record with itself) but never missed. With no rows the moment given stays, so a quiet list does not
 * move the cursor; with neither it is null and the next ask is a full list.
 */
export function nextCursor(rows: ReadonlyArray<{ updatedAt?: string | null }>, given?: string): string | null {
  let newest = given ? new Date(given).getTime() : Number.NEGATIVE_INFINITY;
  for (const r of rows) {
    const t = r.updatedAt ? new Date(r.updatedAt).getTime() : Number.NaN;
    if (!Number.isNaN(t) && t > newest) newest = t;
  }
  return Number.isFinite(newest) ? new Date(newest).toISOString() : null;
}
