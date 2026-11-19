import { sql } from 'drizzle-orm';
import { check, index, pgEnum, pgTable, smallint, text, unique, uuid } from 'drizzle-orm/pg-core';
import { createdBy, id, multiPolygon, timestamps } from './_columns';
import { fiscalYears } from './fiscal-years';
import { regions } from './regions';

export const hazardZoneBasis = pgEnum('hazard_zone_basis', ['krb', 'keputusan_bpbd']);

/** Kawasan rawan per RT/RW (`rt` null = seluruh RW) pada satu tahun anggaran. */
export const hazardZones = pgTable(
  'hazard_zones',
  {
    id: id(),
    fiscalYearId: uuid('fiscal_year_id').notNull().references(() => fiscalYears.id),
    kelurahanId: uuid('kelurahan_id').notNull().references(() => regions.id),
    rw: text('rw').notNull(),
    rt: text('rt'),
    hazardMask: smallint('hazard_mask').notNull(),
    basis: hazardZoneBasis('basis').notNull(),
    basisRef: text('basis_ref').notNull(),
    geom: multiPolygon('geom'),
    createdBy: createdBy(),
    ...timestamps(),
  },
  (t) => [
    // NULLS NOT DISTINCT: satu baris "seluruh RW" per RW.
    unique('hazard_zones_unique').on(t.fiscalYearId, t.kelurahanId, t.rw, t.rt).nullsNotDistinct(),
    index('hazard_zones_geom_gist').using('gist', t.geom),
    check('hazard_zones_mask', sql`${t.hazardMask} BETWEEN 1 AND 1023`),
  ],
);
