import { Controller, Get, Param, ParseUUIDPipe, Res, StreamableFile } from '@nestjs/common';
import { ROLES, type SessionUser } from '@etangguh/shared';
import type { Response } from 'express';
import { CurrentUser, Roles } from '../../common/decorators/roles.decorator';
import { Audit } from '../audit/audit.decorator';
import { AuditContext } from '../audit/audit-context';
import { FilesService } from './files.service';

@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Roles(...ROLES)
  @Get(':id')
  @Audit('file.download', 'files')
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: SessionUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const row = await this.files.authorize(id, user);
    AuditContext.annotate({ entityId: row.id, detail: { kind: row.kind } });
    const data = await this.files.read(row);
    res.setHeader('Content-Disposition', `attachment; filename="berkas-${row.id}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(data, { type: row.mime, length: data.length });
  }
}
