import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ADMIN_ROLES,
  BPBD_ROLES,
  SPM_ROLES,
  createFiscalYearSchema,
  fiscalYearSettingsSchema,
  revisionSchema,
  type CreateFiscalYearRequest,
  type FiscalYearSettingsRequest,
  type RevisionRequest,
  type SessionUser,
} from '@etangguh/shared';
import type { Response } from 'express';
import { CurrentUser, Roles } from '../../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit.decorator';
import { AuditContext } from '../../audit/audit-context';
import { CopyForwardService } from './copy-forward.service';
import { FinalizeService } from './finalize.service';
import { FiscalYearsService, toFiscalYearDto } from './fiscal-years.service';
import { RevisionService } from './revision.service';

@Controller('spm/fiscal-years')
export class FiscalYearsController {
  constructor(
    private readonly service: FiscalYearsService,
    private readonly finalizer: FinalizeService,
    private readonly revisions: RevisionService,
    private readonly copier: CopyForwardService,
  ) {}

  @Roles(...SPM_ROLES)
  @Get()
  async list() {
    return { items: await this.service.list() };
  }

  @Roles(...ADMIN_ROLES)
  @Post()
  @Audit('fiscal_year.create', 'fiscal_years')
  async create(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(createFiscalYearSchema)) body: CreateFiscalYearRequest,
  ) {
    if (body.copyFrom !== undefined) return this.copier.copy(body.year, body.copyFrom, user);
    const row = await this.service.create(body, user.id);
    AuditContext.annotate({ entityId: row.id });
    return toFiscalYearDto(row);
  }

  @Roles(...ADMIN_ROLES)
  @Patch(':fy/settings')
  @Audit('fiscal_year.settings', 'fiscal_years')
  async settings(
    @Param('fy', ParseIntPipe) fy: number,
    @Body(new ZodValidationPipe(fiscalYearSettingsSchema)) body: FiscalYearSettingsRequest,
  ) {
    const dto = await this.service.updateSettings(fy, body);
    AuditContext.annotate({ entityId: dto.id, detail: { year: fy, fields: Object.keys(body) } });
    return dto;
  }

  @Roles(...ADMIN_ROLES)
  @Post(':fy/finalize')
  @Audit('fiscal_year.finalize', 'fiscal_years')
  finalize(@Param('fy', ParseIntPipe) fy: number, @CurrentUser() user: SessionUser) {
    return this.finalizer.finalize(fy, user);
  }

  @Roles(...ADMIN_ROLES)
  @Post(':fy/revisions')
  @Audit('fiscal_year.revision', 'fiscal_years')
  revision(
    @Param('fy', ParseIntPipe) fy: number,
    @Body(new ZodValidationPipe(revisionSchema)) body: RevisionRequest,
  ) {
    return this.revisions.open(fy, body);
  }

  @Roles(...BPBD_ROLES)
  @Get(':fy/snapshots')
  async snapshots(@Param('fy', ParseIntPipe) fy: number) {
    return { items: await this.revisions.snapshots(fy) };
  }

  @Roles(...BPBD_ROLES)
  @Get(':fy/snapshots/:rev/archive')
  @Audit('fiscal_year.archive_download', 'fiscal_year_snapshots')
  async archive(
    @Param('fy', ParseIntPipe) fy: number,
    @Param('rev', ParseIntPipe) rev: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const a = await this.revisions.archive(fy, rev);
    res.setHeader('Content-Disposition', `attachment; filename="${a.filename}"`);
    res.setHeader('X-Content-SHA256', a.sha256);
    res.setHeader('Cache-Control', 'no-store');
    return new StreamableFile(a.buffer, { type: 'application/zip', length: a.buffer.length });
  }
}
