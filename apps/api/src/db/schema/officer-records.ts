import { EMPLOYMENT_STATUSES, OFFICER_POSITIONS, POST_TYPES } from '@etangguh/shared';
import { sql } from 'drizzle-orm';
import { boolean, check, index, pgEnum, pgTable, smallint, text, unique, uuid } from 'drizzle-orm/pg-core';
import { createdBy, id, timestamps } from './_columns';
import { fiscalYears } from './fiscal-years';
import { persons } from './persons';
import { regions } from './regions';

export const officerPosition = pgEnum('officer_position', OFFICER_POSITIONS);
export const employmentStatus = pgEnum('employment_status', EMPLOYMENT_STATUSES);
export const postType = pgEnum('post_type', POST_TYPES);

/** Petugas/aparatur per tahun anggaran (Form 5.A.5); data diri pada `persons`. */
export const officerRecords = pgTable(
  'officer_records',
  {
    id: id(),
    fiscalYearId: uuid('fiscal_year_id').notNull().references(() => fiscalYears.id),
    personId: uuid('person_id').notNull().references(() => persons.id),
    /** Relawan fitur 001 (tabel belum ada; tanpa FK sampai modul relawan tersedia). */
    volunteerId: uuid('volunteer_id'),
    position: officerPosition('position').notNull(),
    employmentStatus: employmentStatus('employment_status').notNull(),
    dutyKelurahanId: uuid('duty_kelurahan_id').references(() => regions.id),
    certifications: text('certifications'),
    isTrcKlb: boolean('is_trc_klb').notNull().default(false),
    isTrcPdb: boolean('is_trc_pdb').notNull().default(false),
    isPpe: boolean('is_ppe').notNull().default(false),
    isOps: boolean('is_ops').notNull().default(true),
    postType: postType('post_type'),
    postKelurahanId: uuid('post_kelurahan_id').references(() => regions.id),
    hazardMask: smallint('hazard_mask').notNull().default(0),
    note: text('note'),
    importBatchId: uuid('import_batch_id'),
    createdBy: createdBy(),
    ...timestamps(),
  },
  (t) => [
    unique('officer_records_year_person').on(t.fiscalYearId, t.personId),
    index('officer_records_duty_idx').on(t.fiscalYearId, t.dutyKelurahanId),
    check('officer_records_duty_required', sql`${t.position} = 'lainnya' OR ${t.dutyKelurahanId} IS NOT NULL`),
    check(
      'officer_records_status_matches_position',
      sql`(${t.position} <> 'kasi_trantibumlinmas' OR ${t.employmentStatus} = 'pns')
        AND (${t.position} <> 'babinsa' OR ${t.employmentStatus} = 'tni')
        AND (${t.position} <> 'bhabinkamtibmas' OR ${t.employmentStatus} = 'polri')
        AND (${t.position} <> 'linmas' OR ${t.employmentStatus} = 'satlinmas')
        AND (${t.position} <> 'relawan' OR ${t.employmentStatus} = 'non_aparatur')`,
    ),
    check('officer_records_mask', sql`${t.hazardMask} BETWEEN 0 AND 1023`),
  ],
);
