import { Injectable } from '@nestjs/common';
import { type EventDto, type HazardCode, emergencyStatus } from '@etangguh/shared';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DbService } from '../../../db/db.module';
import { affectedPersons, disasterEvents, eventOfficers, hazardTypes, regions } from '../../../db/schema';

export type EventRow = typeof disasterEvents.$inferSelect;

/** Titik EPSG:4326 sebagai geography; `null` bila koordinat tidak diisi. */
export const pointSql = (lon?: number | null, lat?: number | null) =>
  lon === null || lon === undefined || lat === null || lat === undefined ? null : sql`ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography`;

@Injectable()
export class EventsRepository {
  constructor(private readonly db: DbService) {}

  async list(fiscalYearId: string, id?: string): Promise<EventDto[]> {
    const rows = await this.db
      .executor()
      .select({
        e: disasterEvents,
        hazardCode: hazardTypes.code,
        kelurahanName: regions.name,
        lon: sql<number | null>`ST_X(${disasterEvents.location}::geometry)`,
        lat: sql<number | null>`ST_Y(${disasterEvents.location}::geometry)`,
        affectedCount: sql<number>`(SELECT count(*) FROM ${affectedPersons} WHERE ${affectedPersons.eventId} = ${disasterEvents.id})`,
        officerCount: sql<number>`(SELECT count(*) FROM ${eventOfficers} WHERE ${eventOfficers.eventId} = ${disasterEvents.id})`,
      })
      .from(disasterEvents)
      .innerJoin(hazardTypes, eq(hazardTypes.id, disasterEvents.hazardTypeId))
      .leftJoin(regions, eq(regions.id, disasterEvents.kelurahanId))
      .where(and(eq(disasterEvents.fiscalYearId, fiscalYearId), id ? eq(disasterEvents.id, id) : undefined))
      .orderBy(desc(disasterEvents.occurredAt));
    return rows.map(({ e, ...r }) => ({
      id: e.id,
      name: e.name,
      hazardCode: r.hazardCode as HazardCode,
      occurredAt: e.occurredAt.toISOString(),
      reportedAt: e.reportedAt.toISOString(),
      locationText: e.locationText,
      kelurahanId: e.kelurahanId,
      kelurahanName: r.kelurahanName,
      lon: r.lon === null ? null : Number(r.lon),
      lat: r.lat === null ? null : Number(r.lat),
      emergencyDeclaredAt: e.emergencyDeclaredAt?.toISOString() ?? null,
      emergencyStatus: emergencyStatus(e.reportedAt, e.emergencyDeclaredAt),
      affectedCount: Number(r.affectedCount),
      officerCount: Number(r.officerCount),
    }));
  }

  async find(fiscalYearId: string, id: string): Promise<EventRow | null> {
    const [row] = await this.db.executor().select().from(disasterEvents).where(and(eq(disasterEvents.fiscalYearId, fiscalYearId), eq(disasterEvents.id, id))).limit(1);
    return row ?? null;
  }

  async hazardTypeId(code: string): Promise<string | null> {
    const [row] = await this.db.executor().select({ id: hazardTypes.id }).from(hazardTypes).where(eq(hazardTypes.code, code)).limit(1);
    return row?.id ?? null;
  }

  async insert(values: typeof disasterEvents.$inferInsert): Promise<EventRow> {
    const [row] = await this.db.executor().insert(disasterEvents).values(values).returning();
    return row!;
  }

  async update(id: string, values: Partial<typeof disasterEvents.$inferInsert>): Promise<void> {
    await this.db.executor().update(disasterEvents).set(values).where(eq(disasterEvents.id, id));
  }
}
