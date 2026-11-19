import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { affectedPersons, affectedStatus } from './affected-persons';
import { id } from './_columns';
import { users } from './users';

/** Riwayat status korban (hanya-tambah; pemicu menolak UPDATE/DELETE). */
export const affectedStatusHistory = pgTable(
  'affected_status_history',
  {
    id: id(),
    affectedPersonId: uuid('affected_person_id').notNull().references(() => affectedPersons.id, { onDelete: 'cascade' }),
    status: affectedStatus('status').notNull(),
    changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
    changedBy: uuid('changed_by').references(() => users.id),
    note: text('note'),
  },
  (t) => [index('affected_status_history_idx').on(t.affectedPersonId, t.changedAt)],
);
