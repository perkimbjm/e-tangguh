import { Injectable } from '@nestjs/common';
import type { HazardZoneDto } from '@etangguh/shared';
import { and, asc, eq, sql } from 'drizzle-orm';
import { DbService } from '../../../db/db.module';
import { hazardZones, regions } from '../../../db/schema';

export type HazardZoneRow = typeof hazardZones.$inferSelect;

const dtoColumns = {
  id: hazardZones.id,
  kelurahanId: hazardZones.kelurahanId,
  kelurahanName: regions.name,
  rw: hazardZones.rw,
  rt: hazardZones.rt,
  hazardMask: hazardZones.hazardMask,
  basis: hazardZones.basis,
  basisRef: hazardZones.basisRef,
};

/** Kunci peta kawasan: `kelurahan|rw|rt` (rt kosong = seluruh RW). */
export const zoneKey = (kelurahanId: string, rw: string, rt: string | null) => `${kelurahanId}|${rw}|${rt ?? ''}`;

export interface ZoneIndex {
  resolve(kelurahanId: string, rw: string, rt: string | null): HazardZoneRow | null;
}

@Injectable()
export class HazardZonesRepository {
  constructor(private readonly db: DbService) {}

  list(fiscalYearId: string, kelurahanId: string | null): Promise<HazardZoneDto[]> {
    return this.db
      .executor()
      .select(dtoColumns)
      .from(hazardZones)
      .innerJoin(regions, eq(regions.id, hazardZones.kelurahanId))
      .where(and(eq(hazardZones.fiscalYearId, fiscalYearId), kelurahanId ? eq(hazardZones.kelurahanId, kelurahanId) : undefined))
      .orderBy(asc(regions.name), asc(hazardZones.rw), asc(hazardZones.rt));
  }

  async findById(fiscalYearId: string, id: string): Promise<HazardZoneRow | null> {
    const [row] = await this.db
      .executor()
      .select()
      .from(hazardZones)
      .where(and(eq(hazardZones.fiscalYearId, fiscalYearId), eq(hazardZones.id, id)))
      .limit(1);
    return row ?? null;
  }

  async insert(values: typeof hazardZones.$inferInsert): Promise<HazardZoneRow> {
    const [row] = await this.db.executor().insert(hazardZones).values(values).returning();
    return row!;
  }

  async update(id: string, values: Partial<typeof hazardZones.$inferInsert>): Promise<HazardZoneRow> {
    const [row] = await this.db.executor().update(hazardZones).set(values).where(eq(hazardZones.id, id)).returning();
    return row!;
  }

  async delete(id: string): Promise<void> {
    await this.db.executor().delete(hazardZones).where(eq(hazardZones.id, id));
  }

  /** Gabungan jenis bencana seluruh kawasan rawan di satu kelurahan (bawaan jenis bencana petugas). */
  async maskUnion(fiscalYearId: string, kelurahanId: string): Promise<number> {
    const [row] = await this.db
      .executor()
      .select({ m: sql<number>`coalesce(bit_or(${hazardZones.hazardMask}), 0)` })
      .from(hazardZones)
      .where(and(eq(hazardZones.fiscalYearId, fiscalYearId), eq(hazardZones.kelurahanId, kelurahanId)));
    return Number(row?.m ?? 0);
  }

  /** Memuat seluruh kawasan satu tahun sekali; dipakai validasi impor ribuan baris. */
  async index(fiscalYearId: string, kelurahanId?: string | null): Promise<ZoneIndex> {
    const rows = await this.db
      .executor()
      .select()
      .from(hazardZones)
      .where(and(eq(hazardZones.fiscalYearId, fiscalYearId), kelurahanId ? eq(hazardZones.kelurahanId, kelurahanId) : undefined));
    const map = new Map(rows.map((r) => [zoneKey(r.kelurahanId, r.rw, r.rt), r]));
    return {
      resolve: (k, rw, rt) => (rt ? map.get(zoneKey(k, rw, rt)) : undefined) ?? map.get(zoneKey(k, rw, null)) ?? null,
    };
  }
}
