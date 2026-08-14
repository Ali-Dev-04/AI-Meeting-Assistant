import { Module } from '@nestjs/common';
import { env } from '../../../config/env';
import { STT_PROVIDER } from './stt.types';
import { WhisperProvider } from './whisper.provider';
import { DemoSttProvider } from './demo.provider';

/** Binds the STT token to the provider selected via STT_PROVIDER (whisper | demo). */
@Module({
  providers: [
    WhisperProvider,
    DemoSttProvider,
    {
      provide: STT_PROVIDER,
      useFactory: (whisper: WhisperProvider, demo: DemoSttProvider) =>
        env.STT_PROVIDER === 'whisper' ? whisper : demo,
      inject: [WhisperProvider, DemoSttProvider],
    },
  ],
  exports: [STT_PROVIDER],
})
export class SttModule {}
