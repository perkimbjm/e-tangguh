import { Injectable } from '@nestjs/common';
import { FORM_5A1, type ReportData, formatDateId, isVulnerableAge, maskIdNumber } from '@etangguh/shared';
import { FieldCipher } from '../../../../crypto/field-cipher';
import { ResidentRowsQuery } from './resident-rows.query';

export interface ProviderOptions {
  fiscalYearId: string;
  year: number;
  kelurahanId: string | null;
  /** NIK/KK tersamar (ekspor oleh pendata kelurahan). */
  maskIds: boolean;
}

@Injectable()
export class Form5A1Provider {
  constructor(
    private readonly rows: ResidentRowsQuery,
    private readonly cipher: FieldCipher,
  ) {}

  async build(o: ProviderOptions): Promise<ReportData> {
    const list = await this.rows.list(o.fiscalYearId, o.kelurahanId);
    return {
      def: FORM_5A1,
      year: o.year,
      rows: list.map((r, i) => ({
        no: i + 1,
        headName: r.record.isFamilyHead ? r.fullName : null,
        memberName: r.record.isFamilyHead ? null : r.fullName,
        nik: o.maskIds ? maskIdNumber(r.nikLast4) : this.cipher.decryptNullable(r.nikEnc),
        kk: r.kkEnc ? (o.maskIds ? maskIdNumber(r.kkLast4) : this.cipher.decrypt(r.kkEnc)) : null,
        gender: r.gender,
        birthPlace: r.birthPlace,
        birthDate: r.birthDate ? formatDateId(r.birthDate) : null,
        address: this.cipher.decrypt(r.record.addressEnc),
        kelurahan: r.kelurahan,
        kecamatan: r.kecamatan,
        economy: r.record.isPoor ? 'miskin' : 'tidak miskin',
        specialNeedsFlag: r.record.hasSpecialNeeds ? 'ya' : 'tidak',
        specialNeeds: this.cipher.decryptNullable(r.record.specialNeedsEnc),
        vulnerableAge: isVulnerableAge(r.record.ageGroup),
      })),
      notes: o.maskIds ? ['NIK dan nomor KK disamarkan pada ekspor oleh pendata kelurahan.'] : undefined,
    };
  }
}
