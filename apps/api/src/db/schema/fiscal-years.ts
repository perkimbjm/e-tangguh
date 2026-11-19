import { sql } from 'drizzle-orm';
import { type AnyPgColumn, check, date, jsonb, pgEnum, pgTable, smallint, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { AgeBands } from '@etangguh/shared';
import { createdBy, id, timestamps } from './_columns';
import { users } from './users';

export const fiscalYearStatus = pgEnum('fiscal_year_status', ['terbuka', 'final', 'revisi']);

export const fiscalYears = pgTable(
  'fiscal_years',
  {
    id: id(),
    year: smallint('year').notNull().unique(),
    status: fiscalYearStatus('status').notNull().default('terbuka'),
    revisionNo: smallint('revision_no').notNull().default(0),
    ageReferenceDate: date('age_reference_date').notNull(),
    ageBands: jsonb('age_bands').$type<AgeBands>().notNull(),
    copiedFromId: uuid('copied_from_id').references((): AnyPgColumn => fiscalYears.id),
    finalizedAt: timestamp('finalized_at', { withTimezone: true }),
    finalizedBy: uuid('finalized_by').references(() => users.id),
    createdBy: createdBy(),
    ...timestamps(),
  },
  (t) => [
    check('fiscal_years_year_range', sql`${t.year} BETWEEN 2000 AND 2100`),
    check('fiscal_years_revision_nonneg', sql`${t.revisionNo} >= 0`),
  ],
);
