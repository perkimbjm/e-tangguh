import { Controller, Get, Param, ParseIntPipe, Query, Res, StreamableFile } from '@nestjs/common';
import { BPBD_ROLES, SPM_ROLES, type SessionUser } from '@etangguh/shared';
import type { Response } from 'express';
import { CurrentUser, Roles } from '../../../common/decorators/roles.decorator';
import { Audit } from '../../audit/audit.decorator';
import { type ExportFile, ExportsService } from './exports.service';

function send(res: Response, f: ExportFile): StreamableFile {
  res.setHeader('Content-Disposition', `attachment; filename="${f.filename}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  return new StreamableFile(f.buffer, { type: f.mime, length: f.buffer.length });
}

@Controller('spm/:fy/forms')
export class ExportsController {
  constructor(private readonly exports: ExportsService) {}

  // Didaftarkan sebelum ':formCode/export' agar "export-all" tidak dianggap kode formulir.
  @Roles(...BPBD_ROLES)
  @Get('export-all')
  @Audit('export.all', 'forms')
  async all(@Param('fy', ParseIntPipe) fy: number, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    return send(res, await this.exports.exportAll(fy));
  }

  @Roles(...SPM_ROLES)
  @Get(':formCode/export')
  @Audit('export.form', 'forms')
  async one(
    @Param('fy', ParseIntPipe) fy: number,
    @Param('formCode') formCode: string,
    @CurrentUser() user: SessionUser,
    @Res({ passthrough: true }) res: Response,
    @Query('format') format = 'xlsx',
    @Query('kelurahan') kelurahan?: string,
  ): Promise<StreamableFile> {
    return send(res, await this.exports.exportOne(fy, formCode, format, kelurahan, user));
  }
}
