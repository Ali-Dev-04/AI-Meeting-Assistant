import { OnModuleDestroy } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../config/env';

/**
 * S3-compatible object storage (AWS S3 in prod, MinIO locally). Media files and
 * exports go here — never in the database. Abstracted behind a service so the
 * provider is swappable (S3, GCS, Azure Blob) without touching callers.
 */
@Injectable()
export class StorageService implements OnModuleDestroy {
  private readonly client: S3Client;

  constructor() {
    this.client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
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

  async onModuleDestroy() {
    this.client.destroy();
  }
}
