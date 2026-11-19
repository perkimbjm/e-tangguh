import { Injectable } from '@nestjs/common';
import { FORM_5A2, HAZARDS, type ReportData, maskIdNumber, variationNumbers } from '@etangguh/shared';
import { eq } from 'drizzle-orm';
import { FieldCipher } from '../../../../crypto/field-cipher';
import { DbService } from '../../../../db/db.module';
import { officerRecords } from '../../../../db/schema';
import type { ProviderOptions } from './form-5a1.provider';
import { ResidentRowsQuery } from './resident-rows.query';

@Injectable()
export class Form5A2Provider {
  constructor(
    private readonly rows: ResidentRowsQuery,
    private readonly cipher: FieldCipher,
    private readonly db: DbService,
  ) {}

  async build(o: ProviderOptions): Promise<ReportData> {
    const [list, masks] = await Promise.all([this.rows.list(o.fiscalYearId, o.kelurahanId), this.rows.yearMasks(o.fiscalYearId)]);
    const numbers = variationNumbers(masks);
    const officers = await this.db
      .executor()
      .select({ personId: officerRecords.personId, status: officerRecords.employmentStatus, isOps: officerRecords.isOps })
      .from(officerRecords)
      .where(eq(officerRecords.fiscalYearId, o.fiscalYearId));
    const byPerson = new Map(officers.map((x) => [x.personId, x]));
    return {
      def: FORM_5A2,
      year: o.year,
      rows: list.map((r, i) => {
        const row: ReportData['rows'][number] = {
          no: i + 1,
          headName: r.record.isFamilyHead ? r.fullName : null,
          memberName: r.record.isFamilyHead ? null : r.fullName,
          nik: o.maskIds ? maskIdNumber(r.nikLast4) : this.cipher.decryptNullable(r.nikEnc),
          kk: r.kkEnc ? (o.maskIds ? maskIdNumber(r.kkLast4) : this.cipher.decrypt(r.kkEnc)) : null,
          gender: r.gender,
          kelurahan: r.kelurahan,
          kecamatan: r.kecamatan,
          variationNo: numbers.get(r.record.hazardMask) ?? null,
          roleResident: true,
          roleApparatus: byPerson.has(r.record.personId) ? byPerson.get(r.record.personId)!.status !== 'non_aparatur' : false,
          roleOps: byPerson.get(r.record.personId)?.isOps ?? false,
        };
        for (const h of HAZARDS) row[`hazard_${h.code}`] = (r.record.hazardMask & (1 << h.bit)) !== 0;
        return row;
      }),
      notes: o.maskIds ? ['NIK dan nomor KK disamarkan.'] : undefined,
    };
  }
}
