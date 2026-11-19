import type { RegionChoice } from '@etangguh/shared';
import { integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { id, timestamps } from './_columns';
import { files } from './files';
import { fiscalYears } from './fiscal-years';
import { regions } from './regions';
import { users } from './users';

export const importStatus = pgEnum('import_status', ['divalidasi', 'dikonfirmasi', 'dibatalkan']);

export const importBatches = pgTable('import_batches', {
  id: id(),
  fiscalYearId: uuid('fiscal_year_id').notNull().references(() => fiscalYears.id),
  formCode: text('form_code').notNull(),
  kelurahanId: uuid('kelurahan_id').references(() => regions.id),
  fileId: uuid('file_id').references(() => files.id),
  fileSha256: text('file_sha256').notNull(),
  status: importStatus('status').notNull().default('divalidasi'),
  rowsTotal: integer('rows_total').notNull().default(0),
  rowsNew: integer('rows_new').notNull().default(0),
  rowsChanged: integer('rows_changed').notNull().default(0),
  rowsUnchanged: integer('rows_unchanged').notNull().default(0),
  rowsRejected: integer('rows_rejected').notNull().default(0),
  /** Pilihan padanan wilayah per ejaan; keputusan operator berlaku untuk semua baris berejaan sama. */
  regionChoices: jsonb('region_choices').$type<RegionChoice[]>().notNull().default([]),
  warnings: jsonb('warnings').$type<string[]>().notNull().default([]),
  originalName: text('original_name'),
  uploadedBy: uuid('uploaded_by').notNull().references(() => users.id),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  /** Waktu NIK/KK pada import_rows dihapus. */
  purgedAt: timestamp('purged_at', { withTimezone: true }),
  ...timestamps(),
});
