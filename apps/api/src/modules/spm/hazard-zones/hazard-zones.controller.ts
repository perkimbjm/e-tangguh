import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ADMIN_ROLES,
  SPM_ROLES,
  hazardZoneSchema,
  updateHazardZoneSchema,
  type HazardZoneRequest,
  type SessionUser,
  type UpdateHazardZoneRequest,
} from '@etangguh/shared';
import { CurrentUser, Roles } from '../../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit.decorator';
import { HazardZonesService } from './hazard-zones.service';

@Controller('spm/:fy/hazard-zones')
export class HazardZonesController {
  constructor(private readonly service: HazardZonesService) {}

  @Roles(...SPM_ROLES)
  @Get()
  async list(@Param('fy', ParseIntPipe) fy: number, @CurrentUser() user: SessionUser, @Query('kelurahan') kelurahan?: string) {
    return { items: await this.service.list(fy, user, kelurahan || undefined) };
  }

  @Roles(...ADMIN_ROLES)
  @Post()
  @Audit('hazard_zone.create', 'hazard_zones')
  create(
    @Param('fy', ParseIntPipe) fy: number,
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(hazardZoneSchema)) body: HazardZoneRequest,
  ) {
    return this.service.create(fy, body, user.id);
  }

  @Roles(...ADMIN_ROLES)
  @Patch(':id')
  @Audit('hazard_zone.update', 'hazard_zones')
  update(
    @Param('fy', ParseIntPipe) fy: number,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateHazardZoneSchema)) body: UpdateHazardZoneRequest,
  ) {
    return this.service.update(fy, id, body);
  }

  @Roles(...ADMIN_ROLES)
  @Delete(':id')
  @HttpCode(204)
  @Audit('hazard_zone.delete', 'hazard_zones')
  async remove(@Param('fy', ParseIntPipe) fy: number, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.remove(fy, id);
  }
}
