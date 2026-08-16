import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  InviteValues,
  inviteSchema,
  UpdateMemberRoleRequest,
  updateMemberRoleSchema,
} from '@ama/shared-types';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { WorkspacesService } from './workspaces.service';

@ApiTags('Workspaces')
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get()
  @ApiOperation({ summary: 'List my workspaces' })
  async list(@CurrentUser() user: AuthUser) {
    return this.workspaces.listForUser(user.id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List workspace members' })
  async members(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.workspaces.listMembers(user.id, id);
  }

  @Post(':id/invitations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invite by email (returns a shareable invite link)' })
  async invite(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(inviteSchema)) body: InviteValues,
  ) {
    return this.workspaces.invite(id, user.id, body);
  }

  @Get(':id/invitations')
  @ApiOperation({ summary: 'List pending invitations' })
  async invitations(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.workspaces.listInvitations(id, user.id);
  }

  @Delete(':id/invitations/:invitationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke an invitation' })
  async revokeInvitation(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.workspaces.revokeInvitation(id, invitationId, user.id);
  }

  @Patch(':id/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Change a member's role (Owner only)" })
  async updateMemberRole(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body(new ZodValidationPipe(updateMemberRoleSchema)) body: UpdateMemberRoleRequest,
  ) {
    return this.workspaces.updateMemberRole(id, memberId, user.id, body);
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member (Owner/Admin; the Owner is protected)' })
  async removeMember(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.workspaces.removeMember(id, memberId, user.id);
  }
}
