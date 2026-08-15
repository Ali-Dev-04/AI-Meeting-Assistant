import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../config/env';
import { IStorage } from './storage.types';

/**
 * S3-compatible object storage (AWS S3 in prod, MinIO locally). Media files and
 * exports go here — never in the database. Selected via STORAGE_PROVIDER=s3.
 */
@Injectable()
export class S3StorageProvider implements IStorage, OnModuleDestroy {
  private readonly client: S3Client;

  constructor() {
    this.client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID ?? '',
        secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? '',
      },
      forcePathStyle: env.S3_FORCE_PATH_STYLE, // required for MinIO
    });
  }

  /** Short-lived URL the browser PUTs the file to directly (never proxied by the API). */
  getPresignedPutUrl(key: string, contentType: string, expiresIn = 900): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, ContentType: contentType }),
      { expiresIn },
    );
  }

  /** Short-lived URL for playback/download of a stored object. */
  getPresignedGetUrl(key: string, expiresIn = 3600): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }), {
      expiresIn,
    });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: body, ContentType: contentType }),
    );
  }

  async onModuleDestroy() {
    this.client.destroy();
  }
}
