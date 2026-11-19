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
  createOfficerSchema,
  fromVolunteerSchema,
  updateOfficerSchema,
  type CreateOfficerRequest,
  type FromVolunteerRequest,
  type SessionUser,
  type UpdateOfficerRequest,
} from '@etangguh/shared';
import { CurrentUser, Roles } from '../../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit.decorator';
import { OfficerCardsService } from './officer-cards.service';
import { OfficersService } from './officers.service';

@Controller('spm/:fy/officers')
@Roles(...BPBD_ROLES)
export class OfficersController {
  constructor(
    private readonly service: OfficersService,
    private readonly cards: OfficerCardsService,
  ) {}

  /** Kartu kompetensi dan kesiapan (rumus atribut versi 1). */
  @Get('cards')
  async cardList(@Param('fy', ParseIntPipe) fy: number) {
    return { items: await this.cards.list(fy) };
  }

  @Get(':id/card')
  async card(@Param('fy', ParseIntPipe) fy: number, @Param('id', ParseUUIDPipe) id: string) {
    return (await this.cards.list(fy, id))[0];
  }

  @Get()
  async list(@Param('fy', ParseIntPipe) fy: number) {
    return { items: await this.service.list(fy) };
  }

  @Post()
  @Audit('officer.create', 'officer_records')
  create(
    @Param('fy', ParseIntPipe) fy: number,
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(createOfficerSchema)) body: CreateOfficerRequest,
  ) {
    return this.service.create(fy, body, user);
  }

  @Post('from-volunteer/:volunteerId')
  @Audit('officer.from_volunteer', 'officer_records')
  fromVolunteer(
    @Param('fy', ParseIntPipe) fy: number,
    @Param('volunteerId', ParseUUIDPipe) volunteerId: string,
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(fromVolunteerSchema)) body: FromVolunteerRequest,
  ) {
    return this.service.fromVolunteer(fy, volunteerId, body, user);
  }

  @Patch(':id')
  @Audit('officer.update', 'officer_records')
  update(
    @Param('fy', ParseIntPipe) fy: number,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateOfficerSchema)) body: UpdateOfficerRequest,
  ) {
    return this.service.update(fy, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @Audit('officer.delete', 'officer_records')
  async remove(
    @Param('fy', ParseIntPipe) fy: number,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.service.remove(fy, id);
  }
}
