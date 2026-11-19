import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import {
  ADMIN_ROLES,
  SPM_ROLES,
  createFiscalYearSchema,
  fiscalYearSettingsSchema,
  type CreateFiscalYearRequest,
  type FiscalYearSettingsRequest,
  type SessionUser,
} from '@etangguh/shared';
import { CurrentUser, Roles } from '../../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit.decorator';
import { AuditContext } from '../../audit/audit-context';
import { FiscalYearsService } from './fiscal-years.service';

@Controller('spm/fiscal-years')
export class FiscalYearsController {
  constructor(private readonly service: FiscalYearsService) {}

  @Roles(...SPM_ROLES)
  @Get()
  async list() {
    return { items: await this.service.list() };
  }

  @Roles(...ADMIN_ROLES)
  @Post()
  @Audit('fiscal_year.create', 'fiscal_years')
  create(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(createFiscalYearSchema)) body: CreateFiscalYearRequest,
  ) {
    return this.service.create(body, user.id);
  }

  @Roles(...ADMIN_ROLES)
  @Patch(':fy/settings')
  @Audit('fiscal_year.settings', 'fiscal_years')
  async settings(
    @Param('fy', ParseIntPipe) fy: number,
    @Body(new ZodValidationPipe(fiscalYearSettingsSchema)) body: FiscalYearSettingsRequest,
  ) {
    const dto = await this.service.updateSettings(fy, body);
    AuditContext.annotate({ detail: { year: fy, fields: Object.keys(body) } });
    return dto;
  }
}
