import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  BPBD_ROLES,
  equipmentSchema,
  updateEquipmentSchema,
  type EquipmentRequest,
  type SessionUser,
  type UpdateEquipmentRequest,
} from '@etangguh/shared';
import { CurrentUser, Roles } from '../../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit.decorator';
import { InventoryService } from './inventory.service';

@Controller('spm/:fy/equipment')
@Roles(...BPBD_ROLES)
export class EquipmentController {
  constructor(private readonly service: InventoryService) {}

  @Get()
  async list(@Param('fy', ParseIntPipe) fy: number) {
    return { items: await this.service.list('equipment', fy) };
  }

  @Post()
  @Audit('equipment.create', 'equipment')
  create(
    @Param('fy', ParseIntPipe) fy: number,
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(equipmentSchema)) body: EquipmentRequest,
  ) {
    return this.service.create('equipment', fy, body, user);
  }

  @Patch(':id')
  @Audit('equipment.update', 'equipment')
  update(
    @Param('fy', ParseIntPipe) fy: number,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateEquipmentSchema)) body: UpdateEquipmentRequest,
  ) {
    return this.service.update('equipment', fy, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @Audit('equipment.delete', 'equipment')
  async remove(
    @Param('fy', ParseIntPipe) fy: number,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.service.remove('equipment', fy, id);
  }
}
