import { Injectable } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { DbService } from '../../db/db.module';
import { families, persons } from '../../db/schema';

export type PersonRow = typeof persons.$inferSelect;
export type PersonInsert = typeof persons.$inferInsert;
export type FamilyRow = typeof families.$inferSelect;

export interface DuplicateCandidate {
  id: string;
  fullName: string;
  birthDate: string | null;
  nikLast4: string | null;
  score: number;
}

@Injectable()
export class PersonsRepository {
  constructor(private readonly db: DbService) {}

  async findByNikHash(nikHash: Buffer): Promise<PersonRow | null> {
    const [row] = await this.db.executor().select().from(persons).where(eq(persons.nikHash, nikHash)).limit(1);
    return row ?? null;
  }

  async findById(id: string): Promise<PersonRow | null> {
    const [row] = await this.db.executor().select().from(persons).where(eq(persons.id, id)).limit(1);
    return row ?? null;
  }

  async insert(values: PersonInsert): Promise<PersonRow> {
    const [row] = await this.db.executor().insert(persons).values(values).returning();
    return row!;
  }

  /** Kandidat ganda: nama mirip (trigram ≥ 0,6) dan tanggal lahir sama, belum digabung. */
  async findDuplicateCandidates(fullName: string, birthDate: string | null, excludeId?: string): Promise<DuplicateCandidate[]> {
    const score = sql<number>`similarity(lower(${persons.fullName}), lower(${fullName}))`;
    const rows = await this.db
      .executor()
      .select({ id: persons.id, fullName: persons.fullName, birthDate: persons.birthDate, nikLast4: persons.nikLast4, score })
      .from(persons)
      .where(
        and(
          isNull(persons.mergedIntoId),
          birthDate ? eq(persons.birthDate, birthDate) : isNull(persons.birthDate),
          sql`${score} >= 0.6`,
          excludeId ? sql`${persons.id} <> ${excludeId}` : undefined,
        ),
      )
      .orderBy(sql`${score} desc`)
      .limit(10);
    return rows.map((r) => ({ ...r, score: Number(r.score) }));
  }

  async findFamilyByHash(kkHash: Buffer): Promise<FamilyRow | null> {
    const [row] = await this.db.executor().select().from(families).where(eq(families.kkHash, kkHash)).limit(1);
    return row ?? null;
  }

  async insertFamily(values: typeof families.$inferInsert): Promise<FamilyRow> {
    const [row] = await this.db.executor().insert(families).values(values).returning();
    return row!;
  }

  async updateIdentity(id: string, values: Partial<Pick<PersonInsert, 'fullName' | 'gender' | 'birthPlace' | 'birthDate'>>): Promise<void> {
    if (Object.keys(values).length === 0) return;
    await this.db.executor().update(persons).set(values).where(eq(persons.id, id));
  }

  async setFamilyHead(familyId: string, personId: string): Promise<void> {
    await this.db.executor().update(families).set({ headPersonId: personId }).where(eq(families.id, familyId));
  }
}
