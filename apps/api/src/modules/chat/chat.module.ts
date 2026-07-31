import { Module } from '@nestjs/common';
import { AiModule } from '../../infrastructure/ai/ai.module';
import { MeetingsModule } from '../meetings/meetings.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [AiModule, MeetingsModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
