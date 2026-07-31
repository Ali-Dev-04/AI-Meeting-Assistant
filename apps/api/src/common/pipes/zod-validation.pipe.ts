import { ArgumentMetadata, PipeTransform } from '@nestjs/common';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ZodSchema } from 'zod';
import { ZodError } from 'zod';

/**
 * Validates incoming payloads against a Zod schema. We use Zod (not class-validator)
 * so the SAME schemas from @ama/shared-types validate on both client and server —
 * the contract is defined once. On failure, throws 422 VALIDATION_ERROR with
 * field-level details, matching the API spec.
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: T, _metadata: ArgumentMetadata): T {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new HttpException(
          {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed.',
            details: error.issues.map((issue) => ({
              field: issue.path.join('.'),
              issue: issue.message,
            })),
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
      throw error;
    }
  }
}
