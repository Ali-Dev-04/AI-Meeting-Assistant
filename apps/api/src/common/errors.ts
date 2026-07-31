import { HttpException, HttpStatus } from '@nestjs/common';

interface AppErrorOptions {
  code: string;
  status: HttpStatus;
  message: string;
  details?: unknown;
}

/**
 * Base class for all application errors. Carries a stable `code` (machine-readable)
 * so clients can branch on it, and a human `message`. The global exception filter
 * turns these into the standard error envelope.
 */
export class AppError extends HttpException {
  constructor(opts: AppErrorOptions) {
    super({ code: opts.code, message: opts.message, details: opts.details }, opts.status);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super({ code: 'NOT_FOUND', status: HttpStatus.NOT_FOUND, message: `${resource} not found.` });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to do that.') {
    super({ code: 'FORBIDDEN', status: HttpStatus.FORBIDDEN, message });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'A record with this value already exists.') {
    super({ code: 'CONFLICT', status: HttpStatus.CONFLICT, message });
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super({ code: 'VALIDATION_ERROR', status: HttpStatus.UNPROCESSABLE_ENTITY, message, details });
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'Authentication required.') {
    super({ code: 'UNAUTHENTICATED', status: HttpStatus.UNAUTHORIZED, message });
  }
}

export class QuotaExceededError extends AppError {
  constructor(message = 'You have reached your plan limit for this period.') {
    super({ code: 'QUOTA_EXCEEDED', status: HttpStatus.PAYMENT_REQUIRED, message });
  }
}
