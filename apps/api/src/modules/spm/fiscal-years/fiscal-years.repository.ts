import { Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DbService } from '../../../db/db.module';
import { fiscalYears } from '../../../db/schema';

export type FiscalYearRow = typeof fiscalYears.$inferSelect;

@Injectable()
export class FiscalYearsRepository {
  constructor(private readonly db: DbService) {}

  list(): Promise<FiscalYearRow[]> {
    return this.db.executor().select().from(fiscalYears).orderBy(desc(fiscalYears.year));
  }

  async findByYear(year: number, forUpdate = false): Promise<FiscalYearRow | null> {
    const q = this.db.executor().select().from(fiscalYears).where(eq(fiscalYears.year, year)).limit(1);
    const [row] = forUpdate ? await q.for('update') : await q;
    return row ?? null;
  }

  async insert(values: typeof fiscalYears.$inferInsert): Promise<FiscalYearRow> {
    const [row] = await this.db.executor().insert(fiscalYears).values(values).returning();
    return row!;
  }

  async update(id: string, values: Partial<typeof fiscalYears.$inferInsert>): Promise<FiscalYearRow> {
    const [row] = await this.db.executor().update(fiscalYears).set(values).where(eq(fiscalYears.id, id)).returning();
    return row!;
  }
}
