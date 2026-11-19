import { Injectable } from '@nestjs/common';
import { EMPLOYMENT_STATUSES, FORM_5A5, type ReportData, ageGroup, formatDateId, isVulnerableAge, maskIdNumber } from '@etangguh/shared';
import { and, asc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { FieldCipher } from '../../../../crypto/field-cipher';
import { DbService } from '../../../../db/db.module';
import { families, fiscalYears, officerRecords, persons, regions, residentRecords } from '../../../../db/schema';
import type { ProviderOptions } from './form-5a1.provider';

/**
 * Form 5.A.5: satu baris per petugas. Alamat, kondisi ekonomi, kebutuhan khusus, dan KK diambil
 * dari data warga tahun yang sama bila petugas juga tercatat sebagai warga; bila tidak, kosong.
 */
@Injectable()
export class Form5A5Provider {
  constructor(
    private readonly db: DbService,
    private readonly cipher: FieldCipher,
  ) {}

  async build(o: ProviderOptions): Promise<ReportData> {
    const kec = alias(regions, 'kec');
    const [fy] = await this.db.executor().select().from(fiscalYears).where(eq(fiscalYears.id, o.fiscalYearId));
    const rows = await this.db
      .executor()
      .select({
        o: officerRecords,
        fullName: persons.fullName,
        gender: persons.gender,
        birthPlace: persons.birthPlace,
        birthDate: persons.birthDate,
        nikEnc: persons.nikEnc,
        nikLast4: persons.nikLast4,
        r: residentRecords,
        kkEnc: families.kkEnc,
        kkLast4: families.kkLast4,
        kel: regions.name,
        kec: kec.name,
      })
      .from(officerRecords)
      .innerJoin(persons, eq(persons.id, officerRecords.personId))
      .leftJoin(residentRecords, and(eq(residentRecords.personId, officerRecords.personId), eq(residentRecords.fiscalYearId, officerRecords.fiscalYearId)))
      .leftJoin(families, eq(families.id, residentRecords.familyId))
      .leftJoin(regions, eq(regions.id, residentRecords.kelurahanId))
      .leftJoin(kec, eq(kec.id, regions.parentId))
      .where(and(eq(officerRecords.fiscalYearId, o.fiscalYearId), o.kelurahanId ? eq(officerRecords.dutyKelurahanId, o.kelurahanId) : undefined))
      .orderBy(asc(persons.fullName));

    return {
      def: FORM_5A5,
      year: o.year,
      rows: rows.map((x, i) => {
        const group = x.r?.ageGroup ?? (x.birthDate && fy ? ageGroup(x.birthDate, fy.ageReferenceDate, fy.ageBands) : null);
        const row: ReportData['rows'][number] = {
          no: i + 1,
          fullName: x.fullName,
          nik: o.maskIds ? maskIdNumber(x.nikLast4) : this.cipher.decryptNullable(x.nikEnc),
          kk: x.kkEnc ? (o.maskIds ? maskIdNumber(x.kkLast4) : this.cipher.decrypt(x.kkEnc)) : null,
          gender: x.gender,
          birthPlace: x.birthPlace,
          birthDate: x.birthDate ? formatDateId(x.birthDate) : null,
          address: x.r ? this.cipher.decrypt(x.r.addressEnc) : null,
          kelurahan: x.kel,
          kecamatan: x.kec,
          economy: x.r ? (x.r.isPoor ? 'miskin' : 'tidak miskin') : null,
          specialNeedsFlag: x.r ? (x.r.hasSpecialNeeds ? 'ya' : 'tidak') : null,
          specialNeeds: x.r ? this.cipher.decryptNullable(x.r.specialNeedsEnc) : null,
          vulnerableAge: group ? isVulnerableAge(group) : null,
          certifications: x.o.certifications,
          isTrcKlb: x.o.isTrcKlb,
          isTrcPdb: x.o.isTrcPdb,
          isPpe: x.o.isPpe,
          post_posko: x.o.postType === 'posko',
          post_pos_lapangan: x.o.postType === 'pos_lapangan',
          note: x.o.note,
        };
        for (const s of EMPLOYMENT_STATUSES) row[`st_${s}`] = x.o.employmentStatus === s;
        return row;
      }),
      notes: ['Alamat, kondisi ekonomi, dan kebutuhan khusus diisi dari data warga bila petugas tercatat sebagai warga kawasan rawan.'],
    };
  }
}
