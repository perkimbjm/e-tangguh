import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { SPM_ROLES, type SessionUser } from '@etangguh/shared';
import { CurrentUser, Roles } from '../../../common/decorators/roles.decorator';
import { Audit } from '../../audit/audit.decorator';
import { RecapDrilldownService } from './recap-drilldown.service';
import { RecapService } from './recap.service';

@Controller('spm/:fy/recap/:formCode')
@Roles(...SPM_ROLES)
export class RecapController {
  constructor(
    private readonly recap: RecapService,
    private readonly drill: RecapDrilldownService,
  ) {}

  @Get()
  table(@Param('fy', ParseIntPipe) fy: number, @Param('formCode') formCode: string, @CurrentUser() user: SessionUser) {
    return this.recap.table(fy, formCode, user);
  }

  @Get('cells/:cellKey/rows')
  @Audit('recap.drilldown', 'recap')
  rows(@Param('fy', ParseIntPipe) fy: number, @Param('formCode') formCode: string, @Param('cellKey') cellKey: string, @CurrentUser() user: SessionUser) {
    return this.drill.drill(fy, formCode, cellKey, user);
  }
}
