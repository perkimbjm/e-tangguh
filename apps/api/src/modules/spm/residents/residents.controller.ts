import { Body, Controller, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  SPM_ROLES,
  createResidentSchema,
  deactivateResidentSchema,
  listResidentsQuerySchema,
  updateResidentSchema,
  type CreateResidentRequest,
  type DeactivateResidentRequest,
  type ListResidentsQuery,
  type SessionUser,
  type UpdateResidentRequest,
} from '@etangguh/shared';
import { CurrentUser, Roles } from '../../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit.decorator';
import { ResidentsService } from './residents.service';

@Controller('spm/:fy/residents')
@Roles(...SPM_ROLES)
export class ResidentsController {
  constructor(private readonly service: ResidentsService) {}

  @Get()
  list(
    @Param('fy', ParseIntPipe) fy: number,
    @CurrentUser() user: SessionUser,
    @Query(new ZodValidationPipe(listResidentsQuerySchema)) query: ListResidentsQuery,
  ) {
    return this.service.list(fy, user, query);
  }

  @Get(':id')
  @Audit('resident.view', 'resident_records')
  detail(@Param('fy', ParseIntPipe) fy: number, @Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: SessionUser) {
    return this.service.detail(fy, id, user);
  }

  @Post()
  @Audit('resident.create', 'resident_records')
  create(
    @Param('fy', ParseIntPipe) fy: number,
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(createResidentSchema)) body: CreateResidentRequest,
  ) {
    return this.service.create(fy, body, user);
  }

  @Patch(':id')
  @Audit('resident.update', 'resident_records')
  update(
    @Param('fy', ParseIntPipe) fy: number,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(updateResidentSchema)) body: UpdateResidentRequest,
  ) {
    return this.service.update(fy, id, body, user);
  }

  @Post(':id/deactivate')
  @Audit('resident.deactivate', 'resident_records')
  deactivate(
    @Param('fy', ParseIntPipe) fy: number,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(deactivateResidentSchema)) body: DeactivateResidentRequest,
  ) {
    return this.service.deactivate(fy, id, body, user);
  }
}
