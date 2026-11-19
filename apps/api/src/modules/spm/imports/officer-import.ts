import { Injectable } from '@nestjs/common';
import { type CellValue, type NormalizedOfficerRow, type RegionChoice, type SessionUser, rowError, validateOfficerRow } from '@etangguh/shared';
import { and, eq, inArray } from 'drizzle-orm';
import { BlindIndex } from '../../../crypto/blind-index';
import { DbService } from '../../../db/db.module';
import { officerRecords, persons } from '../../../db/schema';
import { PersonsService } from '../../persons/persons.service';
import { RegionsRepository } from '../../regions/regions.repository';
import type { FiscalYearRow } from '../fiscal-years/fiscal-years.repository';
import { OfficersRepository } from '../officers/officers.repository';
import { OfficersService } from '../officers/officers.service';
import type { ValidatedRow, ValidationResult } from './import-validator';
import type { ImportBatchRow } from './imports.repository';
import { RegionMatcher } from './region-matcher';

export interface ResolvedOfficerRow extends NormalizedOfficerRow {
  dutyKelurahanId: string | null;
}

const COMPARED = ['position', 'employmentStatus', 'dutyKelurahanId', 'certifications', 'isTrcKlb', 'isTrcPdb', 'isPpe', 'postType', 'note'] as const;

/** Validasi dan penerapan impor Form 5.A.5 (petugas). */
@Injectable()
export class OfficerImport {
  constructor(
    private readonly db: DbService,
    private readonly regions: RegionsRepository,
    private readonly blind: BlindIndex,
    private readonly persons: PersonsService,
    private readonly officers: OfficersService,
    private readonly repo: OfficersRepository,
  ) {}

  async validate(input: { rowNumber: number; values: Record<string, CellValue> }[], fy: FiscalYearRow, _user: SessionUser, choices: RegionChoice[]): Promise<ValidationResult> {
    const matcher = new RegionMatcher(this.regions, choices);
    const warnings: string[] = [];
    const rows: ValidatedRow[] = [];
    for (const r of input) {
      const { value, errors } = validateOfficerRow(r.values);
      const out: ValidatedRow = { rowNumber: r.rowNumber, raw: r.values, normalized: null, errors: [...errors], outcome: 'ditolak', targetRecordId: null, existingPersonId: null };
      rows.push(out);
      if (!value) continue;
      const dutyName = value.dutyKelurahanName ?? value.residenceKelurahanName;
      let dutyId: string | null = null;
      if (dutyName) {
        const m = await matcher.match(dutyName);
        if (m.status !== 'auto') {
          out.errors.push(rowError(9, 'WILAYAH_TIDAK_DIKENAL', m.status === 'choice' ? `pilih padanan untuk ejaan "${dutyName}"` : `"${dutyName}"`));
          continue;
        }
        dutyId = m.region.id;
        if (!value.dutyKelurahanName) warnings.push(`Baris ${r.rowNumber}: kelurahan tugas diasumsikan sama dengan kelurahan domisili`);
      }
      out.normalized = { ...value, dutyKelurahanId: dutyId } as unknown as ValidatedRow['normalized'];
    }

    const niks = new Map<string, number>();
    for (const r of rows) {
      const n = r.normalized as unknown as ResolvedOfficerRow | null;
      if (n?.nik) niks.set(n.nik, (niks.get(n.nik) ?? 0) + 1);
    }
    const valid = rows.filter((r) => r.normalized);
    for (const r of valid) {
      const n = r.normalized as unknown as ResolvedOfficerRow;
      if (n.nik && (niks.get(n.nik) ?? 0) > 1) {
        r.errors.push(rowError(3, 'NIK_GANDA_BERKAS'));
        r.normalized = null;
      }
    }

    const hashes = valid.filter((r) => r.normalized && (r.normalized as unknown as ResolvedOfficerRow).nik).map((r) => this.blind.compute('nik', (r.normalized as unknown as ResolvedOfficerRow).nik!));
    const existing = hashes.length
      ? await this.db
          .executor()
          .select({ hash: persons.nikHash, personId: persons.id, officer: officerRecords })
          .from(persons)
          .leftJoin(officerRecords, and(eq(officerRecords.personId, persons.id), eq(officerRecords.fiscalYearId, fy.id)))
          .where(inArray(persons.nikHash, hashes))
      : [];
    const byHash = new Map(existing.map((e) => [e.hash!.toString('hex'), e]));
    for (const r of valid) {
      if (!r.normalized) continue;
      const n = r.normalized as unknown as ResolvedOfficerRow;
      const e = n.nik ? byHash.get(this.blind.compute('nik', n.nik).toString('hex')) : undefined;
      r.existingPersonId = e?.personId ?? null;
      if (!e?.officer) {
        r.outcome = 'baru';
        continue;
      }
      r.targetRecordId = e.officer.id;
      const o = e.officer as unknown as Record<string, unknown>;
      r.outcome = COMPARED.every((k) => (o[k] ?? null) === ((n as unknown as Record<string, unknown>)[k] ?? null)) ? 'sama' : 'berubah';
    }
    for (const r of rows) if (r.errors.length) r.outcome = 'ditolak';
    return { rows, regionChoices: matcher.regionChoices(), warnings: warnings.slice(0, 200) };
  }

  async apply(rows: ValidatedRow[], batch: ImportBatchRow, fy: FiscalYearRow, user: SessionUser): Promise<void> {
    for (const r of rows) {
      if (r.outcome !== 'baru' && r.outcome !== 'berubah') continue;
      const n = r.normalized as unknown as ResolvedOfficerRow;
      const fields = {
        position: n.position,
        employmentStatus: n.employmentStatus,
        dutyKelurahanId: n.dutyKelurahanId,
        certifications: n.certifications,
        isTrcKlb: n.isTrcKlb,
        isTrcPdb: n.isTrcPdb,
        isPpe: n.isPpe,
        isOps: true,
        postType: n.postType,
        postKelurahanId: n.postType ? n.dutyKelurahanId : null,
        note: n.note,
      };
      if (r.outcome === 'baru') {
        const identity = { fullName: n.fullName, gender: n.gender, birthPlace: n.birthPlace, birthDate: n.birthDate };
        const personId =
          r.existingPersonId ??
          (n.nik ? (await this.persons.findOrCreateByNik(n.nik, identity, user.id)).person.id : (await this.persons.createWithoutNik(identity, n.noNikReason ?? 'tidak disebutkan', user.id)).person.id);
        const created = await this.officers.insertForPerson(fy, personId, fields, user, null);
        await this.repo.update(created.id, { importBatchId: batch.id });
      } else {
        const current = await this.repo.findById(fy.id, r.targetRecordId!);
        if (!current) continue;
        await this.repo.update(current.id, { ...(await this.officers.buildFields(fy, fields, current)), importBatchId: batch.id });
      }
    }
  }
}
