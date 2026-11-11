import { IsBoolean, IsInt, IsString, Matches, Min } from 'class-validator';

export class RecordConsentDto {
  /** The version of the notice the parent was shown. If the school has moved on, the answer is refused so the parent reads the new one. */
  @IsInt() @Min(1) noticeVersion!: number;
  /** The language the notice was shown in, for the record (for example `en`, `hi`, `ur`). */
  @IsString() @Matches(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/) language!: string;
  /** True to give consent, false to withdraw it. */
  @IsBoolean() given!: boolean;
}

export class ConsentPurposeStatusDto {
  purpose!: string;
  required!: boolean;
  /** The parent's latest answer to this purpose; false when none. */
  given!: boolean;
  /** The notice version that answer was given to; null when none. */
  noticeVersion!: number | null;
  recordedAt!: string | null;
}

export class ConsentStatusDto {
  /** The notice version in force now. */
  noticeVersion!: number;
  purposes!: ConsentPurposeStatusDto[];
  /** True when every required purpose is consented to for the current notice version: only then does the gateway serve this parent's children's data. */
  current!: boolean;
}

export class ConsentOverviewParentDto {
  id!: string;
  name!: string;
  /** CURRENT, WITHDRAWN, OLD_VERSION (consented to an earlier notice) or NONE. */
  state!: 'CURRENT' | 'WITHDRAWN' | 'OLD_VERSION' | 'NONE';
  noticeVersion!: number | null;
  language!: string | null;
  recordedAt!: string | null;
}

export class ConsentOverviewDto {
  noticeVersion!: number;
  counts!: { parents: number; current: number; withdrawn: number; oldVersion: number; none: number };
  items!: ConsentOverviewParentDto[];
}
