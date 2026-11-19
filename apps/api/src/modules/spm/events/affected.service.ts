import { Injectable } from '@nestjs/common';
import { type AddAffectedRequest, type AffectedDto, type SessionUser, type UpdateAffectedRequest, maskIdNumber } from '@etangguh/shared';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { ApiException } from '../../../common/errors/api-exception';
import { DbService } from '../../../db/db.module';
import { affectedPersons, affectedStatusHistory, persons, residentRecords } from '../../../db/schema';
import { AuditContext } from '../../audit/audit-context';
import { PersonsRepository } from '../../persons/persons.repository';
import { PersonsService } from '../../persons/persons.service';
import { EventsService } from './events.service';

/** Warga terdampak: data diri dari `persons`; setiap perubahan status menambah riwayat. */
@Injectable()
export class AffectedService {
  constructor(
    private readonly db: DbService,
    private readonly events: EventsService,
    private readonly persons: PersonsService,
    private readonly personsRepo: PersonsRepository,
  ) {}

  async list(year: number, eventId: string): Promise<AffectedDto[]> {
    const { event } = await this.events.readable(year, eventId);
    const rows = await this.db
      .executor()
      .select({
        a: affectedPersons,
        fullName: persons.fullName,
        gender: persons.gender,
        nikLast4: persons.nikLast4,
        isResident: sql<boolean>`EXISTS (SELECT 1 FROM ${residentRecords} r WHERE r.person_id = ${affectedPersons.personId} AND r.fiscal_year_id = ${event.fiscalYearId})`,
      })
      .from(affectedPersons)
      .innerJoin(persons, eq(persons.id, affectedPersons.personId))
      .where(eq(affectedPersons.eventId, eventId))
      .orderBy(asc(persons.fullName));
    const history = rows.length
      ? await this.db
          .executor()
          .select()
          .from(affectedStatusHistory)
          .where(inArray(affectedStatusHistory.affectedPersonId, rows.map((r) => r.a.id)))
          .orderBy(asc(affectedStatusHistory.changedAt))
      : [];
    return rows.map((r) => ({
      personId: r.a.personId,
      fullName: r.fullName,
      gender: r.gender,
      nikMasked: maskIdNumber(r.nikLast4),
      status: r.a.status,
      isDisplaced: r.a.isDisplaced,
      statusUpdatedAt: r.a.statusUpdatedAt.toISOString(),
      isResident: Boolean(r.isResident),
      history: history.filter((h) => h.affectedPersonId === r.a.id).map((h) => ({ status: h.status, changedAt: h.changedAt.toISOString(), note: h.note })),
    }));
  }

  /** Menambah korban: orang yang sudah ada (personId/NIK) atau orang baru dengan data minimum. */
  async add(year: number, eventId: string, input: AddAffectedRequest, user: SessionUser) {
    await this.events.writable(year, eventId);
    let personId = input.personId;
    let created = false;
    if (personId) {
      if (!(await this.personsRepo.findById(personId))) throw ApiException.validation({ personId: 'Orang tidak ditemukan' });
    } else {
      const identity = { fullName: input.fullName!, gender: input.gender!, birthPlace: input.birthPlace, birthDate: input.birthDate };
      if (input.nik) {
        const r = await this.persons.findOrCreateByNik(input.nik, identity, user.id);
        personId = r.person.id;
        created = r.created;
      } else {
        personId = (await this.persons.createWithoutNik(identity, input.noNikReason ?? '', user.id)).person.id;
        created = true;
      }
    }
    const [dup] = await this.db.executor().select({ id: affectedPersons.id }).from(affectedPersons).where(and(eq(affectedPersons.eventId, eventId), eq(affectedPersons.personId, personId))).limit(1);
    if (dup) throw ApiException.conflict('KORBAN_SUDAH_TERCATAT', 'Orang ini sudah tercatat pada kejadian ini');
    const [row] = await this.db
      .executor()
      .insert(affectedPersons)
      .values({ eventId, personId, status: input.status, isDisplaced: input.isDisplaced, createdBy: user.id })
      .returning();
    await this.db.executor().insert(affectedStatusHistory).values({ affectedPersonId: row!.id, status: input.status, changedBy: user.id, note: input.note ?? null });
    AuditContext.annotate({ entityId: row!.id, detail: { eventId, status: input.status, personCreated: created } });
    return { personId, status: row!.status, personCreated: created };
  }

  async update(year: number, eventId: string, personId: string, input: UpdateAffectedRequest, user: SessionUser) {
    await this.events.writable(year, eventId);
    const [row] = await this.db.executor().select().from(affectedPersons).where(and(eq(affectedPersons.eventId, eventId), eq(affectedPersons.personId, personId))).limit(1);
    if (!row) throw ApiException.notFound('Korban tidak ditemukan pada kejadian ini');
    const statusChanged = input.status !== undefined && input.status !== row.status;
    await this.db
      .executor()
      .update(affectedPersons)
      .set({
        ...(input.status ? { status: input.status } : {}),
        ...(input.isDisplaced !== undefined ? { isDisplaced: input.isDisplaced } : {}),
        ...(statusChanged ? { statusUpdatedAt: new Date() } : {}),
      })
      .where(eq(affectedPersons.id, row.id));
    if (statusChanged || input.note) {
      await this.db.executor().insert(affectedStatusHistory).values({ affectedPersonId: row.id, status: input.status ?? row.status, changedBy: user.id, note: input.note ?? null });
    }
    AuditContext.annotate({ entityId: row.id, detail: { eventId, from: row.status, to: input.status ?? row.status } });
    return { personId, status: input.status ?? row.status, isDisplaced: input.isDisplaced ?? row.isDisplaced };
  }
}
