import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SearchMode } from '@ama/shared-types';
import { AuthUser} from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search meetings (keyword / semantic / hybrid)' })
  async query(
    @CurrentUser() user: AuthUser,
    @Query('q') q?: string,
    @Query('mode') mode?: string,
  ) {
    return this.search.search(user.id, q ?? '', (mode as SearchMode) ?? 'hybrid');
  }
}
