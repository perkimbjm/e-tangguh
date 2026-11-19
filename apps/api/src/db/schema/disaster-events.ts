import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createdBy, geographyPoint, id, timestamps } from './_columns';
import { files } from './files';
import { fiscalYears } from './fiscal-years';
import { hazardTypes } from './hazard-types';
import { regions } from './regions';

/** Kejadian bencana (Form 5.A.12). Status darurat dihitung dari `reported_at` dan `emergency_declared_at`. */
export const disasterEvents = pgTable(
  'disaster_events',
  {
    id: id(),
    fiscalYearId: uuid('fiscal_year_id').notNull().references(() => fiscalYears.id),
    name: text('name').notNull(),
    hazardTypeId: uuid('hazard_type_id').notNull().references(() => hazardTypes.id),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    reportedAt: timestamp('reported_at', { withTimezone: true }).notNull(),
    locationText: text('location_text').notNull(),
    kelurahanId: uuid('kelurahan_id').references(() => regions.id),
    location: geographyPoint('location'),
    emergencyDeclaredAt: timestamp('emergency_declared_at', { withTimezone: true }),
    emergencyDocFileId: uuid('emergency_doc_file_id').references(() => files.id),
    createdBy: createdBy(),
    ...timestamps(),
  },
  (t) => [
    index('disaster_events_year_idx').on(t.fiscalYearId, t.occurredAt),
    index('disaster_events_location_gist').using('gist', t.location),
    check('disaster_events_report_after', sql`${t.reportedAt} >= ${t.occurredAt}`),
  ],
);
