import { Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { DbService } from '../../../db/db.module';
import { families, persons, residentRecords } from '../../../db/schema';

export interface ExistingResident {
  personId: string;
  nikHash: Buffer | null;
  fullName: string;
  gender: 'L' | 'P';
  birthPlace: string | null;
  birthDate: string | null;
  kkHash: Buffer | null;
  record: {
    id: string;
    kelurahanId: string;
    rw: string;
    rt: string | null;
    addressEnc: Buffer;
    isPoor: boolean;
    hasSpecialNeeds: boolean;
    specialNeedsEnc: Buffer | null;
    isFamilyHead: boolean;
    hazardMask: number;
    rowVersion: number;
  } | null;
}

interface LookupRow {
  personId: string;
  nikHash: Buffer | null;
  fullName: string;
  gender: 'L' | 'P';
  birthPlace: string | null;
  birthDate: string | null;
  kkHash: Buffer | null;
  recordId: string | null;
  kelurahanId: string | null;
  rw: string | null;
  rt: string | null;
  addressEnc: Buffer | null;
  isPoor: boolean | null;
  hasSpecialNeeds: boolean | null;
  specialNeedsEnc: Buffer | null;
  isFamilyHead: boolean | null;
  hazardMask: number | null;
  rowVersion: number | null;
}

const CHUNK = 1000;

function chunks<T>(xs: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += CHUNK) out.push(xs.slice(i, i + CHUNK));
  return out;
}

/** Kueri massal untuk menentukan baris baru/berubah/sama tanpa kueri per baris. */
@Injectable()
export class ImportLookup {
  constructor(private readonly db: DbService) {}

  private select() {
    return {
      personId: persons.id,
      nikHash: persons.nikHash,
      fullName: persons.fullName,
      gender: persons.gender,
      birthPlace: persons.birthPlace,
      birthDate: persons.birthDate,
      kkHash: families.kkHash,
      recordId: residentRecords.id,
      kelurahanId: residentRecords.kelurahanId,
      rw: residentRecords.rw,
      rt: residentRecords.rt,
      addressEnc: residentRecords.addressEnc,
      isPoor: residentRecords.isPoor,
      hasSpecialNeeds: residentRecords.hasSpecialNeeds,
      specialNeedsEnc: residentRecords.specialNeedsEnc,
      isFamilyHead: residentRecords.isFamilyHead,
      hazardMask: residentRecords.hazardMask,
      rowVersion: residentRecords.rowVersion,
    };
  }

  private toExisting(row: LookupRow): ExistingResident {
    return {
      personId: row.personId,
      nikHash: row.nikHash,
      fullName: row.fullName,
      gender: row.gender,
      birthPlace: row.birthPlace,
      birthDate: row.birthDate,
      kkHash: row.kkHash,
      record: row.recordId
        ? {
            id: row.recordId,
            kelurahanId: row.kelurahanId!,
            rw: row.rw!,
            rt: row.rt,
            addressEnc: row.addressEnc!,
            isPoor: row.isPoor!,
            hasSpecialNeeds: row.hasSpecialNeeds!,
            specialNeedsEnc: row.specialNeedsEnc,
            isFamilyHead: row.isFamilyHead!,
            hazardMask: row.hazardMask!,
            rowVersion: row.rowVersion!,
          }
        : null,
    };
  }

  /** Orang ber-NIK menurut `nik_hash`, beserta catatan tahun ini bila ada. Kunci peta = hash heks. */
  async byNikHash(fiscalYearId: string, hashes: Buffer[]): Promise<Map<string, ExistingResident>> {
    const out = new Map<string, ExistingResident>();
    for (const part of chunks(hashes)) {
      const rows = await this.db
        .executor()
        .select(this.select())
        .from(persons)
        .leftJoin(residentRecords, and(eq(residentRecords.personId, persons.id), eq(residentRecords.fiscalYearId, fiscalYearId)))
        .leftJoin(families, eq(families.id, residentRecords.familyId))
        .where(and(inArray(persons.nikHash, part), isNull(persons.mergedIntoId)));
      for (const r of rows) out.set((r.nikHash as Buffer).toString('hex'), this.toExisting(r));
    }
    return out;
  }

  /** Warga tanpa NIK yang tercatat pada tahun ini; dicocokkan lewat (nama, tanggal lahir, KK). */
  async withoutNik(fiscalYearId: string): Promise<ExistingResident[]> {
    const rows = await this.db
      .executor()
      .select(this.select())
      .from(residentRecords)
      .innerJoin(persons, eq(persons.id, residentRecords.personId))
      .leftJoin(families, eq(families.id, residentRecords.familyId))
      .where(and(eq(residentRecords.fiscalYearId, fiscalYearId), isNull(persons.nikHash)));
    return rows.map((r) => this.toExisting(r));
  }

  /** Kelurahan tempat tiap KK sudah tercatat (untuk peringatan KK lintas kelurahan). */
  async familyKelurahan(fiscalYearId: string, kkHashes: Buffer[]): Promise<Map<string, Set<string>>> {
    const out = new Map<string, Set<string>>();
    for (const part of chunks(kkHashes)) {
      const rows = await this.db
        .executor()
        .selectDistinct({ kkHash: families.kkHash, kelurahanId: residentRecords.kelurahanId })
        .from(families)
        .innerJoin(residentRecords, and(eq(residentRecords.familyId, families.id), eq(residentRecords.fiscalYearId, fiscalYearId)))
        .where(inArray(families.kkHash, part));
      for (const r of rows) {
        const k = r.kkHash.toString('hex');
        if (!out.has(k)) out.set(k, new Set());
        out.get(k)!.add(r.kelurahanId);
      }
    }
    return out;
  }
}
