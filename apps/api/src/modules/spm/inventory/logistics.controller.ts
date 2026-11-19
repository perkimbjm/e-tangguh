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
  logisticsSchema,
  updateLogisticsSchema,
  type LogisticsRequest,
  type SessionUser,
  type UpdateLogisticsRequest,
} from '@etangguh/shared';
import { CurrentUser, Roles } from '../../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit.decorator';
import { InventoryService } from './inventory.service';

@Controller('spm/:fy/logistics')
@Roles(...BPBD_ROLES)
export class LogisticsController {
  constructor(private readonly service: InventoryService) {}

  @Get()
  async list(@Param('fy', ParseIntPipe) fy: number) {
    return { items: await this.service.list('logistics', fy) };
  }

  @Post()
  @Audit('logistics.create', 'logistics_stock')
  create(
    @Param('fy', ParseIntPipe) fy: number,
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(logisticsSchema)) body: LogisticsRequest,
  ) {
    return this.service.create('logistics', fy, body, user);
  }

  @Patch(':id')
  @Audit('logistics.update', 'logistics_stock')
  update(
    @Param('fy', ParseIntPipe) fy: number,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateLogisticsSchema)) body: UpdateLogisticsRequest,
  ) {
    return this.service.update('logistics', fy, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @Audit('logistics.delete', 'logistics_stock')
  async remove(
    @Param('fy', ParseIntPipe) fy: number,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.service.remove('logistics', fy, id);
  }
}
