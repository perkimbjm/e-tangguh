import { Injectable } from '@nestjs/common';
import type { CreateEventRequest, EventDto, SessionUser, UpdateEventRequest } from '@etangguh/shared';
import { ApiException } from '../../../common/errors/api-exception';
import { AuditContext } from '../../audit/audit-context';
import { RegionsRepository } from '../../regions/regions.repository';
import type { FiscalYearRow } from '../fiscal-years/fiscal-years.repository';
import { FiscalYearsService } from '../fiscal-years/fiscal-years.service';
import { type EventRow, EventsRepository, pointSql } from './events.repository';

@Injectable()
export class EventsService {
  constructor(
    private readonly repo: EventsRepository,
    private readonly years: FiscalYearsService,
    private readonly regions: RegionsRepository,
  ) {}

  async list(year: number): Promise<EventDto[]> {
    return this.repo.list((await this.years.get(year)).id);
  }

  async get(year: number, id: string): Promise<EventDto> {
    const [dto] = await this.repo.list((await this.years.get(year)).id, id);
    if (!dto) throw ApiException.notFound('Kejadian tidak ditemukan');
    return dto;
  }

  /** Kejadian pada tahun yang dapat ditulis (423 bila final). */
  async writable(year: number, id: string): Promise<{ fy: FiscalYearRow; event: EventRow }> {
    const fy = await this.years.assertWritable(year);
    const event = await this.repo.find(fy.id, id);
    if (!event) throw ApiException.notFound('Kejadian tidak ditemukan');
    return { fy, event };
  }

  async readable(year: number, id: string): Promise<{ fy: FiscalYearRow; event: EventRow }> {
    const fy = await this.years.get(year);
    const event = await this.repo.find(fy.id, id);
    if (!event) throw ApiException.notFound('Kejadian tidak ditemukan');
    return { fy, event };
  }

  private async fields(input: UpdateEventRequest) {
    const out: Record<string, unknown> = {};
    if (input.name !== undefined) out.name = input.name;
    if (input.hazardCode !== undefined) {
      const id = await this.repo.hazardTypeId(input.hazardCode);
      if (!id) throw ApiException.validation({ hazardCode: 'Jenis bencana belum ada pada data rujukan' });
      out.hazardTypeId = id;
    }
    if (input.occurredAt !== undefined) out.occurredAt = new Date(input.occurredAt);
    if (input.reportedAt !== undefined) out.reportedAt = new Date(input.reportedAt);
    if (input.locationText !== undefined) out.locationText = input.locationText;
    if (input.kelurahanId !== undefined) {
      if (input.kelurahanId && (await this.regions.findById(input.kelurahanId))?.level !== 'kelurahan') {
        throw ApiException.validation({ kelurahanId: 'Kelurahan tidak ditemukan' });
      }
      out.kelurahanId = input.kelurahanId ?? null;
    }
    if (input.lon !== undefined || input.lat !== undefined) out.location = pointSql(input.lon, input.lat);
    if (input.emergencyDeclaredAt !== undefined) out.emergencyDeclaredAt = input.emergencyDeclaredAt ? new Date(input.emergencyDeclaredAt) : null;
    return out;
  }

  async create(year: number, input: CreateEventRequest, user: SessionUser): Promise<EventDto> {
    const fy = await this.years.assertWritable(year);
    const fields = await this.fields(input);
    const row = await this.repo.insert({ ...(fields as Parameters<EventsRepository['insert']>[0]), fiscalYearId: fy.id, createdBy: user.id });
    AuditContext.annotate({ entityId: row.id, detail: { hazardCode: input.hazardCode } });
    return this.get(year, row.id);
  }

  async update(year: number, id: string, input: UpdateEventRequest): Promise<EventDto> {
    const { event } = await this.writable(year, id);
    const fields = await this.fields(input);
    const occurred = (fields.occurredAt as Date | undefined) ?? event.occurredAt;
    const reported = (fields.reportedAt as Date | undefined) ?? event.reportedAt;
    if (reported < occurred) throw ApiException.validation({ reportedAt: 'Waktu laporan tidak boleh sebelum waktu kejadian' });
    await this.repo.update(id, fields);
    AuditContext.annotate({ entityId: id, detail: { fields: Object.keys(input) } });
    return this.get(year, id);
  }
}
