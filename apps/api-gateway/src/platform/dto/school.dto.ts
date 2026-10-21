export class SchoolDto {
  id!: string;
  name!: string;
  subDomain!: string;
  /** ACTIVE, TRIAL or SUSPENDED. */
  status!: string;
  defaultLanguage!: string;
  createdAt!: string;
  /** True once the school has an active System Admin (the platform owner can add the first one only while this is false). */
  hasAdministrator!: boolean;
}

export class SchoolPageDto {
  items!: SchoolDto[];
  limit!: number;
  offset!: number;
}
