import {
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Put,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { createReadStream, createWriteStream, existsSync, statSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { env } from '../../config/env';
import { verifySignature } from './local.provider';

const UPLOADS_PREFIX = '/api/v1/uploads/';

const CONTENT_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
  '.webm': 'audio/webm',
  '.ogg': 'audio/ogg',
};

/**
 * Serves the local-storage provider: PUT streams a raw request body to disk, GET
 * streams it back (with Range support so <audio> seeking works). Both require the
 * HMAC signature embedded in the "presigned" URL — exactly like S3 presigned URLs,
 * so the web upload flow and pipeline download work unchanged.
 */
@Controller('uploads')
export class UploadsController {
  @Put('*')
  @HttpCode(204)
  async upload(
    @Req() req: Request,
    @Query('m') method?: string,
    @Query('exp') exp?: string,
    @Query('sig') sig?: string,
  ): Promise<void> {
    const key = keyFrom(req);
    if (!method || !exp || !sig || !verifySignature(method, key, Number(exp), sig)) {
      throw new UnauthorizedException('Invalid or expired upload URL');
    }
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    // Stream straight to disk — no size limits held in memory.
    await pipeline(req, createWriteStream(target));
  }

  @Get('*')
  async download(
    @Req() req: Request,
    @Res() res: Response,
    @Query('m') method?: string,
    @Query('exp') exp?: string,
    @Query('sig') sig?: string,
  ): Promise<void> {
    const key = keyFrom(req);
    if (!method || !exp || !sig || !verifySignature(method, key, Number(exp), sig)) {
      throw new UnauthorizedException('Invalid or expired URL');
    }
    const target = this.resolve(key);
    if (!existsSync(target)) throw new NotFoundException('Object not found');

    const size = statSync(target).size;
    const type = CONTENT_TYPES[path.extname(key).toLowerCase()] ?? 'application/octet-stream';

    // Range support (browsers request ranges for <audio> seeking).
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      if (start >= size || start > end) {
        res.status(416).set('Content-Range', `bytes */${size}`).end();
        return;
      }
      res
        .status(206)
        .set({
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(end - start + 1),
          'Content-Type': type,
        });
      createReadStream(target, { start, end }).pipe(res);
      return;
    }

    res.set({ 'Content-Length': String(size), 'Accept-Ranges': 'bytes', 'Content-Type': type });
    createReadStream(target).pipe(res);
  }

  /** Maps a storage key to an on-disk path, rejecting traversal attempts. */
  private resolve(key: string): string {
    if (!/^[\w\-./]+$/.test(key) || key.includes('..')) {
      throw new UnauthorizedException('Invalid object key');
    }
    return path.resolve(process.cwd(), env.LOCAL_STORAGE_DIR, key);
  }
}

function keyFrom(req: Request): string {
  const idx = req.path.indexOf(UPLOADS_PREFIX);
  return decodeURIComponent(req.path.slice(idx + UPLOADS_PREFIX.length));
}
