import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AskQuestion, askQuestionSchema } from '@ama/shared-types';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AssistantService } from './assistant.service';

@ApiTags('Assistant')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Post('ask')
  @ApiOperation({ summary: 'Ask a question across ALL meetings (SSE stream)' })
  async ask(
    @CurrentUser() user: AuthUser,
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
      const sources = await this.assistant.ask(user.id, body.question, (delta) =>
        send('token', { delta }),
      );
      send('sources', { sources });
      send('done', {});
    } catch (error) {
      send('error', { message: error instanceof Error ? error.message : 'Assistant failed.' });
    } finally {
      response.end();
    }
  }
}
