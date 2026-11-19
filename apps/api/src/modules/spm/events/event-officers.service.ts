import { Injectable } from '@nestjs/common';
import { type EventOfficerDto, type EventOfficerRequest, type SessionUser } from '@etangguh/shared';
import { and, asc, eq } from 'drizzle-orm';
import { ApiException } from '../../../common/errors/api-exception';
import { DbService } from '../../../db/db.module';
import { eventOfficers, officerRecords, persons } from '../../../db/schema';
import { AuditContext } from '../../audit/audit-context';
import { RegionsRepository } from '../../regions/regions.repository';
import { EventsService } from './events.service';

/** Petugas aktif per kejadian (Form 5.A.11); petugas harus tercatat pada tahun anggaran yang sama. */
@Injectable()
export class EventOfficersService {
  constructor(
    private readonly db: DbService,
    private readonly events: EventsService,
    private readonly regions: RegionsRepository,
  ) {}

  async list(year: number, eventId: string): Promise<EventOfficerDto[]> {
    await this.events.readable(year, eventId);
    const rows = await this.db
      .executor()
      .select({ eo: eventOfficers, fullName: persons.fullName, position: officerRecords.position })
      .from(eventOfficers)
      .innerJoin(officerRecords, eq(officerRecords.id, eventOfficers.officerRecordId))
      .innerJoin(persons, eq(persons.id, officerRecords.personId))
      .where(eq(eventOfficers.eventId, eventId))
      .orderBy(asc(persons.fullName));
    return rows.map(({ eo, fullName, position }) => ({
      officerId: eo.officerRecordId,
      fullName,
      position,
      isTrcKlb: eo.isTrcKlb,
      isTrcPdb: eo.isTrcPdb,
      isPpe: eo.isPpe,
      isOps: eo.isOps,
      postType: eo.postType,
      postKecamatanId: eo.postKecamatanId,
      postKelurahanId: eo.postKelurahanId,
    }));
  }

  private async assertRegion(id: string | null | undefined, level: 'kecamatan' | 'kelurahan', field: string) {
    if (id && (await this.regions.findById(id))?.level !== level) throw ApiException.validation({ [field]: `${level === 'kecamatan' ? 'Kecamatan' : 'Kelurahan'} tidak ditemukan` });
  }

  async put(year: number, eventId: string, officerId: string, input: EventOfficerRequest, user: SessionUser) {
    const { event } = await this.events.writable(year, eventId);
    const [officer] = await this.db.executor().select({ id: officerRecords.id }).from(officerRecords).where(and(eq(officerRecords.id, officerId), eq(officerRecords.fiscalYearId, event.fiscalYearId))).limit(1);
    if (!officer) throw ApiException.validation({ officerId: 'Petugas tidak tercatat pada tahun anggaran ini' });
    await this.assertRegion(input.postKecamatanId, 'kecamatan', 'postKecamatanId');
    await this.assertRegion(input.postKelurahanId, 'kelurahan', 'postKelurahanId');
    const values = { ...input, postType: input.postType ?? null, postKecamatanId: input.postKecamatanId ?? null, postKelurahanId: input.postKelurahanId ?? null };
    const [row] = await this.db
      .executor()
      .insert(eventOfficers)
      .values({ ...values, eventId, officerRecordId: officerId, createdBy: user.id })
      .onConflictDoUpdate({ target: [eventOfficers.eventId, eventOfficers.officerRecordId], set: values })
      .returning();
    AuditContext.annotate({ entityId: row!.id, detail: { eventId, officerId } });
    return { officerId, eventId };
  }

  async remove(year: number, eventId: string, officerId: string): Promise<void> {
    await this.events.writable(year, eventId);
    await this.db.executor().delete(eventOfficers).where(and(eq(eventOfficers.eventId, eventId), eq(eventOfficers.officerRecordId, officerId)));
  }
}
