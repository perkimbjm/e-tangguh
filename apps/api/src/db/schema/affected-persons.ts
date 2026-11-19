import { AFFECTED_STATUSES } from '@etangguh/shared';
import { boolean, pgEnum, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { createdBy, id, timestamps } from './_columns';
import { disasterEvents } from './disaster-events';
import { persons } from './persons';

export const affectedStatus = pgEnum('affected_status', AFFECTED_STATUSES);

/** Warga terdampak per kejadian (Form 5.A.9, 5.A.10). */
export const affectedPersons = pgTable(
  'affected_persons',
  {
    id: id(),
    eventId: uuid('event_id').notNull().references(() => disasterEvents.id, { onDelete: 'cascade' }),
    personId: uuid('person_id').notNull().references(() => persons.id),
    status: affectedStatus('status').notNull(),
    isDisplaced: boolean('is_displaced').notNull().default(false),
    statusUpdatedAt: timestamp('status_updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: createdBy(),
    ...timestamps(),
  },
  (t) => [unique('affected_persons_event_person').on(t.eventId, t.personId)],
);
