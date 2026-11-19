import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { SPM_ROLES, type SessionUser } from '@etangguh/shared';
import { CurrentUser, Roles } from '../../../common/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';

@Controller('spm/:fy/dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Roles(...SPM_ROLES)
  @Get()
  get(@Param('fy', ParseIntPipe) fy: number, @CurrentUser() user: SessionUser) {
    return this.service.get(fy, user);
  }
}
