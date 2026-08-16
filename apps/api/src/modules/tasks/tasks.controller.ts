import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { TasksService } from './tasks.service';

@ApiTags('Tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'List action items across meetings (scope: mine | unassigned | all)' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('scope') scope?: string,
  ) {
    return this.tasks.list(user.id, { status, scope });
  }
}
