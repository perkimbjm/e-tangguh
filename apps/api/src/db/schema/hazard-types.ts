import { sql } from 'drizzle-orm';
import { check, pgTable, smallint, text } from 'drizzle-orm/pg-core';
import { id, timestamps } from './_columns';

/** Rujukan jenis bencana (Prinsip VII: data berversi, bukan ditanam di kode). */
export const hazardTypes = pgTable(
  'hazard_types',
  {
    id: id(),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    bit: smallint('bit').notNull().unique(),
    formOrder: smallint('form_order').notNull(),
    regulationRef: text('regulation_ref'),
    ...timestamps(),
  },
  (t) => [check('hazard_types_bit_range', sql`${t.bit} BETWEEN 0 AND 9`)],
);
