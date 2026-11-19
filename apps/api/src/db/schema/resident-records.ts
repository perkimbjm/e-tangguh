import { sql } from 'drizzle-orm';
import { boolean, check, date, index, integer, pgEnum, pgTable, smallint, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { bytea, createdBy, id, timestamps } from './_columns';
import { families } from './families';
import { fiscalYears } from './fiscal-years';
import { hazardZones } from './hazard-zones';
import { importBatches } from './import-batches';
import { persons } from './persons';
import { regions } from './regions';
import { users } from './users';

export const ageGroup = pgEnum('age_group', ['balita', 'anak', 'dewasa', 'lansia']);
export const inactiveReason = pgEnum('inactive_reason', ['meninggal', 'pindah', 'lainnya']);
export const approvalStatus = pgEnum('approval_status', ['menunggu', 'disetujui', 'dikembalikan']);

/** Keadaan seorang warga kawasan rawan pada satu tahun anggaran (Form 5.A.1, 5.A.2). */
export const residentRecords = pgTable(
  'resident_records',
  {
    id: id(),
    fiscalYearId: uuid('fiscal_year_id').notNull().references(() => fiscalYears.id),
    personId: uuid('person_id').notNull().references(() => persons.id),
    familyId: uuid('family_id').references(() => families.id),
    isFamilyHead: boolean('is_family_head').notNull().default(false),
    kelurahanId: uuid('kelurahan_id').notNull().references(() => regions.id),
    rw: text('rw').notNull(),
    rt: text('rt'),
    hazardZoneId: uuid('hazard_zone_id').references(() => hazardZones.id),
    addressEnc: bytea('address_enc').notNull(),
    isPoor: boolean('is_poor').notNull().default(false),
    hasSpecialNeeds: boolean('has_special_needs').notNull().default(false),
    specialNeedsEnc: bytea('special_needs_enc'),
    ageGroup: ageGroup('age_group').notNull(),
    ageGroupOverrideReason: text('age_group_override_reason'),
    hazardMask: smallint('hazard_mask').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    inactiveReason: inactiveReason('inactive_reason'),
    inactiveDate: date('inactive_date'),
    approvalStatus: approvalStatus('approval_status').notNull().default('menunggu'),
    approvalNote: text('approval_note'),
    approvedBy: uuid('approved_by').references(() => users.id),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    source: text('source').notNull(),
    sourceDate: date('source_date').notNull(),
    importBatchId: uuid('import_batch_id').references(() => importBatches.id),
    rowVersion: integer('row_version').notNull().default(1),
    createdBy: createdBy(),
    ...timestamps(),
  },
  (t) => [
    unique('resident_records_year_person').on(t.fiscalYearId, t.personId),
    index('resident_records_scope_idx').on(t.fiscalYearId, t.kelurahanId, t.approvalStatus, t.isActive),
    index('resident_records_hazard_idx').on(t.fiscalYearId, t.hazardMask),
    index('resident_records_family_idx').on(t.familyId),
    index('resident_records_batch_idx').on(t.importBatchId),
    check('resident_records_special_needs', sql`NOT ${t.hasSpecialNeeds} OR ${t.specialNeedsEnc} IS NOT NULL`),
    check('resident_records_inactive', sql`${t.isActive} OR ${t.inactiveReason} IS NOT NULL`),
    check('resident_records_mask', sql`${t.hazardMask} BETWEEN 1 AND 1023`),
  ],
);
