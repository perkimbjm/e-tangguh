import { Body, Controller, HttpCode, Param, ParseIntPipe, Post } from '@nestjs/common';
import {
  BPBD_ROLES,
  approveResidentsSchema,
  returnResidentsSchema,
  type ApproveResidentsRequest,
  type ReturnResidentsRequest,
  type SessionUser,
} from '@etangguh/shared';
import { CurrentUser, Roles } from '../../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit.decorator';
import { ApprovalService } from './approval.service';

@Controller('spm/:fy/residents')
@Roles(...BPBD_ROLES)
export class ApprovalController {
  constructor(private readonly service: ApprovalService) {}

  @Post('approve')
  @HttpCode(200)
  @Audit('resident.approve', 'resident_records')
  approve(
    @Param('fy', ParseIntPipe) fy: number,
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(approveResidentsSchema)) body: ApproveResidentsRequest,
  ) {
    return this.service.approve(fy, body, user);
  }

  @Post('return')
  @HttpCode(200)
  @Audit('resident.return', 'resident_records')
  returnRows(
    @Param('fy', ParseIntPipe) fy: number,
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(returnResidentsSchema)) body: ReturnResidentsRequest,
  ) {
    return this.service.returnRows(fy, body, user);
  }
}
