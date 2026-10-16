import { ValidationPipe, type ValidationError } from '@nestjs/common';
import { ApiException, ErrorCode, type ErrorDetail } from './errors.js';

const MAX_DETAILS = 20;

/** Field path and rule name for every violation; the submitted value is never copied into the response. */
export function toDetails(errors: readonly ValidationError[], prefix = ''): ErrorDetail[] {
  const out: ErrorDetail[] = [];
  for (const e of errors) {
    const field = prefix ? `${prefix}.${e.property}` : e.property;
    for (const rule of Object.keys(e.constraints ?? {})) out.push({ field, rule });
    if (e.children?.length) out.push(...toDetails(e.children, field));
  }
  return out;
}

/**
 * The only input pipeline (ADR-0008): a request body or query is accepted only if it matches a DTO class exactly.
 * Unknown properties are rejected, not ignored, so a `schoolId`, `globalRole` or `schoolRole` in a body is a 400.
 */
export const createValidationPipe = () =>
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    exceptionFactory: (errors) => new ApiException(ErrorCode.INVALID_REQUEST, 400, toDetails(errors).slice(0, MAX_DETAILS)),
  });
