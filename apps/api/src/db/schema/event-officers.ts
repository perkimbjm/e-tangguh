import { boolean, pgTable, unique, uuid } from 'drizzle-orm/pg-core';
import { createdBy, id, timestamps } from './_columns';
import { disasterEvents } from './disaster-events';
import { officerRecords, postType } from './officer-records';
import { regions } from './regions';

/** Petugas aktif per kejadian (Form 5.A.11). */
export const eventOfficers = pgTable(
  'event_officers',
  {
    id: id(),
    eventId: uuid('event_id').notNull().references(() => disasterEvents.id, { onDelete: 'cascade' }),
    officerRecordId: uuid('officer_record_id').notNull().references(() => officerRecords.id),
    isTrcKlb: boolean('is_trc_klb').notNull().default(false),
    isTrcPdb: boolean('is_trc_pdb').notNull().default(false),
    isPpe: boolean('is_ppe').notNull().default(false),
    isOps: boolean('is_ops').notNull().default(true),
    postType: postType('post_type'),
    postKecamatanId: uuid('post_kecamatan_id').references(() => regions.id),
    postKelurahanId: uuid('post_kelurahan_id').references(() => regions.id),
    createdBy: createdBy(),
    ...timestamps(),
  },
  (t) => [unique('event_officers_event_officer').on(t.eventId, t.officerRecordId)],
);
