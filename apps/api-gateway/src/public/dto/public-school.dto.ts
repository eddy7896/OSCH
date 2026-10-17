/** The only things a stranger may learn about a school, and only the school's own login page needs them. */
export class PublicSchoolDto {
  id!: string;
  name!: string;
  subDomain!: string;
  /** The school's default language (users still choose their own). */
  defaultLanguage!: string;
}
