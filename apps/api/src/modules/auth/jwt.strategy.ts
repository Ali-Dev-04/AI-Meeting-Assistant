import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { env } from '../../config/env';
import { AuthUser } from './decorators/current-user.decorator';

/**
 * Verifies access tokens from the Authorization: Bearer header. On success, Nest
 * injects the returned object as `req.user` (the @CurrentUser decorator reads it).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.JWT_ACCESS_SECRET,
    });
  }

  validate(payload: { sub: string; email: string }): AuthUser {
    return { id: payload.sub, email: payload.email };
  }
}
