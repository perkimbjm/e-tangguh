import { Injectable } from '@nestjs/common';
import { type OfficerDto, maskIdNumber } from '@etangguh/shared';
import { and, asc, eq, sql } from 'drizzle-orm';
import { DbService } from '../../../db/db.module';
import { officerRecords, persons, regions, residentRecords } from '../../../db/schema';

export type OfficerRow = typeof officerRecords.$inferSelect;
export type OfficerInsert = typeof officerRecords.$inferInsert;

@Injectable()
export class OfficersRepository {
  constructor(private readonly db: DbService) {}

  async list(fiscalYearId: string, id?: string): Promise<OfficerDto[]> {
    const rows = await this.db
      .executor()
      .select({
        o: officerRecords,
        fullName: persons.fullName,
        gender: persons.gender,
        nikLast4: persons.nikLast4,
        dutyName: regions.name,
        isResident: sql<boolean>`EXISTS (SELECT 1 FROM ${residentRecords} r WHERE r.person_id = ${officerRecords.personId} AND r.fiscal_year_id = ${officerRecords.fiscalYearId})`,
      })
      .from(officerRecords)
      .innerJoin(persons, eq(persons.id, officerRecords.personId))
      .leftJoin(regions, eq(regions.id, officerRecords.dutyKelurahanId))
      .where(
        and(
          eq(officerRecords.fiscalYearId, fiscalYearId),
          id ? eq(officerRecords.id, id) : undefined,
        ),
      )
      .orderBy(asc(persons.fullName));
    return rows.map(({ o, ...r }) => ({
      id: o.id,
      personId: o.personId,
      volunteerId: o.volunteerId,
      fullName: r.fullName,
      gender: r.gender,
      nikMasked: maskIdNumber(r.nikLast4),
      position: o.position,
      employmentStatus: o.employmentStatus,
      dutyKelurahanId: o.dutyKelurahanId,
      dutyKelurahanName: r.dutyName,
      certifications: o.certifications,
      isTrcKlb: o.isTrcKlb,
      isTrcPdb: o.isTrcPdb,
      isPpe: o.isPpe,
      isOps: o.isOps,
      postType: o.postType,
      postKelurahanId: o.postKelurahanId,
      hazardMask: o.hazardMask,
      note: o.note,
      isResident: Boolean(r.isResident),
    }));
  }

  async findById(fiscalYearId: string, id: string): Promise<OfficerRow | null> {
    const [row] = await this.db
      .executor()
      .select()
      .from(officerRecords)
      .where(and(eq(officerRecords.fiscalYearId, fiscalYearId), eq(officerRecords.id, id)))
      .limit(1);
    return row ?? null;
  }

  async findByPerson(fiscalYearId: string, personId: string): Promise<OfficerRow | null> {
    const [row] = await this.db
      .executor()
      .select()
      .from(officerRecords)
      .where(
        and(eq(officerRecords.fiscalYearId, fiscalYearId), eq(officerRecords.personId, personId)),
      )
      .limit(1);
    return row ?? null;
  }

  async insert(values: OfficerInsert): Promise<OfficerRow> {
    const [row] = await this.db.executor().insert(officerRecords).values(values).returning();
    return row!;
  }

  async update(id: string, values: Partial<OfficerInsert>): Promise<OfficerRow> {
    const [row] = await this.db
      .executor()
      .update(officerRecords)
      .set(values)
      .where(eq(officerRecords.id, id))
      .returning();
    return row!;
  }

  async delete(id: string): Promise<void> {
    await this.db.executor().delete(officerRecords).where(eq(officerRecords.id, id));
  }
}
