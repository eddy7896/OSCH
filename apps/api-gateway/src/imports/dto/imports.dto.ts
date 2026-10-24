import { IsString, Length } from 'class-validator';

export const MAX_CSV_CHARS = 1_000_000;

export class ImportRequestDto {
  /** The whole CSV file as text (UTF-8). The first row names the columns. At most 500 data rows. */
  @IsString() @Length(1, MAX_CSV_CHARS) csv!: string;
}

export class ImportProblemDto {
  /** The row as a spreadsheet numbers it: the header is row 1. */
  row!: number;
  /** The column header as written in the file; absent for a problem with the whole row or file. */
  column?: string;
  /** A machine-readable rule, for example `required`, `isIn`, `matches`, `duplicateInFile`, `unknownClass`. Clients translate it. */
  rule!: string;
  /** For `duplicateInFile`: the earlier row it repeats. */
  ref?: number;
}
export class ImportColumnsDto {
  /** Headers the import understood. */
  recognized!: string[];
  /** Headers it did not understand; these columns are skipped. */
  ignored!: string[];
  /** Columns that must be present but are not. */
  missingRequired!: string[];
}
export class ImportReportDto {
  kind!: string;
  /** SHA-256 of the file: the same file cannot be imported twice. */
  fileHash!: string;
  totalRows!: number;
  validRows!: number;
  errorRows!: number;
  columns!: ImportColumnsDto;
  problems!: ImportProblemDto[];
  /** True when there were more problems than are listed. */
  problemsTruncated!: boolean;
  /** Things worth a look that do not stop the import (for example a student who may already exist). */
  warnings!: ImportProblemDto[];
  /** True when this exact file was imported before. */
  alreadyImported!: boolean;
  /** True when the import would be accepted as it is. */
  canImport!: boolean;
}
export class ImportRowResultDto {
  row!: number;
  id!: string;
  /** The enrolment or employee number given, for students and staff. */
  number?: string;
}
export class ImportResultDto {
  batchId!: string;
  /** COMPLETED, or PARTIAL when some rows failed after the checks passed. */
  status!: string;
  createdCount!: number;
  failedCount!: number;
  created!: ImportRowResultDto[];
  failures!: ImportProblemDto[];
}
