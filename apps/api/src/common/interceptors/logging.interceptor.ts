import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { Observable} from 'rxjs';
import { tap } from 'rxjs';

/** Logs one line per request: METHOD url duration [requestId]. */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { id?: string }>();
    const startedAt = Date.now();
    return next.handle().pipe(
      tap(() =>
        this.logger.log(`${request.method} ${request.url} ${Date.now() - startedAt}ms`),
      ),
    );
  }
}
