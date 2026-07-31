import { Module } from '@nestjs/common';
import { STT_PROVIDER } from './stt.types';
import { WhisperProvider } from './whisper.provider';

@Module({
  providers: [{ provide: STT_PROVIDER, useClass: WhisperProvider }],
  exports: [STT_PROVIDER],
})
export class SttModule {}
