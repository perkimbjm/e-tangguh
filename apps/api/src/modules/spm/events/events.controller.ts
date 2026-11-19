import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import {
  BPBD_ROLES,
  addAffectedSchema,
  createEventSchema,
  eventOfficerSchema,
  updateAffectedSchema,
  updateEventSchema,
  type AddAffectedRequest,
  type CreateEventRequest,
  type EventOfficerRequest,
  type SessionUser,
  type UpdateAffectedRequest,
  type UpdateEventRequest,
} from '@etangguh/shared';
import { CurrentUser, Roles } from '../../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Audit } from '../../audit/audit.decorator';
import { AffectedService } from './affected.service';
import { EventOfficersService } from './event-officers.service';
import { EventsService } from './events.service';

const UUID = new ParseUUIDPipe();

/** Kejadian, warga terdampak, dan petugas aktif (contracts/api.md: O A S). */
@Controller('spm/:fy/events')
@Roles(...BPBD_ROLES)
export class EventsController {
  constructor(
    private readonly events: EventsService,
    private readonly affected: AffectedService,
    private readonly officers: EventOfficersService,
  ) {}

  @Get()
  async list(@Param('fy', ParseIntPipe) fy: number) {
    return { items: await this.events.list(fy) };
  }

  @Post()
  @Audit('event.create', 'disaster_events')
  create(@Param('fy', ParseIntPipe) fy: number, @CurrentUser() user: SessionUser, @Body(new ZodValidationPipe(createEventSchema)) body: CreateEventRequest) {
    return this.events.create(fy, body, user);
  }

  @Get(':id')
  get(@Param('fy', ParseIntPipe) fy: number, @Param('id', UUID) id: string) {
    return this.events.get(fy, id);
  }

  @Patch(':id')
  @Audit('event.update', 'disaster_events')
  update(@Param('fy', ParseIntPipe) fy: number, @Param('id', UUID) id: string, @Body(new ZodValidationPipe(updateEventSchema)) body: UpdateEventRequest) {
    return this.events.update(fy, id, body);
  }

  @Get(':id/affected')
  async affectedList(@Param('fy', ParseIntPipe) fy: number, @Param('id', UUID) id: string) {
    return { items: await this.affected.list(fy, id) };
  }

  @Post(':id/affected')
  @Audit('affected.create', 'affected_persons')
  addAffected(
    @Param('fy', ParseIntPipe) fy: number,
    @Param('id', UUID) id: string,
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(addAffectedSchema)) body: AddAffectedRequest,
  ) {
    return this.affected.add(fy, id, body, user);
  }

  @Patch(':id/affected/:personId')
  @Audit('affected.update', 'affected_persons')
  updateAffected(
    @Param('fy', ParseIntPipe) fy: number,
    @Param('id', UUID) id: string,
    @Param('personId', UUID) personId: string,
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(updateAffectedSchema)) body: UpdateAffectedRequest,
  ) {
    return this.affected.update(fy, id, personId, body, user);
  }

  @Get(':id/officers')
  async officersList(@Param('fy', ParseIntPipe) fy: number, @Param('id', UUID) id: string) {
    return { items: await this.officers.list(fy, id) };
  }

  @Put(':id/officers/:officerId')
  @Audit('event_officer.put', 'event_officers')
  putOfficer(
    @Param('fy', ParseIntPipe) fy: number,
    @Param('id', UUID) id: string,
    @Param('officerId', UUID) officerId: string,
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(eventOfficerSchema)) body: EventOfficerRequest,
  ) {
    return this.officers.put(fy, id, officerId, body, user);
  }

  @Delete(':id/officers/:officerId')
  @HttpCode(204)
  @Audit('event_officer.delete', 'event_officers')
  async removeOfficer(@Param('fy', ParseIntPipe) fy: number, @Param('id', UUID) id: string, @Param('officerId', UUID) officerId: string): Promise<void> {
    await this.officers.remove(fy, id, officerId);
  }
}
