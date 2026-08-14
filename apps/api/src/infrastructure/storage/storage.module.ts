import { Global, Module } from '@nestjs/common';
import { env } from '../../config/env';
import { STORAGE } from './storage.types';
import { S3StorageProvider } from './s3.provider';
import { LocalStorageProvider } from './local.provider';
import { UploadsController } from './uploads.controller';

/**
 * Binds the STORAGE token to the provider selected via STORAGE_PROVIDER
 * (local | s3). The uploads controller serves local-mode objects.
 */
@Global()
@Module({
  controllers: [UploadsController],
  providers: [
    S3StorageProvider,
    LocalStorageProvider,
    {
      provide: STORAGE,
      useFactory: (s3: S3StorageProvider, local: LocalStorageProvider) =>
        env.STORAGE_PROVIDER === 's3' ? s3 : local,
      inject: [S3StorageProvider, LocalStorageProvider],
    },
  ],
  exports: [STORAGE],
})
export class StorageModule {}
