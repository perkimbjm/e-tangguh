import { Injectable } from '@nestjs/common';
import type { ListResidentsQuery } from '@etangguh/shared';
import { type SQL, and, asc, eq, gt, inArray, or, sql } from 'drizzle-orm';
import { DbService } from '../../../db/db.module';
import { families, persons, regions, residentRecords } from '../../../db/schema';

export type ResidentRecordRow = typeof residentRecords.$inferSelect;
export type ResidentInsert = typeof residentRecords.$inferInsert;

export const residentSelect = {
  record: residentRecords,
  person: {
    id: persons.id,
    fullName: persons.fullName,
    gender: persons.gender,
    birthDate: persons.birthDate,
    birthPlace: persons.birthPlace,
    nikEnc: persons.nikEnc,
    nikLast4: persons.nikLast4,
    noNikReason: persons.noNikReason,
  },
  family: { kkEnc: families.kkEnc, kkLast4: families.kkLast4 },
  kelurahanName: regions.name,
};

export type ResidentJoined = {
  record: ResidentRecordRow;
  person: { id: string; fullName: string; gender: 'L' | 'P'; birthDate: string | null; birthPlace: string | null; nikEnc: Buffer | null; nikLast4: string | null; noNikReason: string | null };
  family: { kkEnc: Buffer | null; kkLast4: string | null } | null;
  kelurahanName: string;
};

interface Cursor {
  n: string;
  i: string;
}

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c)).toString('base64url');
}

function decodeCursor(value?: string): Cursor | null {
  if (!value) return null;
  try {
    const c = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Cursor;
    return typeof c.n === 'string' && typeof c.i === 'string' ? c : null;
  } catch {
    return null;
  }
}

export interface ListFilter extends Omit<ListResidentsQuery, 'kelurahan' | 'nik'> {
  /** Sudah melewati KelurahanScope. `null` = seluruh kelurahan. */
  kelurahanId: string | null;
  nikHash?: Buffer;
}

@Injectable()
export class ResidentsRepository {
  constructor(private readonly db: DbService) {}

  private base() {
    return this.db
      .executor()
      .select(residentSelect)
      .from(residentRecords)
      .innerJoin(persons, eq(persons.id, residentRecords.personId))
      .leftJoin(families, eq(families.id, residentRecords.familyId))
      .innerJoin(regions, eq(regions.id, residentRecords.kelurahanId));
  }

  /** Daftar berkursor (urut nama, lalu id). Selalu dipanggil dengan kelurahan hasil KelurahanScope. */
  async list(fiscalYearId: string, f: ListFilter): Promise<ResidentJoined[]> {
    const conds: (SQL | undefined)[] = [
      eq(residentRecords.fiscalYearId, fiscalYearId),
      f.kelurahanId ? eq(residentRecords.kelurahanId, f.kelurahanId) : undefined,
      f.rw ? eq(residentRecords.rw, String(Number(f.rw))) : undefined,
      f.rt ? eq(residentRecords.rt, String(Number(f.rt))) : undefined,
      f.status ? eq(residentRecords.approvalStatus, f.status) : undefined,
      f.active ? eq(residentRecords.isActive, f.active === 'true') : undefined,
      f.batch ? eq(residentRecords.importBatchId, f.batch) : undefined,
      f.nikHash ? eq(persons.nikHash, f.nikHash) : undefined,
      f.q ? or(sql`${persons.fullName} ILIKE ${'%' + f.q.replace(/[%_\\]/g, '\\$&') + '%'}`, sql`similarity(${persons.fullName}, ${f.q}) >= 0.4`) : undefined,
    ];
    const cursor = decodeCursor(f.cursor);
    if (cursor) {
      conds.push(or(gt(persons.fullName, cursor.n), and(eq(persons.fullName, cursor.n), gt(residentRecords.id, cursor.i))));
    }
    return (await this.base()
      .where(and(...conds))
      .orderBy(asc(persons.fullName), asc(residentRecords.id))
      .limit(f.limit + 1)) as ResidentJoined[];
  }

  async findJoined(fiscalYearId: string, id: string): Promise<ResidentJoined | null> {
    const [row] = await this.base()
      .where(and(eq(residentRecords.fiscalYearId, fiscalYearId), eq(residentRecords.id, id)))
      .limit(1);
    return (row as ResidentJoined | undefined) ?? null;
  }

  async findById(fiscalYearId: string, id: string): Promise<ResidentRecordRow | null> {
    const [row] = await this.db
      .executor()
      .select()
      .from(residentRecords)
      .where(and(eq(residentRecords.fiscalYearId, fiscalYearId), eq(residentRecords.id, id)))
      .limit(1);
    return row ?? null;
  }

  async findByPerson(fiscalYearId: string, personId: string): Promise<ResidentRecordRow | null> {
    const [row] = await this.db
      .executor()
      .select()
      .from(residentRecords)
      .where(and(eq(residentRecords.fiscalYearId, fiscalYearId), eq(residentRecords.personId, personId)))
      .limit(1);
    return row ?? null;
  }

  async findByPersons(fiscalYearId: string, personIds: string[]): Promise<ResidentRecordRow[]> {
    if (personIds.length === 0) return [];
    return this.db
      .executor()
      .select()
      .from(residentRecords)
      .where(and(eq(residentRecords.fiscalYearId, fiscalYearId), inArray(residentRecords.personId, personIds)));
  }

  async insert(values: ResidentInsert): Promise<ResidentRecordRow> {
    const [row] = await this.db.executor().insert(residentRecords).values(values).returning();
    return row!;
  }

  /** Ubah dengan kunci optimistik; `null` bila `row_version` usang. */
  async updateVersioned(id: string, rowVersion: number, values: Partial<ResidentInsert>): Promise<ResidentRecordRow | null> {
    const [row] = await this.db
      .executor()
      .update(residentRecords)
      .set({ ...values, rowVersion: sql`${residentRecords.rowVersion} + 1` })
      .where(and(eq(residentRecords.id, id), eq(residentRecords.rowVersion, rowVersion)))
      .returning();
    return row ?? null;
  }

  async update(id: string, values: Partial<ResidentInsert>): Promise<ResidentRecordRow> {
    const [row] = await this.db
      .executor()
      .update(residentRecords)
      .set({ ...values, rowVersion: sql`${residentRecords.rowVersion} + 1` })
      .where(eq(residentRecords.id, id))
      .returning();
    return row!;
  }
}
