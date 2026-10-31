import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, MaxLength, Min } from 'class-validator';
import { FileUploadTicketDto, SignedReadDto } from '../../students/dto/students.dto.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** What a teacher may share (ADR-0016 decision 5): PDF, pictures, Word and PowerPoint, up to 20 MB. */
export const RESOURCE_TYPES = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
} as const;
export const RESOURCE_MAX_BYTES = 20 * 1024 * 1024;

export class IdParamDto {
  @IsString() @Matches(UUID) id!: string;
}
export class ListResourcesQueryDto {
  @IsOptional() @IsString() @Matches(UUID) classId?: string;
}
export class ResourceUploadRequestDto {
  @IsString() @Matches(UUID) classId!: string;
  @IsString() @Matches(UUID) subjectId!: string;
  @IsIn(Object.keys(RESOURCE_TYPES)) contentType!: keyof typeof RESOURCE_TYPES;
  /** The exact size in bytes; the upload address accepts a body of exactly this length. */
  @IsInt() @Min(1) @Max(RESOURCE_MAX_BYTES) sizeBytes!: number;
}
export class AddResourceDto {
  @IsString() @Matches(UUID) classId!: string;
  @IsString() @Matches(UUID) subjectId!: string;
  /** The `key` the upload address came with. */
  @IsString() @MaxLength(300) key!: string;
  @Transform(trim) @IsString() @Length(1, 120) title!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(500) note?: string;
  @IsString() @Length(1, 200) fileName!: string;
}
export class ResourceDto {
  id!: string;
  title!: string;
  note!: string | null;
  class!: { id: string; name: string };
  subject!: { id: string; name: string };
  fileName!: string;
  contentType!: string;
  sizeBytes!: number;
  uploadedBy!: { id: string; name: string };
  createdAt!: string;
  updatedAt!: string;
}
export class ResourceListDto {
  items!: ResourceDto[];
}
export { FileUploadTicketDto, SignedReadDto };
