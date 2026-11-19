import type { RowError } from '@etangguh/shared';
import { index, integer, jsonb, pgEnum, pgTable, uuid } from 'drizzle-orm/pg-core';
import { id } from './_columns';
import { importBatches } from './import-batches';

export const importOutcome = pgEnum('import_outcome', ['baru', 'berubah', 'sama', 'ditolak']);

export const importRows = pgTable(
  'import_rows',
  {
    id: id(),
    batchId: uuid('batch_id').notNull().references(() => importBatches.id, { onDelete: 'cascade' }),
    rowNumber: integer('row_number').notNull(),
    raw: jsonb('raw').$type<Record<string, unknown>>().notNull(),
    normalized: jsonb('normalized').$type<Record<string, unknown>>(),
    errors: jsonb('errors').$type<RowError[]>().notNull().default([]),
    outcome: importOutcome('outcome').notNull(),
    targetId: uuid('target_id'),
  },
  (t) => [index('import_rows_batch_idx').on(t.batchId, t.rowNumber)],
);
