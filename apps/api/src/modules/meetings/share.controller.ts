import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { MeetingsService } from './meetings.service';

/**
 * Public share-link reader. Separate controller (prefix `share`) so the public
 * route lives at /api/v1/share/:token, NOT under /meetings. The @Public()
 * decorator lets the global JwtAuthGuard skip it; validity is enforced in the
 * service by checking the token's revoked/expired state.
 */
@ApiTags('Share')
@Controller('share')
export class ShareController {
  constructor(private readonly meetings: MeetingsService) {}

  @Public()
  @Get(':token')
  @ApiOperation({ summary: 'Public read-only view of a shared meeting' })
  shared(@Param('token') token: string) {
    return this.meetings.getSharedView(token);
  }
}
