import { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';

export interface AuthUser {
  id: string;
  email: string;
}

/** Extracts the authenticated user (set by JwtStrategy) from the request. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => context.switchToHttp().getRequest().user,
);
