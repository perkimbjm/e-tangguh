import { sql } from 'drizzle-orm';
import { type AnyPgColumn, char, check, date, index, pgEnum, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { bytea, createdBy, id, timestamps } from './_columns';

export const gender = pgEnum('gender', ['L', 'P']);

/** Satu catatan per orang (Prinsip III); dipakai warga, petugas, korban, dan relawan. */
export const persons = pgTable(
  'persons',
  {
    id: id(),
    nikEnc: bytea('nik_enc'),
    nikHash: bytea('nik_hash'),
    nikLast4: char('nik_last4', { length: 4 }),
    noNikReason: text('no_nik_reason'),
    fullName: text('full_name').notNull(),
    gender: gender('gender').notNull(),
    birthPlace: text('birth_place'),
    birthDate: date('birth_date'),
    mergedIntoId: uuid('merged_into_id').references((): AnyPgColumn => persons.id),
    createdBy: createdBy(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('persons_nik_hash_unique').on(t.nikHash).where(sql`${t.nikHash} IS NOT NULL`),
    index('persons_full_name_trgm').using('gin', sql`${t.fullName} gin_trgm_ops`),
    index('persons_name_birth_idx').on(t.fullName, t.birthDate),
    check('persons_nik_or_reason', sql`(${t.nikHash} IS NULL) <> (${t.noNikReason} IS NULL)`),
    check('persons_nik_parts', sql`(${t.nikHash} IS NULL) = (${t.nikEnc} IS NULL) AND (${t.nikHash} IS NULL) = (${t.nikLast4} IS NULL)`),
    check('persons_birth_not_future', sql`${t.birthDate} IS NULL OR ${t.birthDate} <= CURRENT_DATE`),
  ],
);
