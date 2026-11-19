import { index, jsonb, pgTable, smallint, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { id } from './_columns';
import { files } from './files';
import { fiscalYears } from './fiscal-years';
import { users } from './users';

/** Arsip finalisasi per revisi (hanya-tambah; pemicu menolak UPDATE/DELETE). */
export const fiscalYearSnapshots = pgTable(
  'fiscal_year_snapshots',
  {
    id: id(),
    fiscalYearId: uuid('fiscal_year_id').notNull().references(() => fiscalYears.id),
    revisionNo: smallint('revision_no').notNull(),
    reason: text('reason'),
    recapJson: jsonb('recap_json').notNull(),
    archiveFileId: uuid('archive_file_id').notNull().references(() => files.id),
    sha256: text('sha256').notNull(),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('fiscal_year_snapshots_rev').on(t.fiscalYearId, t.revisionNo), index('fiscal_year_snapshots_fy_idx').on(t.fiscalYearId)],
);
