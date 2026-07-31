import { ArgumentsHost, ExceptionFilter} from '@nestjs/common';
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';

const STATUS_TO_CODE: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_ERROR',
  429: 'RATE_LIMITED',
  500: 'INTERNAL',
  503: 'SERVICE_UNAVAILABLE',
};

/**
 * Global exception filter. Translates every error into the single envelope the
 * frontend expects (docs/api.md §4): { error: { code, message, details, requestId } }.
 * Also maps Prisma errors to sensible HTTP codes.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string }>();
    const requestId = request.id ?? randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = STATUS_TO_CODE[status] ?? 'INTERNAL';
    let message = 'Internal server error.';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        message = payload;
        code = STATUS_TO_CODE[status] ?? 'ERROR';
      } else if (payload && typeof payload === 'object') {
        const obj = payload as Record<string, unknown>;
        code = (obj.code as string) ?? STATUS_TO_CODE[status] ?? 'ERROR';
        message = (obj.message as string) ?? exception.message;
        details = obj.details;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = this.mapPrismaError(exception);
      status = mapped.status;
      code = mapped.code;
      message = mapped.message;
    } else {
      this.logger.error(
        `[${requestId}] Unhandled exception`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    if (status >= 500) {
      this.logger.error(`[${requestId}] ${code}: ${message}`);
    }

    response.setHeader('X-Request-Id', requestId);
    response.status(status).json({ error: { code, message, details, requestId } });
  }

  private mapPrismaError(error: Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': // unique constraint violation
        return { status: HttpStatus.CONFLICT, code: 'CONFLICT', message: 'A record with this value already exists.' };
      case 'P2025': // record not found
        return { status: HttpStatus.NOT_FOUND, code: 'NOT_FOUND', message: 'Record not found.' };
      default:
        return { status: HttpStatus.BAD_REQUEST, code: 'BAD_REQUEST', message: error.message };
    }
  }
}
