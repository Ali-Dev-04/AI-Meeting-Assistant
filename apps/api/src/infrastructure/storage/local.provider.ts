import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env';
import { IStorage } from './storage.types';

/**
 * Local-filesystem storage behind the SAME presigned-URL contract as S3: "presigned"
 * URLs point at this API's /api/v1/uploads endpoint and carry an HMAC signature +
 * expiry that UploadsController validates. Lets the whole upload pipeline (browser
 * upload → worker download → audio playback) run with zero external services.
 * Selected via STORAGE_PROVIDER=local (default).
 */
@Injectable()
export class LocalStorageProvider implements IStorage {
  async getPresignedPutUrl(key: string, _contentType: string, expiresIn = 900): Promise<string> {
    return this.signedUrl('PUT', key, expiresIn);
  }

  async getPresignedGetUrl(key: string, expiresIn = 3600): Promise<string> {
    return this.signedUrl('GET', key, expiresIn);
  }

  private signedUrl(method: 'PUT' | 'GET', key: string, expiresIn: number): string {
    const exp = Date.now() + expiresIn * 1000;
    const sig = sign(`${method}:${key}:${exp}`);
    return `${env.API_BASE_URL}/api/v1/uploads/${encodeURIComponent(key)}?m=${method}&exp=${exp}&sig=${sig}`;
  }
}

/** HMAC over "method:key:exp" with the JWT access secret (shared with UploadsController). */
export function sign(payload: string): string {
  return createHmac('sha256', env.JWT_ACCESS_SECRET).update(payload).digest('hex');
}

export function verifySignature(method: string, key: string, exp: number, sig: string): boolean {
  if (!Number.isFinite(exp) || exp < Date.now()) return false; // expired or malformed
  const expected = sign(`${method}:${key}:${exp}`);
  if (expected.length !== sig.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}
