import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, ParseUUIDPipe, Post, Query, Res, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IMPORT_MAX_BYTES, SPM_ROLES, regionMappingSchema, type RegionMappingRequest, type SessionUser } from '@etangguh/shared';
import type { Response } from 'express';
import { CurrentUser, Roles } from '../../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit.decorator';
import { buildErrorReport } from './error-report';
import { ImportsService } from './imports.service';
import { TemplateBuilder } from './template-builder';

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function sendXlsx(res: Response, buffer: Buffer, filename: string): StreamableFile {
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return new StreamableFile(buffer, { type: XLSX_TYPE, length: buffer.length });
}

@Controller('spm')
@Roles(...SPM_ROLES)
export class ImportsController {
  constructor(
    private readonly service: ImportsService,
    private readonly templates: TemplateBuilder,
  ) {}

  @Get('templates/:formCode')
  async template(
    @Param('formCode') formCode: string,
    @CurrentUser() user: SessionUser,
    @Res({ passthrough: true }) res: Response,
    @Query('ta') ta?: string,
  ): Promise<StreamableFile> {
    const { buffer, filename } = await this.templates.build(formCode, user, ta ? Number(ta) : undefined);
    return sendXlsx(res, buffer, filename);
  }

  @Post(':fy/imports')
  @Audit('import.upload', 'import_batches')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: IMPORT_MAX_BYTES, files: 1 } }))
  upload(
    @Param('fy', ParseIntPipe) fy: number,
    @CurrentUser() user: SessionUser,
    @UploadedFile() file: { buffer: Buffer; originalname?: string } | undefined,
    @Body() body: { formCode?: string; sheetName?: string },
  ) {
    return this.service.upload(fy, body.formCode ?? '', file, body.sheetName, user);
  }

  @Get(':fy/imports/:id')
  get(@Param('fy', ParseIntPipe) fy: number, @Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: SessionUser) {
    return this.service.get(fy, id, user);
  }

  @Get(':fy/imports/:id/errors.xlsx')
  async errors(
    @Param('fy', ParseIntPipe) fy: number,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: SessionUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const rows = await this.service.errorRows(fy, id, user);
    return sendXlsx(res, await buildErrorReport(rows), `galat-impor-${id.slice(0, 8)}.xlsx`);
  }

  @Post(':fy/imports/:id/region-mapping')
  @HttpCode(200)
  mapRegions(
    @Param('fy', ParseIntPipe) fy: number,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(regionMappingSchema)) body: RegionMappingRequest,
  ) {
    return this.service.mapRegions(fy, id, body, user);
  }

  @Post(':fy/imports/:id/confirm')
  @HttpCode(200)
  @Audit('import.confirm', 'import_batches')
  confirm(@Param('fy', ParseIntPipe) fy: number, @Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: SessionUser) {
    return this.service.confirm(fy, id, user);
  }

  @Post(':fy/imports/:id/cancel')
  @HttpCode(200)
  @Audit('import.cancel', 'import_batches')
  cancel(@Param('fy', ParseIntPipe) fy: number, @Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: SessionUser) {
    return this.service.cancel(fy, id, user);
  }
}
