import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { bytea, id } from './_columns';
import { users } from './users';

export const sessions = pgTable(
  'sessions',
  {
    id: id(),
    /** SHA-256 atas token acak; token asli hanya ada di cookie pengguna. */
    tokenHash: bytea('token_hash').notNull().unique(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    csrfToken: text('csrf_token').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ip: text('ip'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('sessions_user_idx').on(t.userId), index('sessions_expires_idx').on(t.expiresAt)],
);
