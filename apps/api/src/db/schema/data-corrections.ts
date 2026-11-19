import { pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdBy, id, timestamps } from './_columns';
import { fiscalYears } from './fiscal-years';
import { persons } from './persons';
import { users } from './users';

export const correctionStatus = pgEnum('correction_status', ['diajukan', 'diterima', 'ditolak']);

/** Permintaan pembetulan data dari subjek data melalui BPBD (Prinsip I). */
export const dataCorrections = pgTable('data_corrections', {
  id: id(),
  personId: uuid('person_id').notNull().references(() => persons.id),
  fiscalYearId: uuid('fiscal_year_id').references(() => fiscalYears.id),
  requestedVia: text('requested_via').notNull(),
  message: text('message').notNull(),
  status: correctionStatus('status').notNull().default('diajukan'),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  resolutionNote: text('resolution_note'),
  createdBy: createdBy(),
  ...timestamps(),
});
