import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { durationToSeconds, randomToken, sha256 } from './auth.util';
import { env } from '../../config/env';

interface AuthPayload {
  id: string;
  email: string;
}

/**
 * Token management:
 * - Access token: short-lived JWT (15m), verified by signature.
 * - Refresh token: opaque, stored HASHED in a Redis whitelist keyed by the hash.
 *   Rotation: every refresh invalidates the old token and mints a new one, so reuse
 *   of a stolen token is detectable and the session can be revoked instantly.
 */
@Injectable()
export class TokenService {
  private readonly refreshTtl = durationToSeconds(env.JWT_REFRESH_EXPIRES_IN);

  constructor(private readonly jwt: JwtService, private readonly redis: RedisService) {}

  signAccessToken(user: AuthPayload): string {
    return this.jwt.sign({ sub: user.id, email: user.email });
  }

  async issueRefreshToken(userId: string): Promise<string> {
    const token = randomToken();
    await this.redis.client.set(this.key(token), userId, 'EX', this.refreshTtl);
    return token;
  }

  /** Validate the presented refresh token, invalidate it, and issue a fresh one. */
  async rotateRefreshToken(
    token: string,
  ): Promise<{ userId: string; refreshToken: string } | null> {
    const userId = await this.redis.client.get(this.key(token));
    if (!userId) return null; // unknown/expired/already-rotated
    await this.redis.client.del(this.key(token)); // single-use
    const refreshToken = await this.issueRefreshToken(userId);
    return { userId, refreshToken };
  }

  async revokeRefreshToken(token?: string): Promise<void> {
    if (!token) return;
    await this.redis.client.del(this.key(token));
  }

  private key(token: string): string {
    return `auth:refresh:${sha256(token)}`;
  }
}
