import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { StatsService } from './stats.service';

@ApiTags('Stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get()
  @ApiOperation({ summary: 'Workspace overview stats for the dashboard' })
  get(@CurrentUser() user: AuthUser) {
    return this.stats.get(user.id);
  }
}
