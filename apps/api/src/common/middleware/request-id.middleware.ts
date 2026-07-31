import { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

/**
 * Assigns each request a stable id (honoring an inbound X-Request-Id) and echoes it
 * back in a response header. The id is attached to logs and error envelopes so any
 * failure can be traced end-to-end.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: Request & { id?: string }, response: Response, next: NextFunction) {
    request.id = (request.headers['x-request-id'] as string) || randomUUID();
    response.setHeader('X-Request-Id', request.id);
    next();
  }
}
