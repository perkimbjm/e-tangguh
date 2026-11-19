import { sql } from 'drizzle-orm';
import { type AnyPgColumn, index, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { id, multiPolygon, timestamps } from './_columns';

export const regionLevel = pgEnum('region_level', ['kecamatan', 'kelurahan']);

export const regions = pgTable(
  'regions',
  {
    id: id(),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    level: regionLevel('level').notNull(),
    parentId: uuid('parent_id').references((): AnyPgColumn => regions.id),
    geom: multiPolygon('geom'),
    ...timestamps(),
  },
  (t) => [
    index('regions_geom_gist').using('gist', t.geom),
    index('regions_name_trgm').using('gin', sql`${t.name} gin_trgm_ops`),
    index('regions_parent_idx').on(t.parentId),
  ],
);
