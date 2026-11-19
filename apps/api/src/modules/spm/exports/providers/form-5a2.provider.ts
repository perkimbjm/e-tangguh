import { Injectable } from '@nestjs/common';
import { FORM_5A2, HAZARDS, type ReportData, maskIdNumber, variationNumbers } from '@etangguh/shared';
import { FieldCipher } from '../../../../crypto/field-cipher';
import type { ProviderOptions } from './form-5a1.provider';
import { ResidentRowsQuery } from './resident-rows.query';

@Injectable()
export class Form5A2Provider {
  constructor(
    private readonly rows: ResidentRowsQuery,
    private readonly cipher: FieldCipher,
  ) {}

  async build(o: ProviderOptions): Promise<ReportData> {
    const [list, masks] = await Promise.all([this.rows.list(o.fiscalYearId, o.kelurahanId), this.rows.yearMasks(o.fiscalYearId)]);
    const numbers = variationNumbers(masks);
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
          // Kolom 21-22 diisi dari data petugas pada US3.
          roleApparatus: null,
          roleOps: null,
        };
        for (const h of HAZARDS) row[`hazard_${h.code}`] = (r.record.hazardMask & (1 << h.bit)) !== 0;
        return row;
      }),
      notes: ['Kolom 21-22 (aparatur, petugas operasi) diisi setelah data petugas tersedia.', ...(o.maskIds ? ['NIK dan nomor KK disamarkan.'] : [])],
    };
  }
}
