import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DbService } from '../../../../db/db.module';
import { affectedPersons, disasterEvents, eventOfficers, families, officerRecords, persons, regions, residentRecords } from '../../../../db/schema';

/** Kueri bersama Form 5.A.9-5.A.11: orang terdampak/petugas beserta data warga tahun yang sama. */
@Injectable()
export class EventPeopleQuery {
  constructor(private readonly db: DbService) {}

  events(fiscalYearId: string, eventId: string | null) {
    return this.db
      .executor()
      .select()
      .from(disasterEvents)
      .where(and(eq(disasterEvents.fiscalYearId, fiscalYearId), eventId ? eq(disasterEvents.id, eventId) : undefined))
      .orderBy(desc(disasterEvents.occurredAt));
  }

  private personColumns() {
    const kec = alias(regions, 'kec');
    return {
      kec,
      columns: {
        personId: persons.id,
        fullName: persons.fullName,
        gender: persons.gender,
        birthPlace: persons.birthPlace,
        birthDate: persons.birthDate,
        nikEnc: persons.nikEnc,
        r: residentRecords,
        kkEnc: families.kkEnc,
        kel: regions.name,
        kecName: kec.name,
        officer: officerRecords,
      },
    };
  }

  affected(fiscalYearId: string, eventId: string) {
    const { kec, columns } = this.personColumns();
    return this.db
      .executor()
      .select({ ...columns, a: affectedPersons })
      .from(affectedPersons)
      .innerJoin(persons, eq(persons.id, affectedPersons.personId))
      .leftJoin(residentRecords, and(eq(residentRecords.personId, persons.id), eq(residentRecords.fiscalYearId, fiscalYearId)))
      .leftJoin(families, eq(families.id, residentRecords.familyId))
      .leftJoin(regions, eq(regions.id, residentRecords.kelurahanId))
      .leftJoin(kec, eq(kec.id, regions.parentId))
      .leftJoin(officerRecords, and(eq(officerRecords.personId, persons.id), eq(officerRecords.fiscalYearId, fiscalYearId)))
      .where(eq(affectedPersons.eventId, eventId))
      .orderBy(asc(persons.fullName));
  }

  officers(fiscalYearId: string, eventId: string) {
    const { kec, columns } = this.personColumns();
    const postKec = alias(regions, 'post_kec');
    const postKel = alias(regions, 'post_kel');
    return this.db
      .executor()
      .select({ ...columns, eo: eventOfficers, postKec: postKec.name, postKel: postKel.name })
      .from(eventOfficers)
      .innerJoin(officerRecords, eq(officerRecords.id, eventOfficers.officerRecordId))
      .innerJoin(persons, eq(persons.id, officerRecords.personId))
      .leftJoin(residentRecords, and(eq(residentRecords.personId, persons.id), eq(residentRecords.fiscalYearId, fiscalYearId)))
      .leftJoin(families, eq(families.id, residentRecords.familyId))
      .leftJoin(regions, eq(regions.id, residentRecords.kelurahanId))
      .leftJoin(kec, eq(kec.id, regions.parentId))
      .leftJoin(postKec, eq(postKec.id, eventOfficers.postKecamatanId))
      .leftJoin(postKel, eq(postKel.id, eventOfficers.postKelurahanId))
      .where(eq(eventOfficers.eventId, eventId))
      .orderBy(asc(persons.fullName));
  }
}
