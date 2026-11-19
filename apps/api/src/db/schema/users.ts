import { sql } from 'drizzle-orm';
import { boolean, check, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { ROLES } from '@etangguh/shared';
import { citext, id, timestamps } from './_columns';
import { regions } from './regions';

export const userRole = pgEnum('user_role', ROLES);

export const users = pgTable(
  'users',
  {
    id: id(),
    email: citext('email').unique(),
    phone: text('phone').unique(),
    passwordHash: text('password_hash').notNull(),
    role: userRole('role').notNull().default('relawan'),
    kelurahanId: uuid('kelurahan_id').references(() => regions.id),
    isActive: boolean('is_active').notNull().default(true),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    check('users_contact_required', sql`${t.email} IS NOT NULL OR ${t.phone} IS NOT NULL`),
    check(
      'users_kelurahan_scope',
      sql`(${t.role} = 'pendata_kelurahan') = (${t.kelurahanId} IS NOT NULL)`,
    ),
  ],
);
