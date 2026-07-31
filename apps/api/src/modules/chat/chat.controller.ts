import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { askQuestionSchema, type AskQuestion } from '@ama/shared-types';
import { AuthUser} from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ChatService } from './chat.service';

/**
 * Meeting Q&A. Shares the `/meetings` prefix; chat routes (:id/chat/...) don't
 * collide with the meeting CRUD routes. The message endpoint streams a Server-Sent
 * Events response (token → citations → done) that the frontend reads incrementally.
 */
@ApiTags('Chat')
@Controller('meetings')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post(':id/chat/conversations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start a chat conversation for a meeting' })
  createConversation(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chat.createConversation(id, user.id);
  }

  @Get(':id/chat/conversations/:conversationId/messages')
  @ApiOperation({ summary: 'List messages in a conversation' })
  listMessages(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.chat.listMessages(id, conversationId, user.id);
  }

  @Post(':id/chat/conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Ask a question (SSE stream)' })
  async message(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('conversationId') conversationId: string,
    @Body(new ZodValidationPipe(askQuestionSchema)) body: AskQuestion,
    @Res() response: Response,
  ) {
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no'); // disable proxy buffering

    const send = (event: string, data: unknown) =>
      response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    try {
      const { citations, assistantMessageId } = await this.chat.streamAnswer(
        id,
        conversationId,
        body.question,
        user.id,
        (delta) => send('token', { delta }),
      );
      send('citations', { segmentIndexes: citations });
      send('done', { messageId: assistantMessageId });
    } catch (error) {
      send('error', { message: error instanceof Error ? error.message : 'Chat failed.' });
    } finally {
      response.end();
    }
  }
}
