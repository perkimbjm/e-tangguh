import { Injectable } from '@nestjs/common';
import { type CellValue, type SessionUser, rowError, validateHazardRow } from '@etangguh/shared';
import { BlindIndex } from '../../../crypto/blind-index';
import type { FiscalYearRow } from '../fiscal-years/fiscal-years.repository';
import { ImportLookup } from './import-lookup';
import type { ValidatedRow, ValidationResult } from './import-validator';

const nameKey = (name: string, kkHex: string | null) => `${name.toLowerCase().replace(/\s+/g, ' ').trim()}|${kkHex ?? ''}`;

/**
 * Validasi impor Form 5.A.2: hanya memperbarui `hazard_mask` warga yang sudah tercatat pada
 * Form 5.A.1 tahun yang sama. Warga yang belum tercatat ditolak `WARGA_BELUM_TERCATAT`.
 */
@Injectable()
export class HazardImportValidator {
  constructor(
    private readonly lookup: ImportLookup,
    private readonly blind: BlindIndex,
  ) {}

  async validate(input: { rowNumber: number; values: Record<string, CellValue> }[], fy: FiscalYearRow, user: SessionUser): Promise<ValidationResult> {
    const parsed = input.map((r) => ({ r, ...validateHazardRow(r.values) }));
    const hashes = parsed.filter((p) => p.value?.nik).map((p) => this.blind.compute('nik', p.value!.nik!));
    const byNik = await this.lookup.byNikHash(fy.id, hashes);
    const noNik = parsed.some((p) => p.value && !p.value.nik) ? await this.lookup.withoutNik(fy.id) : [];
    const noNikIndex = new Map(noNik.map((e) => [nameKey(e.fullName, e.kkHash?.toString('hex') ?? null), e]));
    const seen = new Set<string>();

    const rows: ValidatedRow[] = parsed.map(({ r, value, errors }) => {
      const out: ValidatedRow = { rowNumber: r.rowNumber, raw: r.values, normalized: null, errors: [...errors], outcome: 'ditolak', targetRecordId: null, existingPersonId: null };
      if (!value) return out;
      const kkHex = value.kk ? this.blind.compute('kk', value.kk).toString('hex') : null;
      const existing = value.nik ? byNik.get(this.blind.compute('nik', value.nik).toString('hex')) : noNikIndex.get(nameKey(value.fullName, kkHex));
      if (!existing?.record) {
        out.errors.push(rowError(value.nik ? 4 : 2, 'WARGA_BELUM_TERCATAT'));
        return out;
      }
      if (user.role === 'pendata_kelurahan' && existing.record.kelurahanId !== user.kelurahanId) {
        out.errors.push(rowError(7, 'WILAYAH_BUKAN_HAK'));
        return out;
      }
      if (seen.has(existing.record.id)) {
        out.errors.push(rowError(4, 'NIK_GANDA_BERKAS'));
        return out;
      }
      seen.add(existing.record.id);
      out.targetRecordId = existing.record.id;
      out.existingPersonId = existing.personId;
      out.normalized = { hazardMask: value.hazardMask } as ValidatedRow['normalized'];
      out.outcome = existing.record.hazardMask === value.hazardMask ? 'sama' : 'berubah';
      return out;
    });
    return { rows, regionChoices: [], warnings: [] };
  }
}
