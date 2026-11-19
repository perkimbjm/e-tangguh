import { jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { id, timestamps } from './_columns';
import { users } from './users';

export const appSettings = pgTable('app_settings', {
  id: id(),
  key: text('key').notNull().unique(),
  value: jsonb('value').notNull(),
  updatedBy: uuid('updated_by').references(() => users.id),
  ...timestamps(),
});
