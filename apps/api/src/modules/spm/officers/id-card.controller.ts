import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ADMIN_ROLES,
  BPBD_ROLES,
  idCardSettingsSchema,
  type IdCardSettings,
  type SessionUser,
} from '@etangguh/shared';
import type { Response } from 'express';
import { CurrentUser, Public, Roles } from '../../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit.decorator';
import { IdCardService } from './id-card.service';

@Controller()
export class IdCardController {
  constructor(private readonly service: IdCardService) {}

  @Roles(...BPBD_ROLES)
  @Get('spm/id-card/settings')
  settings() {
    return this.service.settings();
  }

  @Roles(...ADMIN_ROLES)
  @Put('spm/id-card/settings')
  @Audit('id_card.settings', 'app_settings')
  saveSettings(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(idCardSettingsSchema)) body: IdCardSettings,
  ) {
    return this.service.saveSettings(body, user);
  }

  @Roles(...BPBD_ROLES)
  @Get('spm/:fy/officers/:id/id-card')
  @Audit('officer.id_card', 'officer_records')
  card(@Param('fy', ParseIntPipe) fy: number, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.card(fy, id);
  }

  @Roles(...BPBD_ROLES)
  @Post('spm/:fy/officers/:id/photo')
  @HttpCode(200)
  @Audit('officer.photo_upload', 'officer_records')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 2 * 1024 * 1024, files: 1 } }))
  upload(
    @Param('fy', ParseIntPipe) fy: number,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: SessionUser,
    @UploadedFile() file: { buffer: Buffer } | undefined,
  ) {
    return this.service.setPhoto(fy, id, file?.buffer, user);
  }

  @Roles(...BPBD_ROLES)
  @Delete('spm/:fy/officers/:id/photo')
  @HttpCode(204)
  @Audit('officer.photo_delete', 'officer_records')
  async removePhoto(
    @Param('fy', ParseIntPipe) fy: number,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.service.removePhoto(fy, id);
  }

  @Roles(...BPBD_ROLES)
  @Get('spm/:fy/officers/:id/photo')
  async photo(
    @Param('fy', ParseIntPipe) fy: number,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const p = await this.service.photo(fy, id);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(p.data, { type: p.mime, length: p.data.length });
  }

  /** Verifikasi publik dari QR kartu; tanpa NIK, foto, atau kontak. */
  @Public()
  @Get('public/verify/:code')
  verify(@Param('code') code: string, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex');
    return this.service.verify(code);
  }
}
