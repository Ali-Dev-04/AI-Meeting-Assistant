import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreateCommentRequest,
  createCommentSchema,
  CreateMeetingRequest,
  CreateShareLinkRequest,
  createShareLinkSchema,
  UpdateActionItemRequest,
  updateActionItemSchema,
  UpdateSummaryRequest,
  updateSummarySchema,
} from '@ama/shared-types';
import { AuthUser} from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createMeetingRequestSchema, toMeetingDto } from './meetings.dto';
import { MeetingsService } from './meetings.service';

@ApiTags('Meetings')
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetings: MeetingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a meeting and get a presigned upload URL' })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createMeetingRequestSchema)) body: CreateMeetingRequest,
  ) {
    return this.meetings.createUpload(body, user.id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark upload complete and enqueue processing' })
  @HttpCode(HttpStatus.ACCEPTED)
  async complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.meetings.completeUpload(id, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List meetings (cursor-paginated)' })
  async list(
    @CurrentUser() user: AuthUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
  ) {
    return this.meetings.list(user.id, {
      cursor,
      limit: limit ? Number(limit) : undefined,
      status,
      q,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a meeting' })
  async get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const meeting = await this.meetings.getForUser(id, user.id);
    return toMeetingDto(meeting);
  }

  @Get(':id/transcript')
  @ApiOperation({ summary: 'Get the transcript' })
  transcript(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.meetings.getTranscript(id, user.id);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Get the AI summary' })
  summary(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.meetings.getSummary(id, user.id);
  }

  @Patch(':id/summary')
  @ApiOperation({ summary: 'Edit the summary (overview and/or key points)' })
  updateSummary(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSummarySchema)) body: UpdateSummaryRequest,
  ) {
    return this.meetings.updateSummary(id, body, user.id);
  }

  @Get(':id/action-items')
  @ApiOperation({ summary: 'List action items' })
  actionItems(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.meetings.getActionItems(id, user.id);
  }

  @Patch(':id/action-items/:itemId')
  @ApiOperation({ summary: 'Update an action item (status, assignee, due date)' })
  updateActionItem(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(updateActionItemSchema)) body: UpdateActionItemRequest,
  ) {
    return this.meetings.updateActionItem(id, itemId, body, user.id);
  }

  @Get(':id/decisions')
  @ApiOperation({ summary: 'List decisions' })
  decisions(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.meetings.getDecisions(id, user.id);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'List comments & highlights' })
  comments(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.meetings.getComments(id, user.id);
  }

  @Post(':id/comments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a comment or highlight' })
  createComment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createCommentSchema)) body: CreateCommentRequest,
  ) {
    return this.meetings.createComment(id, body, user.id);
  }

  @Delete(':id/comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a comment (author or admin/owner)' })
  deleteComment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
  ) {
    return this.meetings.deleteComment(id, commentId, user.id);
  }

  @Get(':id/share-links')
  @ApiOperation({ summary: 'List share links for a meeting' })
  shareLinks(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.meetings.listShareLinks(id, user.id);
  }

  @Post(':id/share-links')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a share link' })
  createShareLink(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createShareLinkSchema)) body: CreateShareLinkRequest,
  ) {
    return this.meetings.createShareLink(id, body, user.id);
  }

  @Delete(':id/share-links/:linkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a share link' })
  revokeShareLink(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('linkId') linkId: string,
  ) {
    return this.meetings.revokeShareLink(id, linkId, user.id);
  }

  @Get(':id/media')
  @ApiOperation({ summary: 'Get a playback URL' })
  media(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.meetings.getPlaybackUrl(id, user.id);
  }
}
