import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DbService } from '../../../../db/db.module';
import { families, persons, regions, residentRecords } from '../../../../db/schema';
import { residentBase } from '../../recap/recap-query.builder';

/** Baris warga untuk Form 5.A.1/5.A.2: urut kecamatan, kelurahan, KK, kepala keluarga dulu. */
@Injectable()
export class ResidentRowsQuery {
  constructor(private readonly db: DbService) {}

  list(fiscalYearId: string, kelurahanId: string | null) {
    const kec = alias(regions, 'kecamatan');
    return this.db
      .executor()
      .select({
        record: residentRecords,
        fullName: persons.fullName,
        gender: persons.gender,
        birthPlace: persons.birthPlace,
        birthDate: persons.birthDate,
        nikEnc: persons.nikEnc,
        nikLast4: persons.nikLast4,
        kkEnc: families.kkEnc,
        kkLast4: families.kkLast4,
        kelurahan: regions.name,
        kecamatan: kec.name,
      })
      .from(residentRecords)
      .innerJoin(persons, eq(persons.id, residentRecords.personId))
      .leftJoin(families, eq(families.id, residentRecords.familyId))
      .innerJoin(regions, eq(regions.id, residentRecords.kelurahanId))
      .leftJoin(kec, eq(kec.id, regions.parentId))
      .where(and(residentBase(fiscalYearId, kelurahanId)))
      .orderBy(asc(kec.name), asc(regions.name), sql`${families.kkLast4} NULLS LAST`, asc(residentRecords.familyId), desc(residentRecords.isFamilyHead), asc(persons.fullName));
  }

  /** Seluruh bitmask variasi kota pada tahun itu (penomoran variasi tidak bergantung saringan kelurahan). */
  async yearMasks(fiscalYearId: string): Promise<number[]> {
    const rows = await this.db.executor().selectDistinct({ m: residentRecords.hazardMask }).from(residentRecords).where(residentBase(fiscalYearId, null));
    return rows.map((r) => r.m);
  }
}
