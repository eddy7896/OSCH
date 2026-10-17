export class SchoolDto {
  id!: string;
  name!: string;
  subDomain!: string;
  /** ACTIVE, TRIAL or SUSPENDED. */
  status!: string;
  defaultLanguage!: string;
  createdAt!: string;
}

export class SchoolPageDto {
  items!: SchoolDto[];
  limit!: number;
  offset!: number;
}
