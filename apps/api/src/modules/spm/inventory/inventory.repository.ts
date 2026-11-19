import { Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DbService } from '../../../db/db.module';
import { equipment, logisticsStock } from '../../../db/schema';

export type InventoryKind = 'equipment' | 'logistics';
const TABLES = { equipment, logistics: logisticsStock } as const;
type Row = typeof equipment.$inferSelect | typeof logisticsStock.$inferSelect;

const NUMERIC = ['quantity', 'qtyGood', 'qtyBroken'] as const;

/** Kolom numeric PostgreSQL dibaca sebagai teks oleh pg; diubah ke angka di sini. */
export function toDto(row: Row): Record<string, unknown> {
  const { fiscalYearId: _f, createdBy: _c, createdAt: _a, updatedAt: _u, ...rest } = row;
  const out: Record<string, unknown> = { ...rest };
  for (const k of NUMERIC) out[k] = Number(row[k]);
  return out;
}

export function toDb(values: Record<string, unknown>): Record<string, unknown> {
  const out = { ...values };
  for (const k of NUMERIC) if (typeof out[k] === 'number') out[k] = String(out[k]);
  return out;
}

@Injectable()
export class InventoryRepository {
  constructor(private readonly db: DbService) {}

  list(kind: InventoryKind, fiscalYearId: string): Promise<Row[]> {
    const t = TABLES[kind];
    return this.db
      .executor()
      .select()
      .from(t)
      .where(eq(t.fiscalYearId, fiscalYearId))
      .orderBy(asc(t.name)) as Promise<Row[]>;
  }

  async find(kind: InventoryKind, fiscalYearId: string, id: string): Promise<Row | null> {
    const t = TABLES[kind];
    const [row] = await this.db
      .executor()
      .select()
      .from(t)
      .where(and(eq(t.fiscalYearId, fiscalYearId), eq(t.id, id)))
      .limit(1);
    return (row as Row | undefined) ?? null;
  }

  async insert(kind: InventoryKind, values: Record<string, unknown>): Promise<Row> {
    const [row] = await this.db
      .executor()
      .insert(TABLES[kind])
      .values(toDb(values) as never)
      .returning();
    return row as Row;
  }

  async update(kind: InventoryKind, id: string, values: Record<string, unknown>): Promise<Row> {
    const t = TABLES[kind];
    const [row] = await this.db
      .executor()
      .update(t)
      .set(toDb(values) as never)
      .where(eq(t.id, id))
      .returning();
    return row as Row;
  }

  async delete(kind: InventoryKind, id: string): Promise<void> {
    const t = TABLES[kind];
    await this.db.executor().delete(t).where(eq(t.id, id));
  }
}
