import { IsString, MaxLength } from 'class-validator';

/**
 * Only bounds the length here: the shape rules (and "reserved") live in the service so that EVERY unusable name answers the
 * same 404 instead of a 400 that tells a caller which rule it broke.
 */
export class SubdomainParamDto {
  @IsString() @MaxLength(253) sub!: string;
}
