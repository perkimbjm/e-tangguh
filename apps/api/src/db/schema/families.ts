import { char, pgTable, uuid } from 'drizzle-orm/pg-core';
import { bytea, createdBy, id, timestamps } from './_columns';
import { persons } from './persons';

export const families = pgTable('families', {
  id: id(),
  kkEnc: bytea('kk_enc').notNull(),
  kkHash: bytea('kk_hash').notNull().unique(),
  kkLast4: char('kk_last4', { length: 4 }).notNull(),
  headPersonId: uuid('head_person_id').references(() => persons.id),
  createdBy: createdBy(),
  ...timestamps(),
});
