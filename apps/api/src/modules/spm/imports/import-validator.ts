import { Injectable } from '@nestjs/common';
import {
  type CellValue,
  type ImportOutcome,
  type NormalizedResidentRow,
  type RegionChoice,
  type RowError,
  type SessionUser,
  rowError,
  validateResidentRow,
} from '@etangguh/shared';
import { BlindIndex } from '../../../crypto/blind-index';
import { FieldCipher } from '../../../crypto/field-cipher';
import { RegionsRepository } from '../../regions/regions.repository';
import { HazardZonesRepository } from '../hazard-zones/hazard-zones.repository';
import type { FiscalYearRow } from '../fiscal-years/fiscal-years.repository';
import { type ExistingResident, ImportLookup } from './import-lookup';
import { RegionMatcher } from './region-matcher';

export interface ResolvedResidentRow extends NormalizedResidentRow {
  kelurahanId: string;
  hazardZoneId: string;
  hazardMask: number;
}

export interface ValidatedRow {
  rowNumber: number;
  raw: Record<string, CellValue>;
  normalized: ResolvedResidentRow | null;
  errors: RowError[];
  outcome: ImportOutcome;
  /** Catatan warga yang diubah (outcome berubah/sama), atau orang yang sudah ada (baru, tanpa catatan tahun ini). */
  targetRecordId: string | null;
  existingPersonId: string | null;
}

export interface ValidationResult {
  rows: ValidatedRow[];
  regionChoices: RegionChoice[];
  warnings: string[];
}

const naturalKey = (name: string, birthDate: string | null, kkHex: string | null) =>
  `${name.toLowerCase().replace(/\s+/g, ' ').trim()}|${birthDate ?? ''}|${kkHex ?? ''}`;

/** Validasi impor Form 5.A.1: aturan baris, wilayah, hak kelurahan, kawasan rawan, ganda, dan hasil. */
@Injectable()
export class ImportValidator {
  constructor(
    private readonly lookup: ImportLookup,
    private readonly regions: RegionsRepository,
    private readonly zones: HazardZonesRepository,
    private readonly blind: BlindIndex,
    private readonly cipher: FieldCipher,
  ) {}

  async validateResidents(
    input: { rowNumber: number; values: Record<string, CellValue> }[],
    fy: FiscalYearRow,
    user: SessionUser,
    existingChoices: RegionChoice[] = [],
  ): Promise<ValidationResult> {
    const matcher = new RegionMatcher(this.regions, existingChoices);
    const zoneIndex = await this.zones.index(fy.id, user.role === 'pendata_kelurahan' ? user.kelurahanId : null);
    const today = new Date().toISOString().slice(0, 10);
    const warnings: string[] = [];

    // Tahap 1: aturan baris + wilayah + kawasan rawan.
    const rows: ValidatedRow[] = [];
    for (const r of input) {
      const { value, errors } = validateResidentRow(r.values, today);
      const out: ValidatedRow = { rowNumber: r.rowNumber, raw: r.values, normalized: null, errors: [...errors], outcome: 'ditolak', targetRecordId: null, existingPersonId: null };
      rows.push(out);
      if (!value) continue;
      const match = await matcher.match(value.kelurahanName);
      if (match.status !== 'auto') {
        out.errors.push(
          rowError(10, 'WILAYAH_TIDAK_DIKENAL', match.status === 'choice' ? `pilih padanan untuk ejaan "${value.kelurahanName}"` : `"${value.kelurahanName}"`),
        );
        continue;
      }
      if (user.role === 'pendata_kelurahan' && match.region.id !== user.kelurahanId) {
        out.errors.push(rowError(10, 'WILAYAH_BUKAN_HAK', match.region.name));
        continue;
      }
      const zone = zoneIndex.resolve(match.region.id, value.rw, value.rt);
      if (!zone) {
        out.errors.push(rowError(9, 'DI_LUAR_KAWASAN_RAWAN', `RW ${value.rw}${value.rt ? ` RT ${value.rt}` : ''}`));
        continue;
      }
      out.normalized = { ...value, kelurahanId: match.region.id, hazardZoneId: zone.id, hazardMask: zone.hazardMask };
    }

    // Tahap 2: NIK ganda dalam berkas (semua kemunculan ditolak).
    const nikCount = new Map<string, number>();
    for (const r of rows) if (r.normalized?.nik) nikCount.set(r.normalized.nik, (nikCount.get(r.normalized.nik) ?? 0) + 1);
    for (const r of rows) {
      if (r.normalized?.nik && (nikCount.get(r.normalized.nik) ?? 0) > 1) {
        r.errors.push(rowError(4, 'NIK_GANDA_BERKAS'));
        r.normalized = null;
      }
    }

    // Tahap 3: bandingkan dengan data tersimpan.
    const valid = rows.filter((r) => r.normalized);
    const hashOf = new Map<ValidatedRow, Buffer>();
    for (const r of valid) if (r.normalized!.nik) hashOf.set(r, this.blind.compute('nik', r.normalized!.nik));
    const byNik = await this.lookup.byNikHash(fy.id, [...hashOf.values()]);
    const noNikExisting = valid.some((r) => !r.normalized!.nik) ? await this.lookup.withoutNik(fy.id) : [];
    const noNikIndex = new Map(noNikExisting.map((e) => [naturalKey(e.fullName, e.birthDate, e.kkHash?.toString('hex') ?? null), e]));
    const kkHashes = valid.filter((r) => r.normalized!.kk).map((r) => this.blind.compute('kk', r.normalized!.kk!));
    const kkKelurahan = await this.lookup.familyKelurahan(fy.id, kkHashes);

    for (const r of valid) {
      const n = r.normalized!;
      const kkHex = n.kk ? this.blind.compute('kk', n.kk).toString('hex') : null;
      if (kkHex && [...(kkKelurahan.get(kkHex) ?? [])].some((k) => k !== n.kelurahanId)) {
        warnings.push(`Baris ${r.rowNumber}: nomor KK sudah tercatat di kelurahan lain`);
      }
      const existing = n.nik ? byNik.get(hashOf.get(r)!.toString('hex')) : noNikIndex.get(naturalKey(n.fullName, n.birthDate, kkHex));
      if (!existing?.record) {
        r.outcome = 'baru';
        r.existingPersonId = existing?.personId ?? null;
        if (!n.nik) warnings.push(`Baris ${r.rowNumber}: warga tanpa NIK; periksa kemungkinan orang ganda setelah disimpan`);
        continue;
      }
      if (existing.record.kelurahanId !== n.kelurahanId) {
        r.errors.push(rowError(4, 'NIK_KELURAHAN_LAIN'));
        r.normalized = null;
        continue;
      }
      r.targetRecordId = existing.record.id;
      r.existingPersonId = existing.personId;
      r.outcome = this.isUnchanged(n, existing, kkHex) ? 'sama' : 'berubah';
    }
    for (const r of rows) if (r.errors.length) r.outcome = 'ditolak';
    return { rows, regionChoices: matcher.regionChoices(), warnings: warnings.slice(0, 200) };
  }

  private isUnchanged(n: ResolvedResidentRow, e: ExistingResident, kkHex: string | null): boolean {
    const rec = e.record!;
    return (
      e.fullName === n.fullName &&
      e.gender === n.gender &&
      (e.birthPlace ?? null) === n.birthPlace &&
      e.birthDate === n.birthDate &&
      (e.kkHash?.toString('hex') ?? null) === kkHex &&
      rec.rw === n.rw &&
      (rec.rt ?? null) === n.rt &&
      rec.isPoor === n.isPoor &&
      rec.hasSpecialNeeds === n.hasSpecialNeeds &&
      rec.isFamilyHead === n.isFamilyHead &&
      this.cipher.decrypt(rec.addressEnc) === n.address &&
      this.cipher.decryptNullable(rec.specialNeedsEnc) === n.specialNeeds
    );
  }
}
