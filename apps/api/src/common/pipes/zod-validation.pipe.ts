import { type PipeTransform } from '@nestjs/common';
import type { ZodError, ZodTypeAny, z } from 'zod';
import { ApiException, type FieldErrors } from '../errors/api-exception';

export function zodFieldErrors(error: ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_';
    fields[key] ??= issue.message;
  }
  return fields;
}

/** Memvalidasi masukan dengan skema Zod bersama; galat dipetakan ke `fields`. */
export class ZodValidationPipe<S extends ZodTypeAny> implements PipeTransform<unknown, z.infer<S>> {
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.infer<S> {
    const result = this.schema.safeParse(value);
    if (!result.success) throw ApiException.validation(zodFieldErrors(result.error));
    return result.data;
  }
}
