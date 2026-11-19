import { customType, timestamp, uuid } from 'drizzle-orm/pg-core';

export const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});

export const citext = customType<{ data: string }>({
  dataType: () => 'citext',
});

/** Geometri PostGIS dengan SRID eksplisit (EPSG:4326). Nilai dibaca/ditulis sebagai WKB heks/EWKT. */
export const multiPolygon = customType<{ data: string }>({
  dataType: () => 'geometry(MultiPolygon,4326)',
});

export const geographyPoint = customType<{ data: string }>({
  dataType: () => 'geography(Point,4326)',
});

export const id = () => uuid('id').primaryKey().defaultRandom();

export const timestamps = () => ({
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const createdBy = () => uuid('created_by');
