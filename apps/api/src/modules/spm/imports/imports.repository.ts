import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, isNull, lt, ne, sql } from 'drizzle-orm';
import { DbService } from '../../../db/db.module';
import { importBatches, importRows } from '../../../db/schema';

export type ImportBatchRow = typeof importBatches.$inferSelect;
export type ImportRowInsert = typeof importRows.$inferInsert;
export type ImportRowRow = typeof importRows.$inferSelect;

const CHUNK = 500;

@Injectable()
export class ImportsRepository {
  constructor(private readonly db: DbService) {}

  async insertBatch(values: typeof importBatches.$inferInsert): Promise<ImportBatchRow> {
    const [row] = await this.db.executor().insert(importBatches).values(values).returning();
    return row!;
  }

  async updateBatch(id: string, values: Partial<typeof importBatches.$inferInsert>): Promise<ImportBatchRow> {
    const [row] = await this.db.executor().update(importBatches).set(values).where(eq(importBatches.id, id)).returning();
    return row!;
  }

  async findBatch(fiscalYearId: string, id: string, forUpdate = false): Promise<ImportBatchRow | null> {
    const q = this.db
      .executor()
      .select()
      .from(importBatches)
      .where(and(eq(importBatches.fiscalYearId, fiscalYearId), eq(importBatches.id, id)))
      .limit(1);
    const [row] = forUpdate ? await q.for('update') : await q;
    return row ?? null;
  }

  async replaceRows(batchId: string, rows: Omit<ImportRowInsert, 'batchId'>[]): Promise<void> {
    await this.db.executor().delete(importRows).where(eq(importRows.batchId, batchId));
    for (let i = 0; i < rows.length; i += CHUNK) {
      await this.db
        .executor()
        .insert(importRows)
        .values(rows.slice(i, i + CHUNK).map((r) => ({ ...r, batchId })));
    }
  }

  listRows(batchId: string): Promise<ImportRowRow[]> {
    return this.db.executor().select().from(importRows).where(eq(importRows.batchId, batchId)).orderBy(asc(importRows.rowNumber));
  }

  rejectedRows(batchId: string, limit?: number) {
    const q = this.db
      .executor()
      .select({ rowNumber: importRows.rowNumber, errors: importRows.errors })
      .from(importRows)
      .where(and(eq(importRows.batchId, batchId), eq(importRows.outcome, 'ditolak')))
      .orderBy(asc(importRows.rowNumber));
    return limit ? q.limit(limit) : q;
  }

  async setTarget(rowId: string, targetId: string): Promise<void> {
    await this.db.executor().update(importRows).set({ targetId }).where(eq(importRows.id, rowId));
  }

  async confirmedWithSha(fiscalYearId: string, sha: string, excludeId?: string): Promise<boolean> {
    const [row] = await this.db
      .executor()
      .select({ id: importBatches.id })
      .from(importBatches)
      .where(
        and(
          eq(importBatches.fiscalYearId, fiscalYearId),
          eq(importBatches.fileSha256, sha),
          eq(importBatches.status, 'dikonfirmasi'),
          excludeId ? ne(importBatches.id, excludeId) : undefined,
        ),
      )
      .orderBy(desc(importBatches.createdAt))
      .limit(1);
    return Boolean(row);
  }

  /** Menghapus kunci sensitif dari baris antara (NIK, KK, alamat, kebutuhan khusus, alasan). */
  async purgeRows(batchId: string, keys: readonly string[]): Promise<void> {
    const arr = sql.raw(`ARRAY[${keys.map((k) => `'${k.replace(/'/g, '')}'`).join(',')}]::text[]`);
    await this.db
      .executor()
      .update(importRows)
      .set({
        raw: sql`${importRows.raw} - ${arr}`,
        normalized: sql`CASE WHEN ${importRows.normalized} IS NULL THEN NULL ELSE ${importRows.normalized} - ${arr} END`,
      })
      .where(eq(importRows.batchId, batchId));
  }

  expiredUnpurged(olderThan: Date) {
    return this.db
      .executor()
      .select({ id: importBatches.id, fileId: importBatches.fileId })
      .from(importBatches)
      .where(and(isNull(importBatches.purgedAt), lt(importBatches.createdAt, olderThan)));
  }
}
